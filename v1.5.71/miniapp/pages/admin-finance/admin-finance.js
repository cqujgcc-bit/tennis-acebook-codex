const api = require('../../utils/api.js');

Page({
  data: {
    loading: true,
    overview: {
      totalCollected: '0.00',
      totalSettled: '0.00',
      totalPending: '0.00',
      totalRefunded: '0.00',
      totalWithdrawn: '0.00',
      currentBalance: '0.00',
      orderStats: { total: 0, paid: 0, settled: 0, refunded: 0 },
      matchStats: { total: 0, completed: 0, settled: 0 },
    },
    settlements: [],
    withdrawAmount: '',
    withdrawDesc: '',
    withdrawing: false,
  },

  onShow() {
    var info = wx.getStorageSync('userInfo') || {};
    if (info.role !== 'admin') {
      wx.showModal({
        title: '无权访问',
        content: '该页面仅管理员可用。',
        showCancel: false,
        confirmText: '返回',
        success: function () { wx.navigateBack({ delta: 1 }); },
      });
      return;
    }
    this.loadData();
  },

  onPullDownRefresh() {
    var that = this;
    this.loadData().then(function () {
      wx.stopPullDownRefresh();
    });
  },

  loadData() {
    var that = this;
    this.setData({ loading: true });
    return Promise.all([
      api.admin.finance.overview(),
      api.admin.finance.settlements({ limit: 20, offset: 0 }),
    ]).then(function (results) {
      var overview = results[0] || {};
      that.setData({
        loading: false,
        overview: {
          totalCollected: that.fmt(overview.totalCollected),
          totalSettled: that.fmt(overview.totalSettled),
          totalPending: that.fmt(overview.totalPending),
          totalRefunded: that.fmt(overview.totalRefunded),
          totalWithdrawn: that.fmt(overview.totalWithdrawn),
          currentBalance: that.fmt(overview.currentBalance),
          orderStats: overview.orderStats || that.data.overview.orderStats,
          matchStats: overview.matchStats || that.data.overview.matchStats,
        },
        settlements: results[1] || [],
      });
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
    });
  },

  fmt(v) {
    return Number(v || 0).toFixed(2);
  },

  onWithdrawAmountInput(e) {
    this.setData({ withdrawAmount: e.detail.value });
  },

  onWithdrawDescInput(e) {
    this.setData({ withdrawDesc: e.detail.value });
  },

  onWithdraw() {
    var that = this;
    var amount = parseFloat(this.data.withdrawAmount);
    var desc = this.data.withdrawDesc.trim();
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入有效的提现金额', icon: 'none' });
      return;
    }
    if (!desc) {
      wx.showToast({ title: '请填写提现用途说明', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认提现',
      content: '确定发起平台提现 ¥' + amount.toFixed(2) + ' 吗？\n说明：' + desc,
      success: function (res) {
        if (res.confirm) {
          that.setData({ withdrawing: true });
          api.admin.finance.withdraw(amount, desc).then(function (r) {
            wx.showToast({ title: '提现记录已创建', icon: 'success' });
            that.setData({ withdrawing: false, withdrawAmount: '', withdrawDesc: '' });
            that.loadData();
          }).catch(function (err) {
            that.setData({ withdrawing: false });
            wx.showToast({ title: (err && err.message) || '提现失败', icon: 'none' });
          });
        }
      },
    });
  },
});
