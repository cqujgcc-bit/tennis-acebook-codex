const api = require('../../utils/api.js');

Page({
  data: {
    title: '',
    content: '',
    scopeIndex: 0,
    scopes: [
      { key: 'all', label: '全体用户' },
      { key: 'user', label: '仅普通用户' },
      { key: 'coach', label: '仅教练' },
    ],
    submitting: false,
  },

  onLoad() {
    var info = wx.getStorageSync('userInfo') || {};
    if (info.role !== 'admin') {
      wx.showModal({ title: '无权访问', content: '仅管理员可用', showCancel: false, success: function () { wx.navigateBack(); } });
    }
  },

  onTitle(e) { this.setData({ title: e.detail.value }); },
  onContent(e) { this.setData({ content: e.detail.value }); },
  onScope(e) { this.setData({ scopeIndex: Number(e.detail.value) }); },

  onSubmit() {
    var that = this;
    var title = (this.data.title || '').trim();
    var content = (this.data.content || '').trim();
    if (!title) { wx.showToast({ title: '请输入公告标题', icon: 'none' }); return; }
    if (!content) { wx.showToast({ title: '请输入公告内容', icon: 'none' }); return; }
    var scope = this.data.scopes[this.data.scopeIndex];
    wx.showModal({
      title: '确认发送公告',
      content: '将向「' + scope.label + '」发送系统通知，确认？',
      confirmColor: '#0B3D2E',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ submitting: true });
        wx.showLoading({ title: '发送中...' });
        api.admin
          .broadcast(title, content, scope.key)
          .then(function (r) {
            wx.hideLoading();
            that.setData({ submitting: false });
            wx.showModal({
              title: '发送成功',
              content: '已通知 ' + ((r && r.sent) || 0) + ' 位用户。',
              showCancel: false,
              success: function () {
                that.setData({ title: '', content: '' });
              },
            });
          })
          .catch(function (err) {
            wx.hideLoading();
            that.setData({ submitting: false });
            wx.showToast({ title: (err && err.message) || '发送失败', icon: 'none' });
          });
      },
    });
  },
});
