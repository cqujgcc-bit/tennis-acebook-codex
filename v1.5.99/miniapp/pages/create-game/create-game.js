const api = require('../../utils/api.js');

// 打球类型
var TYPE_OPTIONS = ['单打', '双打', '混双', '练习', '多打'];
var TYPE_VALUES = ['singles', 'doubles', 'mixed_doubles', 'practice', 'group'];
var TYPE_DEFAULT_PLAYERS = [2, 4, 4, 4, 6];

// 水平要求 6 档（下拉单选）→ ntrpMin / ntrpMax
var LEVEL_OPTIONS = ['1.0-2.0', '2.0-2.5', '2.5-3.0', '3.0-3.5', '3.5-4.0', '4.0以上'];
var LEVEL_RANGE = [
  { min: 1.0, max: 2.0 },
  { min: 2.0, max: 2.5 },
  { min: 2.5, max: 3.0 },
  { min: 3.0, max: 3.5 },
  { min: 3.5, max: 4.0 },
  { min: 4.0, max: 6.0 },
];

// 费用类型
var COST_OPTIONS = ['AA平摊', '免费', '我请客'];
var COST_VALUES = ['aa', 'free', 'host_pays'];
var MAX_TOTAL_COST = 9999;
var MIN_TOTAL_COST = 0.01;

var BANNER = '/assets/images/create-banner.jpg';

var WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function buildDateList() {
  var list = [];
  var now = new Date();
  for (var i = 0; i < 14; i++) {
    var d = new Date(now.getTime() + i * 86400000);
    var week = i === 0 ? '今天' : (i === 1 ? '明天' : WEEK_CN[d.getDay()]);
    list.push({
      value: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      week: week,
      day: d.getDate(),
      md: pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      weekFull: WEEK_CN[d.getDay()],
    });
  }
  return list;
}

// 30 分钟节点 06:00 - 23:30
function buildTimeSlots() {
  var arr = [];
  for (var h = 6; h <= 23; h++) {
    arr.push(pad(h) + ':00');
    arr.push(pad(h) + ':30');
  }
  return arr;
}

Page({
  data: {
    bannerImage: BANNER,
    titlePlaceholder: '自动生成，可修改',
    form: {
      title: '',
      titleEdited: false,
      venueName: '',
      venueAddress: '',
      courtNo: '',
      latitude: null,
      longitude: null,
      startTime: '',
      endTime: '',
      maxPlayers: 4,
      totalCost: '',
      bringOwnBall: false,
      isPrivate: false,
    },
    dateList: [],
    dateIndex: 0,
    timeSlots: [],
    typeOptions: TYPE_OPTIONS,
    typeIndex: 1,
    levelOptions: LEVEL_OPTIONS,
    levelIndex: 3,
    costOptions: COST_OPTIONS,
    costIndex: 0,
    perPerson: '0',
    estimateLabel: '总价 / 人均',
    estimateText: '¥0',
    submitting: false,
    circleId: null,
    circleName: '',
    // 时间滚动选择器
    showTimePicker: false,
    timeTarget: 'start',
    tpIndex: 0,
  },

  onLoad: function (options) {
    var patch = {
      dateList: buildDateList(),
      timeSlots: buildTimeSlots(),
    };
    if (options && options.circleId) {
      patch.circleId = Number(options.circleId);
      patch.circleName = options.circleName ? decodeURIComponent(options.circleName) : '';
      patch['form.isPrivate'] = true;
    }
    this.setData(patch);
    this.refreshAuto();
  },

  noop: function () {},

  // ── 输入 ──
  onInput: function (e) {
    var key = e.currentTarget.dataset.key;
    var patch = {};
    var val = e.detail.value;
    if (key === 'totalCost') {
      var num = parseFloat(val);
      if (num > MAX_TOTAL_COST) {
        wx.showToast({ title: '场地总价不能超过 ¥' + MAX_TOTAL_COST, icon: 'none' });
        val = String(MAX_TOTAL_COST);
      } else if (num < 0) {
        val = '0';
      }
    }
    patch['form.' + key] = val;
    if (key === 'title') patch['form.titleEdited'] = true;
    this.setData(patch);
    if (key === 'totalCost') this.refreshEstimate();
    if (key === 'courtNo') this.refreshAuto();
  },

  // ── 日期 ──
  onDateTap: function (e) {
    this.setData({ dateIndex: Number(e.currentTarget.dataset.index) });
    this.refreshAuto();
  },

  // ── 时间滚动选择器 ──
  onPickStart: function () {
    var idx = this.indexOfSlot(this.data.form.startTime, 26); // 默认 19:00
    this.setData({ showTimePicker: true, timeTarget: 'start', tpIndex: idx });
  },
  onPickEnd: function () {
    var idx = this.indexOfSlot(this.data.form.endTime, 29); // 默认 20:30
    this.setData({ showTimePicker: true, timeTarget: 'end', tpIndex: idx });
  },
  indexOfSlot: function (val, fallback) {
    if (!val) return fallback;
    var i = this.data.timeSlots.indexOf(val);
    return i >= 0 ? i : fallback;
  },
  onTimeColChange: function (e) {
    this.setData({ tpIndex: e.detail.value[0] });
  },
  onTimeCancel: function () { this.setData({ showTimePicker: false }); },
  onTimeConfirm: function () {
    var slots = this.data.timeSlots;
    var t = slots[this.data.tpIndex];
    var patch = { showTimePicker: false };
    if (this.data.timeTarget === 'start') {
      patch['form.startTime'] = t;
      // 没设结束或结束早于开始，自动补 +1.5h
      var endIdx = Math.min(this.data.tpIndex + 3, slots.length - 1);
      var curEndIdx = this.data.form.endTime ? slots.indexOf(this.data.form.endTime) : -1;
      if (curEndIdx <= this.data.tpIndex) patch['form.endTime'] = slots[endIdx];
    } else {
      patch['form.endTime'] = t;
    }
    this.setData(patch);
    this.refreshAuto();
  },

  // ── 地图选点 ──
  onChooseLocation: function () {
    var that = this;
    wx.chooseLocation({
      success: function (res) {
        that.setData({
          'form.venueName': res.name || res.address || '已选位置',
          'form.venueAddress': res.address || '',
          'form.latitude': res.latitude,
          'form.longitude': res.longitude,
        });
        that.refreshAuto();
      },
      fail: function (err) {
        if (err && err.errMsg && err.errMsg.indexOf('auth') >= 0) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中开启位置权限以便在地图中选择球场',
            confirmText: '去设置',
            success: function (r) { if (r.confirm) wx.openSetting(); },
          });
        }
      },
    });
  },

  // ── 打球类型 ──
  onTypeTap: function (e) {
    var idx = Number(e.currentTarget.dataset.index);
    this.setData({ typeIndex: idx, 'form.maxPlayers': TYPE_DEFAULT_PLAYERS[idx] || 4 });
    this.refreshAuto();
    this.refreshEstimate();
  },

  // ── 人数步进 ──
  onMinus: function () {
    var n = this.data.form.maxPlayers - 1;
    if (n < 2) n = 2;
    this.setData({ 'form.maxPlayers': n });
    this.refreshEstimate();
  },
  onPlus: function () {
    var n = this.data.form.maxPlayers + 1;
    if (n > 20) n = 20;
    this.setData({ 'form.maxPlayers': n });
    this.refreshEstimate();
  },

  // ── 水平下拉 ──
  onLevelChange: function (e) { this.setData({ levelIndex: Number(e.detail.value) }); },

  // ── 自带球 ──
  onBallChange: function (e) { this.setData({ 'form.bringOwnBall': e.detail.value }); },

  // ── 费用类型 ──
  onCostTypeTap: function (e) {
    this.setData({ costIndex: Number(e.currentTarget.dataset.index) });
    this.refreshEstimate();
  },

  // ── 仅圈子可见 ──
  onPrivateChange: function (e) { this.setData({ 'form.isPrivate': e.detail.value }); },

  // ── 自动生成标题 ──
  refreshAuto: function () {
    if (this.data.form.titleEdited) { this.refreshEstimate(); return; }
    var d = this.data.dateList[this.data.dateIndex];
    var parts = [];
    if (d) parts.push(d.md + ' ' + d.weekFull);
    if (this.data.form.startTime) parts.push(this.data.form.startTime);
    var venue = this.data.form.venueName;
    if (venue) parts.push(venue.length > 8 ? venue.slice(0, 8) : venue);
    if (this.data.form.courtNo) parts.push(this.data.form.courtNo);
    parts.push(TYPE_OPTIONS[this.data.typeIndex]);
    this.setData({ 'form.title': parts.join(' ') });
    this.refreshEstimate();
  },

  // ── 费用估算：发起人填总价，自动算满员人均 ──
  refreshEstimate: function () {
    var costIndex = this.data.costIndex;
    if (costIndex === 1) { this.setData({ estimateLabel: '费用', estimateText: '免费', perPerson: '0' }); return; }
    if (costIndex === 2) { this.setData({ estimateLabel: '费用', estimateText: '组织者请客', perPerson: '0' }); return; }
    var total = parseFloat(this.data.form.totalCost) || 0;
    var n = this.data.form.maxPlayers || 1;
    var per = total > 0 ? Math.ceil(total / n) : 0;
    var perStr = per.toString();
    this.setData({
      perPerson: perStr,
      estimateLabel: '总价 ¥' + total + ' · 人均',
      estimateText: '¥' + perStr,
    });
  },

  // ── 提交 ──
  onSubmit: function () {
    var f = this.data.form;
    var that = this;

    if (!f.title || f.title.length < 2) { wx.showToast({ title: '请填写球局标题', icon: 'none' }); return; }
    if (!f.venueName) { wx.showToast({ title: '请选择球场位置', icon: 'none' }); return; }
    var d = this.data.dateList[this.data.dateIndex];
    if (!d) { wx.showToast({ title: '请选择日期', icon: 'none' }); return; }
    if (!f.startTime) { wx.showToast({ title: '请选择开始时间', icon: 'none' }); return; }

    var token = wx.getStorageSync('token');
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    if (this.data.submitting) return;

    var costType = COST_VALUES[this.data.costIndex];
    var total = parseFloat(f.totalCost) || 0;
    var feeRequired = costType === 'aa' && total > 0;
    if (costType === 'aa' && total <= 0) { wx.showToast({ title: '请填写场地总价', icon: 'none' }); return; }
    if (total > MAX_TOTAL_COST) { wx.showToast({ title: '场地总价不能超过 ¥' + MAX_TOTAL_COST, icon: 'none' }); return; }
    if (costType === 'aa' && total < MIN_TOTAL_COST) { wx.showToast({ title: '场地总价至少 ¥' + MIN_TOTAL_COST, icon: 'none' }); return; }

    // 满员人均（向上取整）
    var per = feeRequired ? Math.ceil(total / f.maxPlayers) : 0;

    var range = LEVEL_RANGE[this.data.levelIndex] || LEVEL_RANGE[0];
    var venueFull = f.courtNo ? (f.venueName + ' ' + f.courtNo) : f.venueName;
    var payload = {
      title: f.title,
      matchType: TYPE_VALUES[this.data.typeIndex] || 'doubles',
      matchDate: d.value,
      startTime: f.startTime,
      endTime: f.endTime || undefined,
      venueName: venueFull,
      courtNo: f.courtNo || undefined,
      venueAddress: f.venueAddress || undefined,
      maxParticipants: f.maxPlayers,
      // 同时写新旧费用字段，保证首页/详情页价格展示兼容
      costPerPerson: per,
      feePerPerson: feeRequired ? per : undefined,
      feeRequired: feeRequired,
      costSplitType: costType,
      bringOwnBall: !!f.bringOwnBall,
      city: 'shenzhen',
      circleOnly: !!f.isPrivate,
      ntrpMin: range.min,
      ntrpMax: range.max,
    };
    if (f.latitude != null) payload.latitude = f.latitude;
    if (f.longitude != null) payload.longitude = f.longitude;
    if (this.data.circleId) payload.circleId = this.data.circleId;

    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中...' });
    api.match.create(payload)
      .then(function () {
        wx.hideLoading();
        that.setData({ submitting: false });
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(function () {
          var pages = getCurrentPages();
          var prev = pages[pages.length - 2];
          if (prev && prev.loadMatches) prev.loadMatches();
          if (prev && prev.loadDetail) prev.loadDetail();
          wx.navigateBack();
        }, 800);
      })
      .catch(function (err) {
        wx.hideLoading();
        that.setData({ submitting: false });
        wx.showToast({ title: (err && err.message) || '发布失败', icon: 'none' });
      });
  },
});
