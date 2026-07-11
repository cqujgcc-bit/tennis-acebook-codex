const api = require('../../utils/api.js');

function decorate(list) {
  return (list || []).map(function (c) {
    var locations = [];
    if (c.venues && c.venues.length) {
      locations = c.venues.map(function (v) { return (v.venue && (v.venue.area || v.venue.name)) || ''; }).filter(Boolean);
    }
    var price = parseFloat(c.pricePerHour || 0);
    return {
      id: c.id,
      name: c.displayName || '教练',
      rating: c.avgRating || '5.0',
      level: (c.yearsExperience ? c.yearsExperience + '年教龄' : '认证教练') + (c.isVerified ? ' · 已认证' : ''),
      intro: c.tagline || (c.bio ? c.bio.slice(0, 40) : ''),
      tags: (c.specialties || []).slice(0, 4),
      locations: locations.length ? locations : ['深圳'],
      pricePerHour: price > 0 ? price : '面议',
    };
  });
}

Page({
  data: {
    coaches: [],
    loading: true,
  },

  onLoad() {
    this.loadCoaches();
  },

  loadCoaches() {
    var that = this;
    this.setData({ loading: true });
    api.coach
      .list({ limit: 50 })
      .then(function (list) {
        that.setData({ coaches: decorate(list), loading: false });
      })
      .catch(function (err) {
        that.setData({ coaches: [], loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  onCoachTap() {
    wx.showToast({ title: '教练详情开发中', icon: 'none' });
  },
});
