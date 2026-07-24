var api = require('../../utils/api.js');

Page({
  data: {
    matchId: 0,
    loading: true,
    paying: false,
    done: false,
    title: '',
    topupYuan: '0.00'
  },

  onLoad: function (opts) {
    var id = Number(opts.id || opts.matchId || 0);
    var amt = opts.amount ? Number(opts.amount) : 0;
    var title = opts.title ? decodeURIComponent(opts.title) : '球局补缴';
    this.setData({ matchId: id, title: title });
    if (amt > 0) {
      this.setData({ loading: false, topupYuan: amt.toFixed(2) });
    } else {
      this.loadFromDetail(id);
    }
  },

  // 兜底：未带 amount 时，从球局详情读取我的待补缴
  loadFromDetail: function (id) {
    var that = this;
    api.match.getById(id).then(function (res) {
      var m = (res && res.match) ? res.match : {};
      var mine = res && res.myParticipation ? res.myParticipation : null;
      var topup = mine && mine.topupAmount ? Number(mine.topupAmount) : 0;
      that.setData({ loading: false, title: m.title || '球局补缴', topupYuan: topup.toFixed(2) });
    }).catch(function () {
      that.setData({ loading: false });
    });
  },

  onPay: function () {
    if (this.data.paying) return;
    var that = this;
    var matchId = this.data.matchId;
    this.setData({ paying: true });
    wx.showLoading({ title: '发起支付...', mask: true });
    api.match.payTopup(matchId).then(function (order) {
      wx.hideLoading();
      // Mock 模式：直接确认
      if (order && order.isMockMode) {
        wx.showLoading({ title: '确认支付...', mask: true });
        return api.match.confirmTopup(order.orderId, matchId).then(function () {
          wx.hideLoading();
          that.onPaid();
        });
      }
      // 真实微信支付
      var payPackage = order.package || order.packageStr;
      that.setData({ paying: false });
      wx.requestPayment({
        timeStamp: String(order.timeStamp),
        nonceStr: order.nonceStr,
        package: payPackage,
        signType: order.signType || 'RSA',
        paySign: order.paySign,
        success: function () {
          setTimeout(function () { that.onPaid(); }, 1500);
        },
        fail: function (e) {
          var msg = (e && e.errMsg) ? e.errMsg : '';
          if (msg.indexOf('cancel') >= 0) {
            wx.showToast({ title: '支付已取消', icon: 'none' });
          } else {
            wx.showToast({ title: '支付失败，请重试', icon: 'none' });
          }
        }
      });
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ paying: false });
      wx.showToast({ title: (err && err.message) || '发起支付失败', icon: 'none' });
    });
  },

  onPaid: function () {
    var that = this;
    this.setData({ paying: false, done: true });
    wx.showToast({ title: '补缴成功', icon: 'success' });
    var pages = getCurrentPages();
    var prev = pages[pages.length - 2];
    if (prev && typeof prev.loadDetail === 'function') { prev.loadDetail(); }
    if (prev && typeof prev.loadWallet === 'function') { prev.loadWallet(); }
    setTimeout(function () { wx.navigateBack(); }, 1500);
  }
});
