// app.js
App({
  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.isLogin = true;
      this.globalData.userInfo = wx.getStorageSync('userInfo') || null;
      // 启动时静默校验登录态：若 token 已失效，自动用 wx.login 续期，用户无感
      this.refreshSessionIfNeeded();
    }
  },

  // 校验当前登录态，失效则静默续期（不弹登录页）
  refreshSessionIfNeeded() {
    const api = require('./utils/api.js');
    // 调一个轻量受保护接口探测；失效时 request.js 会自动静默重登并重试
    api.auth
      .me()
      .then((u) => {
        if (u) {
          this.globalData.isLogin = true;
          // 合并最新用户信息到本地缓存
          const info = wx.getStorageSync('userInfo') || {};
          const merged = Object.assign({}, info, u);
          this.globalData.userInfo = merged;
          wx.setStorageSync('userInfo', merged);
        }
      })
      .catch(() => {
        // 探测失败（含静默重登也失败）：保持现状，由具体操作时再引导登录
      });
  },

  globalData: {
    isLogin: false,
    userInfo: null,
    primaryColor: '#3a7d5d',
    apiBaseUrl: 'https://tennispro.cn',
  },
});

// v1.5.34 活动取消功能 - 前端同步
