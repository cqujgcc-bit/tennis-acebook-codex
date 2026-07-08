// 圈内活动列表页：报名占位（无定金）/ 发起人结算入口 / 成员待付账单
const api = require('../../utils/api.js');

Page({
  data: {
    circleId: 0,
    circleName: '',
    isOwner: false,
    myUserId: 0,
    activities: [],
    loading: true,
  },

  onLoad: function (options) {
    var circleId = Number(options.circleId || 0);
    var circleName = options.circleName ? decodeURIComponent(options.circleName) : '圈子活动';
    var app = getApp();
    var myUserId = (app && app.globalData && app.globalData.userInfo && app.globalData.userInfo.id) || 0;
    this.setData({
      circleId: circleId,
      circleName: circleName,
      isOwner: options.isOwner === '1' || options.isOwner === 'true',
      myUserId: myUserId,
    });
    wx.setNavigationBarTitle({ title: circleName });
  },

  onShow: function () {
    if (this.data.circleId) {
      this.loadActivities();
    }
  },

  onPullDownRefresh: function () {
    this.loadActivities(function () {
      wx.stopPullDownRefresh();
    });
  },

  loadActivities: function (cb) {
    var that = this;
    this.setData({ loading: true });
    api.circle.getActivities(this.data.circleId).then(function (list) {
      var now = Date.now();
      var activities = (list || []).map(function (a) {
        var dateStr = a.activityDate || '';
        var timeStr = (a.startTime || '') + (a.endTime ? ('-' + a.endTime) : '');
        // 活动开始时间（用于判断是否可结算）
        var startTs = 0;
        if (dateStr) {
          var t = (dateStr + ' ' + (a.startTime || '00:00')).replace(/-/g, '/');
          startTs = new Date(t).getTime() || 0;
        }
        var isAA = a.feeMode === 'aa';
        return Object.assign({}, a, {
          dateStr: dateStr,
          timeStr: timeStr,
          isAA: isAA,
          feeLabel: isAA ? 'AA结算' : '免费',
          settleLabel: a.settleStatus === 'settled' ? '已结算' : (a.settleStatus === 'settling' ? '待支付' : ''),
          isCreator: a.creatorId === that.data.myUserId,
          isPast: startTs > 0 && startTs <= now,
          totalCostYuan: a.totalCost ? (a.totalCost / 100).toFixed(2) : '',
        });
      });
      that.setData({ activities: activities, loading: false });
      if (typeof cb === 'function') cb();
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      if (typeof cb === 'function') cb();
    });
  },

  // 报名 / 取消报名（无定金，仅占名额）
  onToggleSignup: function (e) {
    var that = this;
    var activityId = Number(e.currentTarget.dataset.id);
    var isSigned = e.currentTarget.dataset.signed;
    if (isSigned) {
      wx.showModal({
        title: '取消报名',
        content: '确定取消报名该活动吗？',
        success: function (res) {
          if (res.confirm) that.doSignup(activityId);
        }
      });
    } else {
      this.doSignup(activityId);
    }
  },

  doSignup: function (activityId) {
    var that = this;
    wx.showLoading({ title: '处理中', mask: true });
    api.circle.signupActivity(activityId).then(function (res) {
      wx.hideLoading();
      wx.showToast({ title: res && res.signed === false ? '已取消报名' : '报名成功', icon: 'success' });
      that.loadActivities();
    }).catch(function (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
    });
  },

  // 发起人：进入结算页
  onSettle: function (e) {
    var activityId = Number(e.currentTarget.dataset.id);
    wx.navigateTo({ url: '/pages/activity-settle/activity-settle?activityId=' + activityId + '&mode=settle' });
  },

  // 成员/发起人：查看账单与支付
  onViewBill: function (e) {
    var activityId = Number(e.currentTarget.dataset.id);
    wx.navigateTo({ url: '/pages/activity-settle/activity-settle?activityId=' + activityId + '&mode=bill' });
  },

  // 发起活动
  onCreate: function () {
    wx.navigateTo({
      url: '/pages/activity-create/activity-create?circleId=' + this.data.circleId +
        '&circleName=' + encodeURIComponent(this.data.circleName)
    });
  },
});
