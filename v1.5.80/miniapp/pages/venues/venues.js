const { BOOKING_APPS } = require('../../utils/venues.js');
const api = require('../../utils/api.js');

// 后端返回字段（name/appId/description/emoji）→ 前端展示字段（name/appid/desc/emoji）
function normalize(item) {
  return {
    id: item.appKey || item.id,
    name: item.name,
    desc: item.description || '',
    appid: item.appId || item.appid,
    emoji: item.emoji || '🎾',
  };
}

Page({
  data: {
    bookingApps: BOOKING_APPS, // 先用本地兜底渲染，避免白屏
  },

  onLoad() {
    this.loadFromServer();
  },

  // 优先从后端读取（管理员可在后台调整顺序/上下架），失败则保留本地兜底
  loadFromServer() {
    var that = this;
    api.venue
      .bookingApps()
      .then(function (list) {
        if (Array.isArray(list) && list.length) {
          that.setData({ bookingApps: list.map(normalize) });
        }
      })
      .catch(function () {
        // 静默失败，继续使用本地 BOOKING_APPS
      });
  },

  // 点击官方预订平台 → 跳转对应小程序
  onOpenApp(e) {
    const id = e.currentTarget.dataset.id;
    const app = (this.data.bookingApps || []).find(a => a.id === id);
    if (!app || !app.appid) return;
    wx.navigateToMiniProgram({
      appId: app.appid,
      fail: () => {
        wx.showModal({
          title: app.name,
          content: '跳转未成功。请确认该小程序已在微信后台「跳转小程序」名单中登记，或在微信中手动搜索「' + app.name + '」小程序预订。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  }
});
