// 发起活动：可从模板一键填充 / 批量发布连续N周 / 选择免费或AA结算 / 模板管理
const api = require('../../utils/api.js');

Page({
  data: {
    circleId: 0,
    circleName: '',
    // 表单
    title: '',
    activityDate: '',
    startTime: '',
    endTime: '',
    venueName: '',
    maxParticipants: 20,
    feeMode: 'free', // free / aa
    description: '',
    repeatWeeks: 0,  // 0=不重复, 1-8
    repeatOptions: ['不重复', '连续2周', '连续3周', '连续4周', '连续5周', '连续6周', '连续7周', '连续8周'],
    repeatIndex: 0,
    // 快捷日期
    quickDate: '',
    todayDate: '',
    // 模板
    templates: [],
    showTemplates: false,
    submitting: false,
  },

  onLoad: function (options) {
    var today = this.formatDate(new Date());
    var todayDate = this.formatDate(new Date());
    this.setData({
      circleId: Number(options.circleId || 0),
      circleName: options.circleName ? decodeURIComponent(options.circleName) : '',
      activityDate: today,
      todayDate: todayDate,
      quickDate: 'today',
    });
    this.loadTemplates();
  },

  formatDate: function (d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  },

  loadTemplates: function () {
    var that = this;
    api.circle.getTemplates(this.data.circleId).then(function (list) {
      that.setData({ templates: list || [] });
    }).catch(function () {});
  },

  // ── 表单输入 ──
  onInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var obj = {}; obj[field] = e.detail.value; this.setData(obj);
  },
  onDateChange: function (e) { this.setData({ activityDate: e.detail.value }); },
  onStartTimeChange: function (e) { this.setData({ startTime: e.detail.value }); },
  onEndTimeChange: function (e) { this.setData({ endTime: e.detail.value }); },
  onMaxChange: function (e) {
    var v = Number(e.detail.value) || 20;
    v = Math.max(2, Math.min(30, v));
    this.setData({ maxParticipants: v });
  },
  onFeeMode: function (e) { this.setData({ feeMode: e.currentTarget.dataset.mode }); },
  onRepeatChange: function (e) {
    var idx = Number(e.detail.value);
    this.setData({ repeatIndex: idx, repeatWeeks: idx === 0 ? 0 : idx + 1 });
  },

  // ── 快捷日期 ──
  onQuickDate: function (e) {
    var day = e.currentTarget.dataset.day;
    var d = new Date();
    if (day === 'tomorrow') d.setDate(d.getDate() + 1);
    else if (day === 'dayafter') d.setDate(d.getDate() + 2);
    this.setData({
      quickDate: day,
      activityDate: this.formatDate(d),
    });
  },

  // ── 人数步进 ──
  onStepMax: function (e) {
    var dir = e.currentTarget.dataset.dir;
    var val = this.data.maxParticipants;
    if (dir === 'plus') val = Math.min(val + 1, 30);
    else if (dir === 'minus') val = Math.max(val - 1, 2);
    this.setData({ maxParticipants: val });
  },

  // ── 从模板填充 ──
  toggleTemplates: function () { this.setData({ showTemplates: !this.data.showTemplates }); },
  onPickTemplate: function (e) {
    var t = this.data.templates[Number(e.currentTarget.dataset.idx)];
    if (!t) return;
    this.setData({
      title: t.title || '',
      quickDate: '',
      startTime: t.startTime || '',
      endTime: t.endTime || '',
      venueName: t.venueName || '',
      maxParticipants: Math.max(2, Math.min(30, t.maxParticipants || 20)),
      feeMode: t.feeMode || 'free',
      description: t.description || '',
      showTemplates: false,
    });
    wx.showToast({ title: '已填入模板', icon: 'none' });
  },

  onDeleteTemplate: function (e) {
    var that = this;
    var templateId = Number(e.currentTarget.dataset.id);
    wx.showModal({
      title: '删除模板', content: '确定删除该活动模板吗？',
      success: function (res) {
        if (!res.confirm) return;
        api.circle.deleteTemplate(templateId).then(function () {
          wx.showToast({ title: '已删除', icon: 'success' });
          that.loadTemplates();
        }).catch(function (err) {
          wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' });
        });
      }
    });
  },

  // 把当前表单存为模板
  onSaveAsTemplate: function () {
    var that = this;
    if (!this.data.title || this.data.title.length < 2) {
      wx.showToast({ title: '请先填写活动标题', icon: 'none' }); return;
    }
    api.circle.createTemplate({
      circleId: this.data.circleId,
      title: this.data.title,
      startTime: this.data.startTime || undefined,
      endTime: this.data.endTime || undefined,
      venueName: this.data.venueName || undefined,
      maxParticipants: this.data.maxParticipants,
      feeMode: this.data.feeMode,
      description: this.data.description || undefined,
    }).then(function () {
      wx.showToast({ title: '模板已保存', icon: 'success' });
      that.loadTemplates();
    }).catch(function (err) {
      wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
    });
  },

  // ── 提交发布 ──
  onSubmit: function () {
    var that = this;
    if (!this.data.title || this.data.title.length < 2) {
      wx.showToast({ title: '请填写活动标题（至少2字）', icon: 'none' }); return;
    }
    if (!this.data.activityDate) {
      wx.showToast({ title: '请选择活动日期', icon: 'none' }); return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中', mask: true });
    api.circle.createActivity({
      circleId: this.data.circleId,
      title: this.data.title,
      description: this.data.description || undefined,
      activityDate: this.data.activityDate,
      startTime: this.data.startTime || undefined,
      endTime: this.data.endTime || undefined,
      venueName: this.data.venueName || undefined,
      maxParticipants: this.data.maxParticipants,
      repeatWeeks: this.data.repeatWeeks,
      feeMode: this.data.feeMode,
    }).then(function () {
      wx.hideLoading();
      that.setData({ submitting: false });
      var n = that.data.repeatWeeks > 0 ? that.data.repeatWeeks : 1;
      wx.showToast({ title: n > 1 ? ('已发布' + n + '场') : '发布成功', icon: 'success' });
      setTimeout(function () { wx.navigateBack(); }, 800);
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ submitting: false });
      wx.showToast({ title: (err && err.message) || '发布失败', icon: 'none' });
    });
  },
});
