Page({
  data: {
    version: '1.1.8',
  },

  // 跳转意见反馈（回到我的页触发反馈弹窗）
  onFeedback() {
    var token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    // 通过缓存标记，让 profile onShow 自动打开反馈弹窗
    wx.setStorageSync('openFeedback', true);
    wx.switchTab({ url: '/pages/profile/profile' });
  },
});
