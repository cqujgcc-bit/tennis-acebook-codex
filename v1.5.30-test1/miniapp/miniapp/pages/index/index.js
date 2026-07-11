const api = require('../../utils/api.js');

// ===== 倒计时计算（与约球页一致）=====
function computeCountdown(m, now) {
  var dateStr = (m.matchDate || '').slice(0, 10);
  if (!dateStr || !m.startTime) {
    return { cdText: '', cdClass: '', ended: false };
  }
  try {
    var start = new Date((dateStr + ' ' + m.startTime).replace(/-/g, '/'));
    var end = null;
    if (m.endTime) end = new Date((dateStr + ' ' + m.endTime).replace(/-/g, '/'));
    var diff = start.getTime() - now.getTime();
    if (end && now.getTime() > end.getTime()) {
      return { cdText: '已结束', cdClass: 'cd-ended', ended: true };
    }
    if (diff <= 0) {
      var stillOn = end ? now.getTime() <= end.getTime() : (now.getTime() - start.getTime() <= 2 * 3600 * 1000);
      if (stillOn) return { cdText: '🟢 进行中', cdClass: 'cd-live', ended: false };
      return { cdText: '已结束', cdClass: 'cd-ended', ended: true };
    }
    var mins = Math.floor(diff / 60000);
    var hours = Math.floor(mins / 60);
    var days = Math.floor(hours / 24);
    if (days >= 1) {
      return { cdText: '⏳ 还有 ' + days + ' 天', cdClass: 'cd-normal', ended: false };
    }
    if (hours >= 1) {
      var remMin = mins - hours * 60;
      return { cdText: '⏳ ' + hours + '小时' + (remMin > 0 ? remMin + '分' : '') + '后', cdClass: 'cd-soon', ended: false };
    }
    return { cdText: '🔥 即将开始 ' + mins + '分', cdClass: 'cd-urgent', ended: false };
  } catch (e) {
    return { cdText: '', cdClass: '', ended: false };
  }
}

// 判断球局是否"征集中且未过期"
function isRecruiting(m) {
  var status = (m.status || '').toLowerCase();
  if (status && status !== 'open' && status !== 'recruiting') return false;
  var cd = computeCountdown(m, new Date());
  if (cd.ended) return false;
  return true;
}

// 后端字段 → 卡片字段（与约球页一致）
function decorate(list, now) {
  now = now || new Date();
  return (list || []).map(function (m) {
    var organizerName = m.organizerName || '球友';
    var initial = organizerName.charAt(0);
    var cost = parseFloat(m.costPerPerson || m.feePerPerson || 0);
    var priceText = cost > 0 ? ('💰 ¥' + cost + '/人') : '🆓 免费';
    var week = '';
    try {
      var d = new Date((m.matchDate || '').replace(/-/g, '/'));
      var wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      week = wk[d.getDay()] || '';
    } catch (e) {}
    var dateText = (m.matchDate || '').slice(5);
    var levelRange = '不限';
    if (m.ntrpMin && m.ntrpMax) levelRange = m.ntrpMin + '-' + m.ntrpMax;
    else if (m.ntrpMin) levelRange = m.ntrpMin + '+';
    var tags = [];
    var typeMap = { singles: '单打', doubles: '双打', mixed_doubles: '混双', practice: '练习', group: '多打' };
    if (typeMap[m.matchType]) tags.push('🏸 ' + typeMap[m.matchType]);
    if (m.circleOnly) tags.push('圈子专属');
    var distanceText = '';
    if (m.distanceKm != null && !isNaN(m.distanceKm)) {
      distanceText = ' · ' + m.distanceKm + 'km';
    }
    var cd = computeCountdown(m, now);
    return {
      id: m.id,
      title: m.title,
      isPrivate: !!m.circleOnly,
      circleName: m.circleName || '圈子',
      status: m.status,
      date: dateText,
      week: week,
      startTime: m.startTime,
      endTime: m.endTime || '',
      courtName: m.venueName,
      district: (m.venueAddress || '').slice(0, 12),
      distanceText: distanceText,
      levelRange: levelRange,
      tags: tags,
      organizerName: organizerName,
      organizerInitial: initial,
      organizerAvatar: m.organizerAvatar || '',
      currentPlayers: m.currentParticipants || 0,
      maxPlayers: m.maxParticipants || 0,
      priceText: priceText,
      isFree: cost === 0,
      matchType: m.matchType,
      matchDate: (m.matchDate || '').slice(0, 10),
      cdText: cd.cdText,
      cdClass: cd.cdClass,
      cdEnded: cd.ended,
      _raw: m,
    };
  });
}

Page({
  data: {
    recommend: [],
    loading: true,
    nickname: '',
  },

  onShow() {
    var stored = wx.getStorageSync('userInfo') || {};
    this.setData({ nickname: stored.name || '' });
    this.loadRecommend();
    this.startCountdownTimer();
  },

  onHide() { this.stopCountdownTimer(); },
  onUnload() { this.stopCountdownTimer(); },

  startCountdownTimer() {
    var that = this;
    this.stopCountdownTimer();
    this._cdTimer = setInterval(function () { that.refreshCountdown(); }, 60000);
  },
  stopCountdownTimer() {
    if (this._cdTimer) { clearInterval(this._cdTimer); this._cdTimer = null; }
  },
  refreshCountdown() {
    var now = new Date();
    var list = this.data.recommend.map(function (g) {
      var cd = computeCountdown(g._raw, now);
      g.cdText = cd.cdText; g.cdClass = cd.cdClass; g.cdEnded = cd.ended;
      return g;
    });
    this.setData({ recommend: list });
  },

  onPullDownRefresh() {
    this.loadRecommend(true);
  },

  loadRecommend(fromPull) {
    var that = this;
    this.setData({ loading: true });
    api.match
      .list({ status: 'open', limit: 30 })
      .then(function (list) {
        var recruiting = (list || []).filter(isRecruiting).slice(0, 6);
        that.setData({ recommend: decorate(recruiting, new Date()), loading: false });
        if (fromPull) wx.stopPullDownRefresh();
      })
      .catch(function () {
        that.setData({ recommend: [], loading: false });
        if (fromPull) wx.stopPullDownRefresh();
      });
  },

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' });
  },
  goVenues() {
    wx.navigateTo({ url: '/pages/venues/venues' });
  },
  goCourses() {
    wx.switchTab({ url: '/pages/courses/courses' });
  },
  goCircle() {
    wx.switchTab({ url: '/pages/circle/circle' });
  },
  goDetail(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/game-detail/game-detail?id=' + id });
  },
  goCreate() {
    var token = wx.getStorageSync('token');
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    wx.navigateTo({ url: '/pages/create-game/create-game' });
  },
});
