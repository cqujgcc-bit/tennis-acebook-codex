const api = require('../../utils/api.js');

Page({
  data: {
    id: null,
    isEdit: false,
    form: { name: '', description: '', emoji: '🎾', appId: '', appKey: '' },
    submitting: false,
  },

  onLoad(q) {
    var info = wx.getStorageSync('userInfo') || {};
    if (info.role !== 'admin') {
      wx.showModal({ title: '无权访问', content: '仅管理员可用', showCancel: false, success: function () { wx.navigateBack(); } });
      return;
    }
    var dec = function (v) { try { return decodeURIComponent(v || ''); } catch (e) { return v || ''; } };
    if (q && q.id) {
      this.setData({
        id: Number(q.id),
        isEdit: true,
        form: {
          name: dec(q.name),
          description: dec(q.description),
          emoji: dec(q.emoji) || '🎾',
          appId: dec(q.appId),
          appKey: dec(q.appKey),
        },
      });
      wx.setNavigationBarTitle({ title: '编辑平台' });
    } else {
      wx.setNavigationBarTitle({ title: '新增平台' });
    }
  },

  onField(e) {
    var key = e.currentTarget.dataset.key;
    var form = this.data.form;
    form[key] = e.detail.value;
    this.setData({ form: form });
  },

  onSubmit() {
    var that = this;
    var f = this.data.form;
    if (!f.name.trim()) { wx.showToast({ title: '请输入平台名称', icon: 'none' }); return; }
    if (!f.appId.trim()) { wx.showToast({ title: '请输入目标小程序 AppID', icon: 'none' }); return; }
    var appKey = (f.appKey || '').trim() || ('app_' + Date.now());
    var payload = {
      appKey: appKey,
      name: f.name.trim(),
      description: (f.description || '').trim(),
      appId: f.appId.trim(),
      emoji: (f.emoji || '🎾').trim(),
    };
    if (this.data.isEdit) payload.id = this.data.id;
    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });
    api.admin
      .upsertBookingApp(payload)
      .then(function () {
        wx.hideLoading();
        that.setData({ submitting: false });
        wx.showToast({ title: '已保存', icon: 'success' });
        // 通知列表页刷新
        var pages = getCurrentPages();
        var prev = pages[pages.length - 2];
        if (prev) prev._needReload = true;
        setTimeout(function () { wx.navigateBack(); }, 600);
      })
      .catch(function (err) {
        wx.hideLoading();
        that.setData({ submitting: false });
        wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
      });
  },
});
