const api = require('../../utils/api.js');

var CAT_MAP = { suggestion: '建议', bug: '问题', other: '其他' };
var STATUS_MAP = { pending: '待处理', replied: '已回复', closed: '已关闭' };

Page({
  data: {
    list: [],
    filter: '',          // '' | pending | replied
    loading: true,
    tabs: [
      { key: '', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'replied', label: '已回复' },
    ],
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
    api.feedback
      .adminList(this.data.filter || undefined)
      .then(function (list) {
        var arr = (list || []).map(function (f) {
          return Object.assign({}, f, {
            catLabel: CAT_MAP[f.category] || '其他',
            statusLabel: STATUS_MAP[f.status] || f.status,
            timeText: that.fmt(f.createdAt),
          });
        });
        that.setData({ list: arr, loading: false });
      })
      .catch(function (err) {
        that.setData({ loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  fmt(v) {
    if (!v) return '';
    try {
      var d = new Date(v);
      if (isNaN(d.getTime())) {
        // iOS 兼容：尝试逐字段
        var s = String(v).replace(/-/g, '/').replace('T', ' ').slice(0, 19);
        d = new Date(s);
      }
      var p = function (n) { return n < 10 ? '0' + n : '' + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    } catch (e) { return ''; }
  },

  switchTab(e) {
    var key = e.currentTarget.dataset.key;
    if (key === this.data.filter) return;
    this.setData({ filter: key });
    this.load();
  },

  onReply(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({
      title: '回复反馈',
      editable: true,
      placeholderText: '请输入回复内容，将通知该用户',
      success: function (res) {
        if (!res.confirm) return;
        var reply = (res.content || '').trim();
        if (!reply) { wx.showToast({ title: '回复不能为空', icon: 'none' }); return; }
        wx.showLoading({ title: '提交中...' });
        api.feedback
          .reply(id, reply)
          .then(function () {
            wx.hideLoading();
            wx.showToast({ title: '已回复并通知用户', icon: 'success' });
            that.load();
          })
          .catch(function (err) {
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || '回复失败', icon: 'none' });
          });
      },
    });
  },
});
