const api = require('../../utils/api.js');

var ROLE_MAP = { admin: '管理员', coach: '教练', user: '用户' };

Page({
  data: {
    list: [],
    total: 0,
    keyword: '',
    loading: true,
    offset: 0,
    limit: 30,
    noMore: false,
  },

  onLoad() {
    var info = wx.getStorageSync('userInfo') || {};
    if (info.role !== 'admin') {
      wx.showModal({ title: '无权访问', content: '仅管理员可用', showCancel: false, success: function () { wx.navigateBack(); } });
      return;
    }
    this.load(true);
  },

  decorate(u) {
    return Object.assign({}, u, {
      roleLabel: ROLE_MAP[u.role] || u.role || '用户',
      phoneText: u.phone || '未绑定',
      creditText: (u.creditScore === undefined || u.creditScore === null) ? 100 : u.creditScore,
      banned: u.status === 'banned',
    });
  },

  load(reset) {
    var that = this;
    if (reset) { this.setData({ offset: 0, list: [], noMore: false }); }
    this.setData({ loading: true });
    api.admin
      .listUsers({ search: this.data.keyword || undefined, limit: this.data.limit, offset: reset ? 0 : this.data.offset })
      .then(function (res) {
        var users = (res && res.users) || [];
        var decorated = users.map(that.decorate);
        var merged = reset ? decorated : that.data.list.concat(decorated);
        that.setData({
          list: merged,
          total: (res && res.total) || merged.length,
          loading: false,
          offset: merged.length,
          noMore: users.length < that.data.limit,
        });
      })
      .catch(function (err) {
        that.setData({ loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  onInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.load(true); },
  onReachBottom() { if (!this.data.noMore && !this.data.loading) this.load(false); },

  // 调整信用分
  onAdjust(e) {
    var u = e.currentTarget.dataset.user;
    var that = this;
    wx.showActionSheet({
      itemList: ['加分 +5', '加分 +10', '扣分 -5', '扣分 -10', '恢复至 100', '自定义'],
      success: function (res) {
        var presets = [5, 10, -5, -10, null, 'custom'];
        var v = presets[res.tapIndex];
        if (v === 'custom') { that.customAdjust(u); return; }
        if (v === null) { v = 100 - ((u.creditScore === undefined || u.creditScore === null) ? 100 : u.creditScore); if (v === 0) { wx.showToast({ title: '已是满分', icon: 'none' }); return; } }
        that.doAdjust(u.id, v);
      },
    });
  },

  customAdjust(u) {
    var that = this;
    wx.showModal({
      title: '自定义调整（如 +8 或 -8）',
      editable: true,
      placeholderText: '输入正负整数',
      success: function (res) {
        if (!res.confirm) return;
        var n = parseInt((res.content || '').trim(), 10);
        if (isNaN(n) || n === 0) { wx.showToast({ title: '请输入有效数字', icon: 'none' }); return; }
        that.doAdjust(u.id, n);
      },
    });
  },

  doAdjust(userId, delta) {
    var that = this;
    wx.showModal({
      title: '填写调整原因',
      editable: true,
      placeholderText: '例如：违规取消扣分 / 活跃奖励',
      success: function (res) {
        if (!res.confirm) return;
        var reason = (res.content || '').trim() || '管理员手动调整';
        wx.showLoading({ title: '提交中...' });
        api.admin
          .adjustCredit(userId, delta, reason)
          .then(function (r) {
            wx.hideLoading();
            wx.showToast({ title: '已调整为 ' + (r && r.creditScore), icon: 'success' });
            that.load(true);
          })
          .catch(function (err) {
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || '调整失败', icon: 'none' });
          });
      },
    });
  },

  // 封禁 / 解封
  onBanToggle(e) {
    var u = e.currentTarget.dataset.user;
    var that = this;
    if (u.banned) {
      wx.showModal({
        title: '解封用户', content: '确认解封「' + (u.name || u.id) + '」？',
        success: function (res) {
          if (!res.confirm) return;
          api.admin.unbanUser(u.id).then(function () { wx.showToast({ title: '已解封', icon: 'success' }); that.load(true); })
            .catch(function (err) { wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' }); });
        },
      });
    } else {
      wx.showModal({
        title: '封禁用户', editable: true, placeholderText: '封禁原因',
        success: function (res) {
          if (!res.confirm) return;
          api.admin.banUser(u.id, (res.content || '').trim() || '违规').then(function () { wx.showToast({ title: '已封禁', icon: 'success' }); that.load(true); })
            .catch(function (err) { wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' }); });
        },
      });
    }
  },

  // 警告
  onWarn(e) {
    var u = e.currentTarget.dataset.user;
    var that = this;
    wx.showModal({
      title: '警告用户', editable: true, placeholderText: '警告内容（将通知用户）',
      success: function (res) {
        if (!res.confirm) return;
        var reason = (res.content || '').trim();
        if (!reason) { wx.showToast({ title: '内容不能为空', icon: 'none' }); return; }
        api.admin.warnUser(u.id, reason).then(function () { wx.showToast({ title: '已发送警告', icon: 'success' }); })
          .catch(function (err) { wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' }); });
      },
    });
  },
});
