const api = require('../../utils/api.js');

// iOS 安全的日期解析：避免 new Date('2026-06-28 20:30') 在 iOS 返回 Invalid Date
function parseDateTime(dateStr, hm) {
  if (!dateStr) return null;
  var d = (dateStr || '').slice(0, 10).split('-');
  if (d.length < 3) return null;
  var t = (hm || '00:00').split(':');
  var y = parseInt(d[0], 10), mo = parseInt(d[1], 10), da = parseInt(d[2], 10);
  var h = parseInt(t[0], 10) || 0, mi = parseInt(t[1], 10) || 0;
  if (isNaN(y) || isNaN(mo) || isNaN(da)) return null;
  return new Date(y, mo - 1, da, h, mi, 0);
}

var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
var TYPE_MAP = { singles: '单打', doubles: '双打', mixed_doubles: '混双', practice: '练习', group: '多打' };

// 后端球局 → 卡片展示字段
function decorate(m, now) {
  var startDt = parseDateTime(m.matchDate, m.startTime);
  var endDt = parseDateTime(m.matchDate, m.endTime || m.startTime);
  var endDtOrStart = parseDateTime(m.matchDate, m.endTime || m.startTime || '00:00');
  var ended = endDtOrStart ? now.getTime() >= endDtOrStart.getTime() : false;
  var status = (m.status || '').toLowerCase();
  // 状态文案
  var stateText = '招募中', stateClass = 'st-open';
  if (status === 'cancelled') { stateText = '已取消'; stateClass = 'st-cancel'; }
  else if (status === 'completed') { stateText = '已完成'; stateClass = 'st-done'; }
  else if (ended) { stateText = '已结束'; stateClass = 'st-ended'; }
  else if (status === 'full') { stateText = '已满员'; stateClass = 'st-full'; }
  var week = '';
  var d0 = parseDateTime(m.matchDate, '00:00');
  if (d0) week = WEEK[d0.getDay()] || '';
  var tags = [];
  if (TYPE_MAP[m.matchType]) tags.push(TYPE_MAP[m.matchType]);
  if (m.circleOnly) tags.push('圈子专属');
  var cost = parseFloat(m.feePerPerson || m.costPerPerson || 0);
  return {
    id: m.id,
    title: m.title || '球局',
    status: status,
    stateText: stateText,
    stateClass: stateClass,
    isCompleted: status === 'completed',
    dateText: (m.matchDate || '').slice(5),
    week: week,
    startTime: m.startTime || '',
    endTime: m.endTime || '',
    venueName: m.venueName || '',
    tags: tags,
    currentPlayers: m.currentParticipants || 0,
    maxPlayers: m.maxParticipants || 0,
    priceText: cost > 0 ? ('¥' + cost + '/人') : '免费',
  };
}

Page({
  data: {
    tab: 'authored', // authored | joined
    loading: true,
    authoredActive: [],
    authoredHistory: [],
    joinedActive: [],
    joinedHistory: [],
    authoredCount: 0,
    joinedConfirmedCount: 0,
    authoredPendingAction: 0,   // 已结束但未确认完成的发起球局数
    historyShow: {},            // { auth: false, join: false }
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 从详情页确认完成返回后刷新统计
    if (this._loaded) this.loadData();
  },

  onPullDownRefresh() {
    this.loadData(true);
  },

  switchTab(e) {
    var tab = e.currentTarget.dataset.tab;
    if (tab && tab !== this.data.tab) this.setData({ tab: tab });
  },

  // 判断球局是否属于"进行中"（未过期且非完成/取消）
  isActiveMatch: function (g) {
    if (g.status === 'completed' || g.status === 'cancelled') return false;
    // 已结束（时间已过但还没 completed/cancelled）→ 历史
    if (g.stateText === '已结束') return false;
    return true;
  },

  loadData(fromPull) {
    var that = this;
    this.setData({ loading: true });
    api.match
      .myMatches()
      .then(function (res) {
        var now = new Date();
        var authoredRaw = (res && res.authored) || [];
        var joinedRaw = (res && res.joined) || [];
        var allAuthored = authoredRaw.map(function (m) { return decorate(m, now); });
        var allJoined = joinedRaw.map(function (m) { return decorate(m, now); });
        // 按进行中/历史分区
        var authoredActive = allAuthored.filter(function (g) { return that.isActiveMatch(g); });
        var authoredHistory = allAuthored.filter(function (g) { return !that.isActiveMatch(g); });
        var joinedActive = allJoined.filter(function (g) { return that.isActiveMatch(g); });
        var joinedHistory = allJoined.filter(function (g) { return !that.isActiveMatch(g); });
        // 历史按时间降序
        authoredHistory.sort(function (a, b) { return (b.dateText + b.startTime).localeCompare(a.dateText + a.startTime); });
        joinedHistory.sort(function (a, b) { return (b.dateText + b.startTime).localeCompare(a.dateText + a.startTime); });
        // 「我参与的」统计口径：只计入已被发起人确认完成(status=completed)的球局
        var joinedConfirmedCount = allJoined.filter(function (g) { return g.isCompleted; }).length;
        // 待操作：已结束（时间已过）但未 completed/cancelled 的发起球局
        var authoredPendingAction = authoredHistory.filter(function (g) {
          return g.status !== 'completed' && g.status !== 'cancelled';
        }).length;
        that._loaded = true;
        that.setData({
          authoredActive: authoredActive,
          authoredHistory: authoredHistory,
          joinedActive: joinedActive,
          joinedHistory: joinedHistory,
          authoredCount: allAuthored.length,
          joinedConfirmedCount: joinedConfirmedCount,
          authoredPendingAction: authoredPendingAction,
          loading: false,
        });
        if (fromPull) wx.stopPullDownRefresh();
      })
      .catch(function (err) {
        that.setData({ loading: false });
        if (fromPull) wx.stopPullDownRefresh();
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  goDetail(e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/game-detail/game-detail?id=' + id });
  },

  // ── 切换历史折叠 ──
  toggleHistory: function (e) {
    var key = e.currentTarget.dataset.key;
    var show = this.data.historyShow || {};
    show[key] = !show[key];
    this.setData({ historyShow: show });
  },

  // ── 点击待操作横幅：跳转到第一个待处理球局详情 ──
  goDetailByPending: function () {
    var pending = this.data.authoredHistory.filter(function (g) {
      return g.status !== 'completed' && g.status !== 'cancelled';
    });
    if (pending.length > 0 && pending[0].id) {
      wx.navigateTo({ url: '/pages/game-detail/game-detail?id=' + pending[0].id });
    }
  },

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' });
  },
});
