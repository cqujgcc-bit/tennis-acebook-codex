const api = require('../../utils/api.js');

Page({
  data: {
    list: [],
    loading: true,
    dirty: false,   // 顺序是否有未保存改动
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
      .listBookingApps()
      .then(function (list) {
        that.setData({ list: list || [], loading: false, dirty: false });
      })
      .catch(function (err) {
        that.setData({ loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  move(e) {
    var idx = Number(e.currentTarget.dataset.idx);
    var dir = e.currentTarget.dataset.dir; // up | down
    var list = this.data.list.slice();
    var target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= list.length) return;
    var tmp = list[idx]; list[idx] = list[target]; list[target] = tmp;
    this.setData({ list: list, dirty: true });
  },

  saveOrder() {
    var that = this;
    var n = this.data.list.length;
    // 顶部权重最大，依次递减（间隔10，方便后续插入）
    var orders = this.data.list.map(function (item, i) {
      return { id: item.id, sortWeight: (n - i) * 10 };
    });
    wx.showLoading({ title: '保存中...' });
    api.admin
      .reorderBookingApps(orders)
      .then(function () {
        wx.hideLoading();
        wx.showToast({ title: '顺序已保存', icon: 'success' });
        that.load();
      })
      .catch(function (err) {
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
      });
  },

  onToggle(e) {
    var item = e.currentTarget.dataset.item;
    var that = this;
    api.admin
      .toggleBookingApp(item.id, !item.enabled)
      .then(function () {
        wx.showToast({ title: item.enabled ? '已下架' : '已上架', icon: 'success' });
        that.load();
      })
      .catch(function (err) { wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' }); });
  },

  onDelete(e) {
    var item = e.currentTarget.dataset.item;
    var that = this;
    wx.showModal({
      title: '删除平台', content: '确认删除「' + item.name + '」？删除后用户将不再看到该入口。',
      confirmColor: '#ff4d4f',
      success: function (res) {
        if (!res.confirm) return;
        api.admin.deleteBookingApp(item.id).then(function () {
          wx.showToast({ title: '已删除', icon: 'success' }); that.load();
        }).catch(function (err) { wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' }); });
      },
    });
  },

  onEdit(e) {
    var item = e.currentTarget.dataset.item || {};
    wx.navigateTo({
      url: '/pages/admin-venue-edit/admin-venue-edit?id=' + (item.id || '') +
        '&name=' + encodeURIComponent(item.name || '') +
        '&appId=' + encodeURIComponent(item.appId || '') +
        '&appKey=' + encodeURIComponent(item.appKey || '') +
        '&description=' + encodeURIComponent(item.description || '') +
        '&emoji=' + encodeURIComponent(item.emoji || ''),
    });
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/admin-venue-edit/admin-venue-edit' });
  },

  onShow() {
    // 从编辑页返回时刷新
    if (this._needReload) { this._needReload = false; this.load(); }
  },
});
