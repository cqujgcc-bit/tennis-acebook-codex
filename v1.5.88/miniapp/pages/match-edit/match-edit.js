var api = require('../../utils/api.js');

Page({
  data: {
    matchId: 0,
    loading: true,
    saving: false,
    feeRequired: false,
    minCap: 1,
    form: {
      title: '', matchDate: '', startTime: '', endTime: '',
      venueName: '', venueAddress: '', courtNo: '', description: '',
      maxParticipants: 2, feePerPerson: ''
    }
  },

  onLoad: function (opts) {
    var id = Number(opts.id || opts.matchId || 0);
    this.setData({ matchId: id });
    this.loadMatch(id);
  },

  loadMatch: function (id) {
    var that = this;
    api.match.getById(id).then(function (res) {
      var m = (res && res.match) ? res.match : res;
      if (!m) { wx.showToast({ title: '球局不存在', icon: 'none' }); return; }
      var feeRequired = !!(m.feeRequired);
      var current = m.currentParticipants || 1;
      that.setData({
        loading: false,
        feeRequired: feeRequired,
        minCap: current,
        form: {
          title: m.title || '',
          matchDate: m.matchDate || '',
          startTime: m.startTime || '',
          endTime: m.endTime || '',
          venueName: m.venueName || '',
          venueAddress: m.venueAddress || '',
          courtNo: m.courtNo || '',
          description: m.description || '',
          maxParticipants: m.maxParticipants || current,
          feePerPerson: m.feePerPerson != null ? String(m.feePerPerson) : ''
        }
      });
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
    });
  },

  onInput: function (e) {
    var key = e.currentTarget.dataset.key;
    var form = this.data.form;
    form[key] = e.detail.value;
    this.setData({ form: form });
  },
  onDateChange: function (e) { var f = this.data.form; f.matchDate = e.detail.value; this.setData({ form: f }); },
  onStartChange: function (e) { var f = this.data.form; f.startTime = e.detail.value; this.setData({ form: f }); },
  onEndChange: function (e) { var f = this.data.form; f.endTime = e.detail.value; this.setData({ form: f }); },

  onCapMinus: function () {
    var f = this.data.form;
    if (f.maxParticipants <= this.data.minCap) {
      wx.showToast({ title: '不能小于已报名人数', icon: 'none' });
      return;
    }
    f.maxParticipants = f.maxParticipants - 1;
    this.setData({ form: f });
  },
  onCapPlus: function () {
    var f = this.data.form;
    f.maxParticipants = f.maxParticipants + 1;
    this.setData({ form: f });
  },

  onSave: function () {
    if (this.data.saving) return;
    var that = this;
    var f = this.data.form;
    if (!f.title) { wx.showToast({ title: '请填写标题', icon: 'none' }); return; }
    var payload = {
      matchId: Number(this.data.matchId),
      title: f.title,
      matchDate: f.matchDate,
      startTime: f.startTime,
      endTime: f.endTime || undefined,
      venueName: f.venueName,
      venueAddress: f.venueAddress || undefined,
      courtNo: f.courtNo || undefined,
      description: f.description || undefined,
      maxParticipants: Number(f.maxParticipants)
    };
    if (this.data.feeRequired && f.feePerPerson !== '') {
      payload.feePerPerson = Number(f.feePerPerson);
    }
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...', mask: true });
    api.match.editMatch(payload).then(function () {
      wx.hideLoading();
      that.setData({ saving: false });
      wx.showToast({ title: '已保存', icon: 'success' });
      var pages = getCurrentPages();
      var prev = pages[pages.length - 2];
      if (prev && typeof prev.loadDetail === 'function') { prev.loadDetail(); }
      setTimeout(function () { wx.navigateBack(); }, 800);
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ saving: false });
      wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
    });
  }
});
