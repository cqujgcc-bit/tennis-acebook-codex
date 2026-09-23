var api = require('../../utils/api.js');

Page({
  data: {
    token: '',
    loading: true,
    status: '', // pending / accepted / expired
    match: null,
    fromUser: null,
    accepting: false,
    paying: false,
  },

  onLoad(options) {
    var token = options.token || '';
    this.setData({ token: token });
    if (!token) {
      this.setData({ loading: false, status: 'expired' });
      return;
    }
    this.loadInvite();
  },

  loadInvite() {
    var that = this;
    this.setData({ loading: true });
    api.match.getReplaceInvite(this.data.token).then(function (res) {
      var m = res.match || null;
      var match = null;
      if (m) {
        var feeRequired = !!m.feeRequired && Number(m.feePerPerson || 0) > 0;
        match = {
          id: m.id,
          title: m.title,
          courtName: m.venueName || m.courtName || '',
          district: m.venueAddress || m.district || '',
          date: m.matchDate || '',
          startTime: m.startTime || '',
          endTime: m.endTime || '',
          levelRange: m.levelRange || '水平不限',
          feeRequired: feeRequired,
          feePerPerson: parseFloat(m.feePerPerson || 0),
        };
      }
      that.setData({
        loading: false,
        status: res.status || 'pending',
        match: match,
        fromUser: res.fromUser || null,
      });
    }).catch(function (err) {
      that.setData({ loading: false, status: 'expired' });
      wx.showToast({ title: (err && err.message) || '邀请无效', icon: 'none' });
    });
  },

  // 接受接位
  onAccept() {
    var token = wx.getStorageSync('token');
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    if (this.data.accepting) return;
    var that = this;
    var match = this.data.match || {};
    var tip = match.feeRequired
      ? '接位后您将顶替对方的位置，需在线支付场地费 ¥' + match.feePerPerson + '。确认接位？'
      : '接位后您将顶替对方的位置加入球局。确认接位？';
    wx.showModal({
      title: '确认接位',
      content: tip,
      confirmText: '确认接位',
      confirmColor: '#0B3D2E',
      success: function (res) {
        if (!res.confirm) return;
        that.doAccept();
      },
    });
  },

  doAccept() {
    var that = this;
    this.setData({ accepting: true });
    wx.showLoading({ title: '接位中...', mask: true });
    api.match.acceptReplaceInvite(this.data.token).then(function (r) {
      wx.hideLoading();
      that.setData({ accepting: false });
      if (r && r.needsPay) {
        // 收费局：接位成功后拉起支付
        that.startPay(r.matchId);
      } else {
        wx.showToast({ title: '接位成功', icon: 'success' });
        that.goDetail(r && r.matchId);
      }
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ accepting: false });
      wx.showToast({ title: (err && err.message) || '接位失败', icon: 'none' });
      that.loadInvite();
    });
  },

  // 接位成功后支付场地费
  startPay(matchId) {
    var that = this;
    if (!matchId) { this.goDetail(matchId); return; }
    this.setData({ paying: true });
    wx.showLoading({ title: '发起支付...', mask: true });
    api.match.createPayOrder(matchId).then(function (order) {
      wx.hideLoading();
      if (order && order.isMockMode) {
        wx.showLoading({ title: '确认支付...', mask: true });
        return api.match.confirmPayment(order.orderId, matchId).then(function () {
          wx.hideLoading();
          that.setData({ paying: false });
          wx.showToast({ title: '接位并支付成功', icon: 'success' });
          that.goDetail(matchId);
        });
      }
      return new Promise(function (resolve) {
        wx.requestPayment({
          timeStamp: String(order.timeStamp),
          nonceStr: order.nonceStr,
          package: order.package || order.packageStr,
          signType: order.signType || 'RSA',
          paySign: order.paySign,
          success: function () {
            that.setData({ paying: false });
            wx.showToast({ title: '接位并支付成功', icon: 'success' });
            setTimeout(function () { that.goDetail(matchId); }, 1500);
            resolve();
          },
          fail: function () {
            that.setData({ paying: false });
            wx.showToast({ title: '已接位，场地费可在球局详情页继续支付', icon: 'none' });
            that.goDetail(matchId);
            resolve();
          },
        });
      });
    }).catch(function () {
      wx.hideLoading();
      that.setData({ paying: false });
      wx.showToast({ title: '已接位，场地费可在球局详情页继续支付', icon: 'none' });
      that.goDetail(matchId);
    });
  },

  goDetail(matchId) {
    if (!matchId) { wx.navigateBack(); return; }
    wx.redirectTo({ url: '/pages/game-detail/game-detail?id=' + matchId });
  },
});
