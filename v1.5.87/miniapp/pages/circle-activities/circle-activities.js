// 圈内活动列表页：报名占位（无定金）/ 发起人结算入口 / 成员待付账单
const api = require('../../utils/api.js');

Page({
  data: {
    circleId: 0,
    circleName: '',
    isOwner: false,
    myUserId: 0,
    activities: [],
    historyShow: false,
    historyActivities: [],
    loading: true,
  },

  onLoad: function (options) {
    var circleId = Number(options.circleId || 0);
    var circleName = options.circleName ? decodeURIComponent(options.circleName) : '圈子活动';
    var app = getApp();
    var myUserId = (app && app.globalData && app.globalData.userInfo && app.globalData.userInfo.id) || 0;
    this.setData({
      circleId: circleId,
      circleName: circleName,
      isOwner: options.isOwner === '1' || options.isOwner === 'true',
      myUserId: myUserId,
    });
    wx.setNavigationBarTitle({ title: circleName });
  },

  onShow: function () {
    if (this.data.circleId) {
      this.loadActivities();
    }
  },

  onPullDownRefresh: function () {
    this.loadActivities(function () {
      wx.stopPullDownRefresh();
    });
  },

  // 加工 signupAvatars 为报名墙展示数据：限制显示4个 + 标记发起人/自己
  prepareSignupWall: function (a, myUserId) {
    var avatars = (a.signupAvatars || []).slice(0, 4);
    var hiddenCount = (a.signupAvatars || []).length - avatars.length;
    var wall = avatars.map(function (u) {
      var isCreator = u.userId && u.userId === a.creatorId;
      var isMe = u.userId && u.userId === myUserId;
      return {
        userId: u.userId,
        name: u.name || '球友',
        avatar: u.avatar || '',
        isCreator: isCreator,
        isMe: isMe,
        label: isMe ? '我' : (isCreator ? '👑' : ''),
      };
    });
    return { wall: wall, hiddenCount: hiddenCount };
  },

  loadActivities: function (cb) {
    var that = this;
    this.setData({ loading: true });
    api.circle.getActivities(this.data.circleId).then(function (list) {
      var now = Date.now();
      var active = [];
      var history = [];
      (list || []).forEach(function (a) {
        var dateStr = a.activityDate || '';
        var timeStr = (a.startTime || '') + (a.endTime ? ('-' + a.endTime) : '');
        var startTs = 0;
        if (dateStr) {
          var t = (dateStr + ' ' + (a.startTime || '00:00')).replace(/-/g, '/');
          startTs = new Date(t).getTime() || 0;
        }
        var isAA = a.feeMode === 'aa';
        var isPast = startTs > 0 && startTs <= now;
        var isCreator = a.creatorId === that.data.myUserId;
        var isCancelled = a.status === "cancelled";
        // 报名墙
        var wallInfo = that.prepareSignupWall(a, that.data.myUserId);
        var item = Object.assign({}, a, {
          isCancelled: isCancelled,
          dateStr: dateStr,
          timeStr: timeStr,
          isAA: isAA,
          feeLabel: isAA ? 'AA结算' : '免费',
          settleLabel: a.settleStatus === 'settled' ? '已结算' : (a.settleStatus === 'settling' ? '待支付' : ''),
          isCreator: isCreator,
          isPast: isPast,
          totalCostYuan: a.totalCost ? (a.totalCost / 100).toFixed(2) : '',
          signupWall: wallInfo.wall,
          signupHidden: wallInfo.hiddenCount,
        });
        // 已取消 → 历史；已结束且已结算 → 历史；其余 → 进行中/待开始
        if (isCancelled) {
          history.push(item);
        } else if (isPast && (a.settleStatus === 'settled' || a.settleStatus === 'settling')) {
          history.push(item);
        } else {
          active.push(item);
        }
      });
      // 排序：进行中按时间升序（即将到来优先），历史按时间降序（最近优先）
      active.sort(function (a, b) {
        var aTs = a.activityDate + ' ' + (a.startTime || '');
        var bTs = b.activityDate + ' ' + (b.startTime || '');
        return aTs.localeCompare(bTs);
      });
      history.sort(function (a, b) {
        var aTs = a.activityDate + ' ' + (a.startTime || '');
        var bTs = b.activityDate + ' ' + (b.startTime || '');
        return bTs.localeCompare(aTs);
      });
      that.setData({ activities: active, historyActivities: history, loading: false });
      if (typeof cb === 'function') cb();
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      if (typeof cb === 'function') cb();
    });
  },

  // 报名 / 取消报名（无定金，仅占名额）
  onToggleSignup: function (e) {
    var that = this;
    var activityId = Number(e.currentTarget.dataset.id);
    var isSigned = e.currentTarget.dataset.signed;
    if (isSigned) {
      wx.showModal({
        title: '取消报名',
        content: '确定取消报名该活动吗？',
        success: function (res) {
          if (res.confirm) that.doSignup(activityId);
        }
      });
    } else {
      this.doSignup(activityId);
    }
  },

  doSignup: function (activityId) {
    var that = this;
    wx.showLoading({ title: '处理中', mask: true });
    api.circle.signupActivity(activityId).then(function (res) {
      wx.hideLoading();
      wx.showToast({ title: res && res.signed === false ? '已取消报名' : '报名成功', icon: 'success' });
      that.loadActivities();
    }).catch(function (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
    });
  },

  // 发起人：进入结算页
  onSettle: function (e) {
    var activityId = Number(e.currentTarget.dataset.id);
    wx.navigateTo({ url: '/pages/activity-settle/activity-settle?activityId=' + activityId + '&mode=settle' });
  },

  // 成员/发起人：查看账单与支付
  onViewBill: function (e) {
    var activityId = Number(e.currentTarget.dataset.id);
    wx.navigateTo({ url: '/pages/activity-settle/activity-settle?activityId=' + activityId + '&mode=bill' });
  },

  // ── 取消活动（仅发起人，未结算的活动）──
  onCancelActivity: function (e) {
    var that = this;
    var activityId = Number(e.currentTarget.dataset.id);
    wx.showModal({
      title: '取消活动',
      content: '确定取消该活动吗？已报名成员将被清空。',
      success: function (res) {
        if (!res.confirm) return;
        wx.showLoading({ title: '取消中', mask: true });
        api.circle.cancelActivity(activityId).then(function () {
          wx.hideLoading();
          wx.showToast({ title: '已取消', icon: 'success' });
          that.loadActivities();
        }).catch(function (err) {
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || '取消失败', icon: 'none' });
        });
      }
    });
  },

  // ── 切换历史活动展示 ──
  toggleHistory: function () {
    this.setData({ historyShow: !this.data.historyShow });
  },

  // 发起活动
  onCreate: function () {
    wx.navigateTo({
      url: '/pages/activity-create/activity-create?circleId=' + this.data.circleId +
        '&circleName=' + encodeURIComponent(this.data.circleName)
    });
  },
});
