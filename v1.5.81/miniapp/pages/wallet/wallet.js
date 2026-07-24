const api = require('../../utils/api.js');

Page({
  data: {
    loading: true,
    tab: 'income', // income=结算收入 / expense=我的支付
    totalSettled: '0.00',
    totalPending: '0.00',
    settledSettlements: [],
    pendingSettlements: [],
    disputedSettlements: [],
    paidOrders: [],
    refundedOrders: [],
    topupList: [],
    totalTopup: '0.00',
  },

  onShow() {
    var token = wx.getStorageSync('token');
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    this.loadWallet();
  },

  switchTab(e) {
    var tab = e.currentTarget.dataset.tab;
    if (tab && tab !== this.data.tab) this.setData({ tab: tab });
  },

  fmtAmount(v) {
    var n = Number(v || 0);
    return n.toFixed(2);
  },

  // 格式化：日期 + 标题
  decorate(list) {
    var that = this;
    return (list || []).map(function (it) {
      var date = (it.matchDate || '').slice(0, 10).replace(/-/g, '/');
      var when = it.settledAt || it.confirmedAt || it.paidAt || it.refundedAt || '';
      var whenStr = '';
      if (when) {
        try {
          var d = new Date(String(when).replace(/-/g, '/').replace('T', ' ').replace(/\..*$/, ''));
          if (!isNaN(d.getTime())) {
            var mm = ('0' + (d.getMonth() + 1)).slice(-2);
            var dd = ('0' + d.getDate()).slice(-2);
            var hh = ('0' + d.getHours()).slice(-2);
            var mi = ('0' + d.getMinutes()).slice(-2);
            whenStr = mm + '/' + dd + ' ' + hh + ':' + mi;
          }
        } catch (e) {}
      }
      return Object.assign({}, it, {
        title: it.matchTitle || ('球局 #' + it.matchId),
        matchDateStr: date,
        whenStr: whenStr,
        amountStr: that.fmtAmount(it.netAmount != null ? it.netAmount : it.amount),
      });
    });
  },

  loadWallet() {
    var that = this;
    this.setData({ loading: true });
    api.match
      .myWallet()
      .then(function (r) {
        r = r || {};
        var settled = that.decorate(r.settledSettlements);
        var pending = that.decorate(r.pendingSettlements);
        var disputed = that.decorate(r.disputedSettlements);
        var paid = that.decorate(r.paidOrders);
        var refunded = that.decorate(r.refundedOrders);
        var totalSettled = settled.reduce(function (s, it) { return s + Number(it.netAmount || 0); }, 0);
        var totalPending = pending.reduce(function (s, it) { return s + Number(it.netAmount || 0); }, 0);
        var topupList = (r.topupPending || []).map(function (t) {
          var date = (t.matchDate || '').slice(0, 10).replace(/-/g, '/');
          return Object.assign({}, t, {
            title: t.matchTitle || ('球局 #' + t.matchId),
            matchDateStr: date,
            amountStr: that.fmtAmount(t.topupAmount),
          });
        });
        var totalTopup = topupList.reduce(function (s, it) { return s + Number(it.topupAmount || 0); }, 0);
        that.setData({
          loading: false,
          settledSettlements: settled,
          pendingSettlements: pending,
          disputedSettlements: disputed,
          paidOrders: paid,
          refundedOrders: refunded,
          topupList: topupList,
          totalTopup: totalTopup.toFixed(2),
          totalSettled: totalSettled.toFixed(2),
          totalPending: totalPending.toFixed(2),
        });
      })
      .catch(function (err) {
        that.setData({ loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  onGoDetail(e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/game-detail/game-detail?id=' + id });
  },

  // 去补缴
  onGoTopup(e) {
    var ds = e.currentTarget.dataset;
    if (!ds.id) return;
    wx.navigateTo({ url: '/pages/topup-pay/topup-pay?id=' + ds.id + '&amount=' + (ds.amount || '') + '&title=' + encodeURIComponent(ds.title || '') });
  },

  onRetrySettlement(e) {
    var matchId = e.currentTarget.dataset.matchId;
    var that = this;
    wx.showModal({
      title: '重新打款',
      content: '对此球局重新发起打款到您的微信零钱？',
      success: function (r) {
        if (!r.confirm) return;
        wx.showLoading({ title: '打款中...' });
        api.match.retrySettlement(matchId).then(function (res) {
          wx.hideLoading();
          wx.showToast({ title: (res && res.message) || '打款成功', icon: 'success' });
          that.loadWallet();
        }).catch(function (err) {
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || '打款失败', icon: 'none' });
        });
      },
    });
  },
});
