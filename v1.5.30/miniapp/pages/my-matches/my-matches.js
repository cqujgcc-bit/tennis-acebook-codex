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
  var ended = endDt ? now.getTime() >= endDt.getTime() : false;
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
    authored: [],
    joined: [],
    authoredCount: 0,
    // 「我参与的」只统计已被发起人确认完成的球局
    joinedConfirmedCount: 0,
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

  loadData(fromPull) {
    var that = this;
    this.setData({ loading: true });
    api.match
      .myMatches()
      .then(function (res) {
        var now = new Date();
        var authoredRaw = (res && res.authored) || [];
        var joinedRaw = (res && res.joined) || [];
        var authored = authoredRaw.map(function (m) { return decorate(m, now); });
        var joined = joinedRaw.map(function (m) { return decorate(m, now); });
        // 「我参与的」统计口径：只计入已被发起人确认完成(status=completed)的球局
        var joinedConfirmedCount = joined.filter(function (g) { return g.isCompleted; }).length;
        that._loaded = true;
        that.setData({
          authored: authored,
          joined: joined,
          authoredCount: authored.length,
          joinedConfirmedCount: joinedConfirmedCount,
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

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' });
  },
});
