const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    isAdmin: false,
    stats: null,
    pendingFeedback: 0,
    loading: true,
  },

  onLoad() {
    var info = wx.getStorageSync('userInfo') || {};
    if (info.role !== 'admin') {
      this.setData({ isAdmin: false, loading: false });
      wx.showModal({
        title: '无权访问',
        content: '该页面仅管理员可用。',
        showCancel: false,
        confirmText: '返回',
        success: function () { wx.navigateBack({ delta: 1 }); },
      });
      return;
    }
    this.setData({ isAdmin: true });
  },

  onShow() {
    if (!this.data.isAdmin) return;
    this.loadStats();
    this.loadPending();
  },

  loadStats() {
    var that = this;
    api.admin
      .stats()
      .then(function (s) {
        that.setData({ stats: s || {}, loading: false });
      })
      .catch(function (err) {
        that.setData({ loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  loadPending() {
    var that = this;
    api.feedback
      .pendingCount()
      .then(function (r) {
        that.setData({ pendingFeedback: (r && r.count) || 0 });
      })
      .catch(function () {});
  },

  go(e) {
    var page = e.currentTarget.dataset.page;
    wx.navigateTo({ url: '/pages/' + page + '/' + page });
  },
});
