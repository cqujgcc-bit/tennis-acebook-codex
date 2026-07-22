const api = require('../../utils/api.js');

// iOS 兼容的日期解析：new Date('2026/06/28 20:30') 在 iOS 上会返回 Invalid Date，
// 必须逐字段拆解后用 new Date(y, mo-1, d, h, mi) 构造，全平台一致。
// dateStr 形如 '2026-06-28'，timeStr 形如 '20:30'（可空，默认 '00:00'）。
function parseDateTime(dateStr, timeStr) {
  try {
    var ds = String(dateStr || '');
    var dm = ds.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (!dm) return new Date(NaN);
    var ts = String(timeStr || '00:00');
    var tm = ts.match(/(\d{1,2}):(\d{1,2})/);
    var hh = tm ? parseInt(tm[1], 10) : 0;
    var mi = tm ? parseInt(tm[2], 10) : 0;
    return new Date(parseInt(dm[1], 10), parseInt(dm[2], 10) - 1, parseInt(dm[3], 10), hh, mi, 0);
  } catch (e) {
    return new Date(NaN);
  }
}

Page({
  data: {
    game: null,
    emptySlots: [],
    joining: false,
    paying: false,
    confirming: false,
    cancelling: false,
    approving: false,
    loading: true,
    myWaitlist: { onWaitlist: false, position: 0, total: 0 },
    waiting: false,
    leaving: false,
    replaceShareReady: false,
  },
  replaceToken: '',

  onLoad(options) {
    this.matchId = options.id;
    // 开启转发与朋友圈分享
    if (wx.showShareMenu) {
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    }
    this.loadDetail();
  },

  // 生成分享文案
  buildShareTitle() {
    var g = this.data.game;
    if (!g) return 'AceBook 球局邀请 · 一起打球吧！';
    var parts = [];
    if (g.date) parts.push(g.date + (g.week ? ' ' + g.week : ''));
    if (g.startTime) parts.push(g.startTime);
    if (g.courtName) parts.push(g.courtName);
    var lvl = (g.levelRange && g.levelRange !== '不限') ? ' · 水平' + g.levelRange : '';
    var head = parts.join(' ');
    return '【约球】' + head + lvl + '，差你一个，点入一键报名！';
  },

  // 转发给好友 / 群
  onShareAppMessage(e) {
    var g = this.data.game;
    var id = (g && g.id) || this.matchId;
    // 接位分享：携带 token，转发为「接位邀请」卡片，对方点开进入 replace 接位页
    if (this.data.replaceShareReady && this.replaceToken) {
      var court = (g && g.courtName) ? g.courtName : '';
      var when = g ? ((g.date || '') + (g.week ? ' ' + g.week : '') + ' ' + (g.startTime || '')) : '';
      return {
        title: '球友邀你顶上空位：' + when + ' ' + court + '，点我接位',
        path: '/pages/replace/replace?token=' + this.replaceToken,
      };
    }
    return {
      title: this.buildShareTitle(),
      path: '/pages/game-detail/game-detail?id=' + id,
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    var id = (this.data.game && this.data.game.id) || this.matchId;
    return {
      title: this.buildShareTitle(),
      query: 'id=' + id,
    };
  },

  loadDetail() {
    var that = this;
    this.setData({ loading: true });
    api.match
      .getById(this.matchId)
      .then(function (res) {
        var m = res.match || {};
        var participants = res.participants || [];
        var author = res.author || {};
        var waitlist = res.waitlist || [];
        var waitlistCount = res.waitlistCount || waitlist.length || 0;
        // 费用：优先用 feeRequired/feePerPerson（线上预付场地费），兼容 costPerPerson 展示
        var feeRequired = !!m.feeRequired && Number(m.feePerPerson || 0) > 0;
        var feePerPerson = parseFloat(m.feePerPerson || 0);
        var cost = parseFloat(m.costPerPerson || 0);
        // 展示用费用：收费局用 feePerPerson，否则回退 costPerPerson
        var displayCost = feeRequired ? feePerPerson : cost;
        // 星期
        var week = '';
        try {
          var d = parseDateTime(m.matchDate, '00:00');
          var wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          week = wk[d.getDay()] || '';
        } catch (e) {}
        var levelRange = '不限';
        if (m.ntrpMin && m.ntrpMax) levelRange = m.ntrpMin + '-' + m.ntrpMax;
        else if (m.ntrpMin) levelRange = m.ntrpMin + '+';
        var players = participants.map(function (p) {
          var u = p.user || {};
          return {
            name: u.name || '球友',
            level: u.ntrpLevel || '',
            avatar: u.avatar || '',
            isHost: false,
          };
        });
        // 发起人若不在报名列表中，插到首位并标记
        var hasAuthor = false;
        for (var ai = 0; ai < participants.length; ai++) {
          var au = participants[ai].user || {};
          if (au.id && author.id && au.id === author.id) { players[ai].isHost = true; hasAuthor = true; break; }
        }
        if (author && author.id && !hasAuthor) {
          players.unshift({
            name: author.name || '组织者',
            level: author.ntrpLevel || '',
            avatar: author.avatar || '',
            isHost: true,
          });
        }
        // 后端 getById 已将发起人从 participants 中排除，发起人由上方 unshift 补到首位；
        // 以 players.length 为准（含发起人），与后端纠正后的 currentParticipants 一致。
        var current = players.length;
        var max = m.maxParticipants || current;
        // 当前用户身份与支付状态
        var myInfo = wx.getStorageSync('userInfo') || {};
        var myId = myInfo.id;
        var isMember = false;
        var isAuthor = false;
        var myPaymentStatus = '';
        // 后端返回的当前用户报名状态（含 pending 待支付占位，不在 participants 列表里）
        var myPart = res.myParticipation || null;
        var myStatus = myPart ? (myPart.status || '') : '';
        if (myId) {
          if (author.id === myId) { isMember = true; isAuthor = true; }
          else {
            for (var pi = 0; pi < participants.length; pi++) {
              var pu = participants[pi].user || {};
              if (pu.id === myId && participants[pi].status === 'confirmed') {
                isMember = true;
                myPaymentStatus = participants[pi].paymentStatus || '';
                break;
              }
            }
            // 未在 confirmed 列表但有 pending 待支付占位
            if (!isMember && myStatus === 'pending') {
              myPaymentStatus = myPart.paymentStatus || 'pending';
            }
          }
        }
        // 是否处于待支付占位（尚未成为正式成员，需继续支付）
        var pendingPay = !isAuthor && feeRequired && myStatus === 'pending';
        // 是否已报名并已支付（收费局正式成员）
        var needPay = pendingPay; // 兼容原字段：needPay 表示需要继续支付
        var paid = isMember && !isAuthor && feeRequired && myPaymentStatus === 'paid';
        // 是否可确认完成：发起人 + 未完成/未取消 + 开球（结束时间优先，无则用开始时间）已过
        var ended = false;
        try {
          var endHM = (m.endTime || m.startTime || '00:00');
          var endDt = parseDateTime(m.matchDate, endHM);
          ended = !isNaN(endDt.getTime()) && (Date.now() >= endDt.getTime());
        } catch (e2) {}
        // 是否已开球（开球开始时间已过）：开球即截止报名，过期局一律禁止报名/候补/支付
        var isStarted = false;
        try {
          var startDt = parseDateTime(m.matchDate, m.startTime || '00:00');
          isStarted = !isNaN(startDt.getTime()) && (Date.now() >= startDt.getTime());
        } catch (e3) {}
        var canConfirmComplete = isAuthor && ended && m.status !== 'completed' && m.status !== 'cancelled';
        // 是否可取消球局：发起人 + 未完成/未取消（取消会给已支付者自动退款）
        var canCancel = isAuthor && m.status !== 'completed' && m.status !== 'cancelled';
        // 是否已结算/已完成（用于发起人展示）
        var isCompleted = (m.status === 'completed');
        // 是否已取消（发起人取消球局后，进入页面只读展示，屏蔽所有操作）
        var isCancelled = (m.status === 'cancelled');
        // 候补名单展示
        var waiters = waitlist.map(function (p) {
          var wu = p.user || {};
          return { id: wu.id || p.userId || 0, name: wu.name || '球友', level: wu.ntrpLevel || '', avatar: wu.avatar || '' };
        });
        // 经纬度（一键导航）
        var lat = parseFloat(m.latitude || 0);
        var lng = parseFloat(m.longitude || 0);
        var hasGeo = !!(lat && lng);
        var emptyCount = Math.max(0, max - current);
        var emptySlots = [];
        for (var i = 0; i < emptyCount; i++) emptySlots.push(i);
        var game = {
          id: m.id,
          title: m.title,
          isPrivate: !!m.circleOnly,
          circleName: '圈子',
          status: m.status,
          date: (m.matchDate || '').slice(5),
          week: week,
          startTime: m.startTime,
          endTime: m.endTime || '',
          courtName: m.venueName,
          district: m.venueAddress || '',
          levelRange: levelRange,
          costPerPlayer: displayCost,
          feeRequired: feeRequired,
          feePerPerson: feePerPerson,
          currentPlayers: current,
          maxPlayers: max,
          players: players,
          organizerName: author.name || '球友',
          description: m.description || '',
          contactInfo: m.contactInfo || '',
          isMember: isMember,
          isAuthor: isAuthor,
          paymentStatus: myPaymentStatus,
          needPay: needPay,
          pendingPay: pendingPay,
          paid: paid,
          ended: ended,
          isStarted: isStarted,
          canConfirmComplete: canConfirmComplete,
          canCancel: canCancel,
          isCompleted: isCompleted,
          isCancelled: isCancelled,
          waiters: waiters,
          waitlistCount: waitlistCount,
          myTopupPending: (myPart && myPart.paymentStatus === 'topup_pending' && Number(myPart.topupAmount || 0) > 0),
          myTopupAmount: (myPart && myPart.topupAmount ? Number(myPart.topupAmount).toFixed(2) : '0.00'),
          isFull: (current >= max),
          lat: lat,
          lng: lng,
          hasGeo: hasGeo,
        };
        that.setData({ game: game, emptySlots: emptySlots, loading: false });
        // 未报名且满员时，查询我的候补状态
        if (!isMember && (current >= max) && m.status !== 'completed' && m.status !== 'cancelled') {
          api.match.myWaitlistPosition(m.id).then(function (w) {
            that.setData({ myWaitlist: w || { onWaitlist: false, position: 0, total: 0 } });
          }).catch(function () {});
        } else {
          that.setData({ myWaitlist: { onWaitlist: false, position: 0, total: 0 } });
        }
      })
      .catch(function (err) {
        that.setData({ loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  // 发起人：编辑球局
  onEditMatch() {
    if (!this.data.game) return;
    wx.navigateTo({ url: '/pages/match-edit/match-edit?id=' + this.data.game.id });
  },

  // 参与者：去补缴
  onGoTopup() {
    if (!this.data.game) return;
    var g = this.data.game;
    wx.navigateTo({ url: '/pages/topup-pay/topup-pay?id=' + g.id + '&amount=' + g.myTopupAmount + '&title=' + encodeURIComponent(g.title || '') });
  },

  // 发起人确认球局完成。收费局跳「到场结算」页按实重算多退少补；免费局直接确认完成
  onConfirmComplete() {
    if (!this.data.game) return;
    if (this.data.confirming) return;
    var that = this;
    var matchId = this.data.game.id;
    // 收费局：跳转结算确认页（勾选到场名单）
    if (this.data.game.feeRequired) {
      wx.navigateTo({ url: '/pages/match-settle/match-settle?id=' + matchId });
      return;
    }
    // 点击即确认结算（不做二次确认弹框，避免 wx.showModal 在部分真机不弹导致无法确认）
    that.setData({ confirming: true });
    wx.showLoading({ title: '结算中...', mask: true });
    api.match
      .confirmComplete(matchId)
      .then(function (r) {
        wx.hideLoading();
        that.setData({ confirming: false });
        wx.showToast({ title: (r && r.message) || '球局已完成', icon: 'success', duration: 3000 });
          if (r && !r.settled) { that.setData({ warningMsg: r.message }); }
        that.loadDetail();
      })
      .catch(function (err) {
        wx.hideLoading();
        that.setData({ confirming: false });
        wx.showToast({ title: (err && err.message) || '确认失败', icon: 'none' });
      });
  },

  // 发起人取消球局 → 已支付报名者自动微信退款 + 站内通知
  onCancelMatch() {
    if (!this.data.game) return;
    if (this.data.cancelling) return;
    var that = this;
    var matchId = this.data.game.id;
    var feeRequired = this.data.game.feeRequired;
    var others = Math.max(0, (this.data.game.currentPlayers || 1) - 1);
    var tip = '取消后该球局将关闭，无法恢复。';
    if (feeRequired && others > 0) {
      tip += '已报名并支付的 ' + others + ' 位球友将自动原路退款。';
    }
    tip += '\n注意：开球前不到2小时取消会扣除信用分。确定取消吗？';
    wx.showModal({
      title: '取消球局',
      content: tip,
      confirmText: '确认取消',
      confirmColor: '#C0392B',
      cancelText: '再想想',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ cancelling: true });
        wx.showLoading({ title: '取消中...', mask: true });
        api.match
          .cancel(matchId)
          .then(function (r) {
            wx.hideLoading();
            that.setData({ cancelling: false });
            wx.showModal({
              title: '球局已取消',
              content: (r && r.message) || '球局已取消，已支付的报名者将自动退款。',
              showCancel: false,
              confirmText: '知道了',
              success: function () { that.loadDetail(); },
            });
          })
          .catch(function (err) {
            wx.hideLoading();
            that.setData({ cancelling: false });
            wx.showToast({ title: (err && err.message) || '取消失败', icon: 'none' });
          });
      },
    });
  },

  // 发起人同意候补者加入
  onApproveWaitlist(e) {
    if (!this.data.game) return;
    if (this.data.approving) return;
    var that = this;
    var matchId = this.data.game.id;
    var uid = e.currentTarget.dataset.uid;
    var uname = e.currentTarget.dataset.name || '该球友';
    if (!uid) { wx.showToast({ title: '用户信息缺失', icon: 'none' }); return; }
    var feeRequired = this.data.game.feeRequired;
    var content = '同意后球局名额 +1。';
    if (feeRequired) {
      content += '人均费用会按新人数重新计算，已支付的球友将自动退回差价；' + uname + ' 需完成支付后才正式占位。';
    } else {
      content += uname + ' 将直接报名成功。';
    }
    content += '\n确定同意吗？';
    wx.showModal({
      title: '同意 ' + uname + ' 加入',
      content: content,
      confirmText: '确定同意',
      confirmColor: '#0B3D2E',
      cancelText: '再想想',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ approving: true });
        wx.showLoading({ title: '处理中...', mask: true });
        api.match
          .approveWaitlist(matchId, uid)
          .then(function (r) {
            wx.hideLoading();
            that.setData({ approving: false });
            var msg;
            if (r && r.isFeeMatch) {
              msg = '已同意，名额已 +1。人均降为 ¥' + (r.newFeePerPerson != null ? Number(r.newFeePerPerson).toFixed(2) : '') + '，已为 ' + (r.refunded || 0) + ' 位已付款球友退回差价。' + uname + ' 完成支付后即正式加入。';
            } else {
              msg = '已同意 ' + uname + ' 加入，名额已 +1。';
            }
            wx.showModal({ title: '操作成功', content: msg, showCancel: false, confirmText: '知道了', success: function () { that.loadDetail(); } });
          })
          .catch(function (err) {
            wx.hideLoading();
            that.setData({ approving: false });
            wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
          });
      },
    });
  },

  // 跳转我的钱包
  onOpenWallet() {
    wx.navigateTo({ url: '/pages/wallet/wallet' });
  },

  onEnterChat() {
    if (!this.data.game) return;
    wx.navigateTo({
      url: '/pages/chat/chat?matchId=' + this.data.game.id + '&title=' + encodeURIComponent(this.data.game.title || '球局群聊'),
    });
  },

  // 报名（免费局直接加入；收费局加入后自动发起支付）
  onJoin() {
    console.log('[onJoin] tapped', this.data.game);
    if (!this.data.game) { wx.showToast({ title: '球局信息未加载，请稍候', icon: 'none' }); return; }
    var token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    var game = this.data.game;
    if (game.status === 'completed' || game.status === 'cancelled') {
      wx.showToast({ title: '该球局已结束', icon: 'none' });
      return;
    }
    if (game.isStarted) {
      wx.showToast({ title: '该球局已开始，无法报名', icon: 'none' });
      return;
    }
    var isFull = game.currentPlayers >= game.maxPlayers;
    if (isFull || game.status === 'full') {
      wx.showToast({ title: '球局已满员', icon: 'none' });
      return;
    }
    if (this.data.joining) return;

    var that = this;
    var feeRequired = game.feeRequired;
    var content = feeRequired
      ? '本局需预付场地费 ¥' + game.feePerPerson + '/人。\n支付成功后才算报名成功并占位；费用由平台代收托管，球局正常结束后结算给发起人，如按规则取消可退款。'
      : '本局免费，确认加入？';
    wx.showModal({
      title: feeRequired ? '预付场地费' : '确认加入',
      content: content,
      confirmText: feeRequired ? '去支付' : '确认加入',
      confirmColor: '#0B3D2E',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ joining: true });
        wx.showLoading({ title: feeRequired ? '准备支付...' : '提交报名...', mask: true });
        api.match
          .join(game.id)
          .then(function () {
            wx.hideLoading();
            that.setData({ joining: false });
            if (feeRequired) {
              // 收费局：后端仅创建待支付占位，立即拉起支付；支付成功后才算报名成功
              that.startPay();
            } else {
              wx.showToast({ title: '报名成功', icon: 'success' });
              that.loadDetail();
            }
          })
          .catch(function (err) {
            wx.hideLoading();
            that.setData({ joining: false });
            var em = (err && err.message) || '';
            if (em.indexOf('TOPUP_PENDING') >= 0) {
              wx.showModal({
                title: '存在待补缴费用',
                content: '您有球局按实际到场人数重算后产生的待补缴费用尚未结清，需先在「钱包」中缴清后才能报名新球局。',
                confirmText: '去钱包补缴',
                confirmColor: '#0B3D2E',
                success: function (r) { if (r.confirm) wx.navigateTo({ url: '/pages/wallet/wallet' }); }
              });
              return;
            }
            if (em.indexOf('CREDIT_ZERO') >= 0) {
              wx.showToast({ title: '信用分不足，暂时无法报名', icon: 'none' });
              return;
            }
            wx.showToast({ title: em || '报名失败', icon: 'none' });
          });
      },
    });
  },

  // 继续支付（已报名待支付时点击）
  onPay() {
    var token = wx.getStorageSync('token');
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    if (this.data.game && this.data.game.isStarted) {
      wx.showToast({ title: '该球局已开始，无法支付', icon: 'none' });
      return;
    }
    this.startPay();
  },

  // 发起微信支付：创建订单 → 拉起收银台 → 确认 → 刷新
  startPay() {
    if (!this.data.game) return;
    if (this.data.paying) return;
    var that = this;
    var matchId = this.data.game.id;
    this.setData({ paying: true });
    wx.showLoading({ title: '发起支付...', mask: true });
    api.match
      .createPayOrder(matchId)
      .then(function (order) {
        wx.hideLoading();
        // Mock 模式：后端未配置真实商户号，直接确认支付成功（便于体验）
        if (order && order.isMockMode) {
          wx.showLoading({ title: '确认支付...', mask: true });
          return api.match.confirmPayment(order.orderId, matchId).then(function () {
            wx.hideLoading();
            that.setData({ paying: false });
            wx.showToast({ title: '支付成功', icon: 'success' });
            that.loadDetail();
          });
        }
        // 真实微信支付：拉起收银台
        // 注意：后端返回字段名为 packageStr（值形如 prepay_id=xxx），需兼容 package
        var payPackage = order.package || order.packageStr;
        that.setData({ paying: false });
        wx.requestPayment({
          timeStamp: String(order.timeStamp),
          nonceStr: order.nonceStr,
          package: payPackage,
          signType: order.signType || 'RSA',
          paySign: order.paySign,
          success: function () {
            wx.showToast({ title: '支付成功', icon: 'success' });
            // 真实支付由微信回调后端标记 paid，这里延迟刷新拿最新状态
            setTimeout(function () { that.loadDetail(); }, 1500);
          },
          fail: function (e) {
            var msg = (e && e.errMsg) ? e.errMsg : '';
            if (msg.indexOf('cancel') >= 0) {
              wx.showToast({ title: '支付已取消，可稍后在此页继续支付', icon: 'none' });
            } else {
              wx.showToast({ title: '支付失败：' + (msg || '请重试'), icon: 'none' });
            }
            that.loadDetail();
          },
        });
      })
      .catch(function (err) {
        wx.hideLoading();
        that.setData({ paying: false });
        wx.showToast({ title: (err && err.message) || '发起支付失败', icon: 'none' });
        that.loadDetail();
      });
  },

  // 一键导航到场地
  onNavigate() {
    var g = this.data.game;
    if (!g) return;
    if (!g.hasGeo) {
      wx.showToast({ title: '该球局未设置地图位置', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude: g.lat,
      longitude: g.lng,
      name: g.courtName || '球局场地',
      address: g.district || '',
      scale: 16,
    });
  },

  // 加入候补名单（满员时）
  onJoinWaitlist() {
    var token = wx.getStorageSync('token');
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    if (!this.data.game || this.data.waiting) return;
    if (this.data.game.isStarted) {
      wx.showToast({ title: '该球局已开始，无法加入候补', icon: 'none' });
      return;
    }
    var that = this;
    var game = this.data.game;
    var feeRequired = game.feeRequired;
    var content = feeRequired
      ? '球局已满，加入候补后按顺序排队。一旦有人退出，系统会自动通知您接位。候补期间不需付费，接位后再支付场地费。'
      : '球局已满，加入候补后按顺序排队。一旦有人退出，系统会自动通知您接位。';
    wx.showModal({
      title: '加入候补名单',
      content: content,
      confirmText: '加入候补',
      confirmColor: '#0B3D2E',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ waiting: true });
        wx.showLoading({ title: '加入中...', mask: true });
        api.match.joinWaitlist(game.id).then(function (r) {
          wx.hideLoading();
          that.setData({ waiting: false });
          wx.showToast({ title: '已加入候补·第' + ((r && r.position) || '') + '位', icon: 'none' });
          that.loadDetail();
        }).catch(function (err) {
          wx.hideLoading();
          that.setData({ waiting: false });
          wx.showToast({ title: (err && err.message) || '加入失败', icon: 'none' });
        });
      },
    });
  },

  // 退出候补名单
  onLeaveWaitlist() {
    if (!this.data.game || this.data.waiting) return;
    var that = this;
    var matchId = this.data.game.id;
    wx.showModal({
      title: '退出候补',
      content: '确认退出该球局的候补名单？',
      confirmColor: '#0B3D2E',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ waiting: true });
        api.match.leaveWaitlist(matchId).then(function () {
          that.setData({ waiting: false });
          wx.showToast({ title: '已退出候补', icon: 'none' });
          that.loadDetail();
        }).catch(function (err) {
          that.setData({ waiting: false });
          wx.showToast({ title: (err && err.message) || '退出失败', icon: 'none' });
        });
      },
    });
  },

  // 退出 / 转让：参与者点击后二选一
  onLeaveOrReplace() {
    if (!this.data.game) return;
    var that = this;
    var isAuthor = this.data.game.isAuthor;
    wx.showActionSheet({
      itemList: ['🔄 找人替我（推荐·零损失）', isAuthor ? '转让球局并退出' : '直接退出球局'],
      success: function (r) {
        if (r.tapIndex === 0) {
          that.onCreateReplaceInvite();
        } else if (r.tapIndex === 1) {
          that.doLeave();
        }
      },
    });
  },

  // 生成“找替补”接位链接，进入分享就绪态（由底部 open-type=share 按钮直接拉起转发）
  onCreateReplaceInvite() {
    if (!this.data.game) return;
    var that = this;
    var matchId = this.data.game.id;
    wx.showLoading({ title: '生成接位链接...', mask: true });
    api.match.createReplaceInvite(matchId).then(function (r) {
      wx.hideLoading();
      var token = (r && (r.token || r.inviteToken)) || '';
      if (!token) {
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        return;
      }
      that.replaceToken = token;
      // 进入接位分享就绪态：底部出现「发送接位邀请」分享按钮，点击直接弹出微信转发窗口
      that.setData({ replaceShareReady: true });
      wx.showModal({
        title: '接位链接已生成',
        content: '请点页面底部「发送接位邀请·转发给球友」按钮，选择球友或群转发。对方接位并支付成功后，您将获得全额退款且不扣信用分。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#0B3D2E',
      });
    }).catch(function (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '生成失败', icon: 'none' });
    });
  },

  // 退出接位分享就绪态（取消找替补）
  onCancelReplaceShare() {
    this.replaceToken = '';
    this.setData({ replaceShareReady: false });
  },

  // 直接退出球局
  doLeave() {
    if (!this.data.game || this.data.leaving) return;
    var that = this;
    var matchId = this.data.game.id;
    var feeRequired = this.data.game.feeRequired;
    var tip = feeRequired
      ? '退出规则：开球前 2 小时以上全额退；1–2 小时退 50%；1 小时内不退。若球局未满或有候补补上，不扣信用分。确认退出？'
      : '确认退出该球局？若球局未满或有候补补上，不扣信用分。';
    wx.showModal({
      title: '退出球局',
      content: tip,
      confirmText: '确认退出',
      confirmColor: '#C0392B',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ leaving: true });
        wx.showLoading({ title: '退出中...', mask: true });
        api.match.leave(matchId).then(function (r) {
          wx.hideLoading();
          that.setData({ leaving: false });
          var msg = '已退出';
          if (r && r.promoted) msg = '已退出，候补已自动补位';
          else if (r && r.penalized) msg = '已退出（临近开球退出，已扣信用分）';
          wx.showToast({ title: msg, icon: 'none' });
          that.loadDetail();
        }).catch(function (err) {
          wx.hideLoading();
          that.setData({ leaving: false });
          wx.showToast({ title: (err && err.message) || '退出失败', icon: 'none' });
        });
      },
    });
  },
});
