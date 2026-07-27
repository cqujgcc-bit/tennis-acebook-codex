// 赛后结算 / 账单支付页
// mode=settle：发起人填实际总开销 + 勾选缺席者（默认全员到场）→ 平摊生成账单
// mode=bill：查看账单（已付/未付清单），成员支付自己那份
const api = require('../../utils/api.js');

Page({
  data: {
    activityId: 0,
    mode: 'settle',
    loading: true,
    info: null,          // getActivitySettlement 返回
    members: [],         // 报名成员（结算前用于勾选缺席）
    totalCost: '',       // 发起人输入的实际总开销（元）
    perPersonPreview: '', // 预览人均
    attendeeCount: 0,
    submitting: false,
  },

  onLoad: function (options) {
    this.setData({
      activityId: Number(options.activityId || 0),
      mode: options.mode || 'settle',
    });
    wx.setNavigationBarTitle({ title: options.mode === 'bill' ? '活动账单' : '赛后结算' });
  },

  onShow: function () { this.load(); },

  load: function () {
    var that = this;
    this.setData({ loading: true });
    api.circle.getActivitySettlement(this.data.activityId).then(function (info) {
      if (!info) { that.setData({ loading: false }); return; }
      var members = (info.bills || []).map(function (b) {
        return Object.assign({}, b, {
          attendChecked: b.attended !== false, // 默认全员到场
          shareYuan: b.shareAmount ? (b.shareAmount / 100).toFixed(2) : '0.00',
        });
      });
      that.setData({
        info: Object.assign({}, info, { totalCostYuan: info.totalCost ? (info.totalCost / 100).toFixed(2) : '' }),
        members: members,
        loading: false,
      });
      that.recalcPreview();
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
    });
  },

  // ── 结算模式：勾选到场 ──
  onToggleAttend: function (e) {
    var idx = Number(e.currentTarget.dataset.idx);
    var key = 'members[' + idx + '].attendChecked';
    var obj = {}; obj[key] = !this.data.members[idx].attendChecked;
    this.setData(obj);
    this.recalcPreview();
  },

  onCostInput: function (e) {
    this.setData({ totalCost: e.detail.value });
    this.recalcPreview();
  },

  recalcPreview: function () {
    var cost = parseFloat(this.data.totalCost);
    var attendees = this.data.members.filter(function (m) { return m.attendChecked; }).length;
    if (!cost || cost <= 0 || attendees === 0) {
      this.setData({ perPersonPreview: '', attendeeCount: attendees });
      return;
    }
    this.setData({
      perPersonPreview: (cost / attendees).toFixed(2),
      attendeeCount: attendees,
    });
  },

  onConfirmSettle: function () {
    var that = this;
    var cost = parseFloat(this.data.totalCost);
    if (!cost || cost <= 0) { wx.showToast({ title: '请输入实际总开销', icon: 'none' }); return; }
    var absentUserIds = this.data.members.filter(function (m) { return !m.attendChecked; })
      .map(function (m) { return m.userId; });
    var attendees = this.data.members.length - absentUserIds.length;
    if (attendees === 0) { wx.showToast({ title: '至少需1人到场', icon: 'none' }); return; }
    wx.showModal({
      title: '确认结算',
      content: '实际总开销 ¥' + cost.toFixed(2) + '，' + attendees + ' 人到场，人均约 ¥' + (cost / attendees).toFixed(2) + '。确认后将向到场成员下发账单。',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ submitting: true });
        wx.showLoading({ title: '结算中', mask: true });
        api.circle.settleActivity({
          activityId: that.data.activityId,
          totalCost: cost,
          absentUserIds: absentUserIds,
        }).then(function (r) {
          wx.hideLoading();
          that.setData({ submitting: false });
          wx.showToast({ title: '结算完成', icon: 'success' });
          that.setData({ mode: 'bill' });
          that.load();
        }).catch(function (err) {
          wx.hideLoading();
          that.setData({ submitting: false });
          wx.showToast({ title: (err && err.message) || '结算失败', icon: 'none' });
        });
      }
    });
  },

  // ── 账单模式：成员支付自己那份 ──
  onPay: function () {
    var that = this;
    wx.showLoading({ title: '发起支付', mask: true });
    api.circle.payActivityShare(this.data.activityId).then(function (res) {
      wx.hideLoading();
      if (res && res.isMockMode) {
        // 测试环境：直接确认支付
        api.circle.confirmActivityPayment(res.orderId, that.data.activityId).then(function () {
          wx.showToast({ title: '支付成功(测试)', icon: 'success' });
          that.load();
        });
        return;
      }
      // 生产：拉起微信支付
      wx.requestPayment({
        timeStamp: res.timeStamp,
        nonceStr: res.nonceStr,
        package: res.package,
        signType: res.signType || 'RSA',
        paySign: res.paySign,
        success: function () {
          wx.showToast({ title: '支付成功', icon: 'success' });
          setTimeout(function () { that.load(); }, 1000);
        },
        fail: function () {
          wx.showToast({ title: '支付已取消', icon: 'none' });
        }
      });
    }).catch(function (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '支付失败', icon: 'none' });
    });
  },
});
