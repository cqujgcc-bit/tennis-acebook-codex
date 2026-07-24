const api = require('../../utils/api.js');

Page({
  data: {
    list: [],
    loading: true,
  },

  onLoad() {
    var info = wx.getStorageSync('userInfo') || {};
    if (info.role !== 'admin') {
      wx.showModal({ title: '无权访问', content: '仅管理员可用', showCancel: false, success: function () { wx.navigateBack(); } });
      return;
    }
    this.load();
  },

  load() {
    var that = this;
    this.setData({ loading: true });
    api.admin
      .pendingCoaches()
      .then(function (list) {
        var arr = (list || []).map(function (c) {
          return Object.assign({}, c, {
            certs: (c.certifications || []).join('、') || '未填写',
            specs: (c.specialties || []).join('、') || '未填写',
            certImgs: c.certificationImages || [],
          });
        });
        that.setData({ list: arr, loading: false });
      })
      .catch(function (err) {
        that.setData({ loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  previewImg(e) {
    var url = e.currentTarget.dataset.url;
    var urls = e.currentTarget.dataset.urls || [url];
    wx.previewImage({ current: url, urls: urls });
  },

  onApprove(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({
      title: '通过审核', content: '确认通过该教练的资质审核？通过后将对外展示。', confirmColor: '#0B3D2E',
      success: function (res) {
        if (!res.confirm) return;
        wx.showLoading({ title: '提交中...' });
        api.admin.approveCoach(id).then(function () {
          wx.hideLoading(); wx.showToast({ title: '已通过', icon: 'success' }); that.load();
        }).catch(function (err) { wx.hideLoading(); wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' }); });
      },
    });
  },

  onReject(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({
      title: '驳回审核', editable: true, placeholderText: '请输入驳回原因（将通知教练）',
      success: function (res) {
        if (!res.confirm) return;
        var reason = (res.content || '').trim() || '资质材料不符合要求';
        wx.showLoading({ title: '提交中...' });
        api.admin.rejectCoach(id, reason).then(function () {
          wx.hideLoading(); wx.showToast({ title: '已驳回', icon: 'success' }); that.load();
        }).catch(function (err) { wx.hideLoading(); wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' }); });
      },
    });
  },
});
