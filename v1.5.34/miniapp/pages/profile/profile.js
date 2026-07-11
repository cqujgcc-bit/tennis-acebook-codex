const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    user: { nickname: '未登录', level: '', city: '', bio: '', gamesCount: 0, circlesCount: 0, hoursCount: 0, creditScore: '--' },
    isLogin: false,
    unreadCount: 0,
    isAdmin: false,
  },

  onShow() {
    var token = wx.getStorageSync('token');
    if (!token) {
      this.setData({
        isLogin: false,
        user: { nickname: '未登录', level: '', city: '点击登录', bio: '', gamesCount: 0, circlesCount: 0, hoursCount: 0 },
      });
      return;
    }
    var info = wx.getStorageSync('userInfo') || {};
    this.setData({ isLogin: true, isAdmin: info.role === 'admin' });
    this.loadProfile();
    this.loadUnread();
    // 从关于页返回时自动打开反馈弹窗
    if (wx.getStorageSync('openFeedback')) {
      wx.removeStorageSync('openFeedback');
      var self = this;
      setTimeout(function () { self.onFeedback(); }, 300);
    }
  },

  loadUnread() {
    var that = this;
    api.notification
      .unreadCount()
      .then(function (r) {
        var n = (r && r.count) || 0;
        that.setData({ unreadCount: n });
        try {
          if (n > 0) {
            wx.setTabBarBadge({ index: 4, text: String(n > 99 ? '99+' : n) });
          } else {
            wx.removeTabBarBadge({ index: 4 });
          }
        } catch (e) {}
      })
      .catch(function () {});
  },

  // 管理后台
  onAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  // 我的钱包
  onWallet() {
    if (!this.data.isLogin) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    wx.navigateTo({ url: '/pages/wallet/wallet' });
  },

  onNotifications() {
    if (!this.data.isLogin) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    wx.navigateTo({ url: '/pages/notifications/notifications' });
  },

  loadProfile() {
    var stored = wx.getStorageSync('userInfo') || {};
    var that = this;
    // 基础信息先用本地缓存渲染
    this.setData({
      user: {
        nickname: stored.name || '球友',
        level: stored.ntrpLevel || stored.tennisLevel || '',
        city: stored.city || '',
        avatar: stored.avatar || '',
        gender: stored.gender || '',
        genderIcon: stored.gender === 'male' ? '♂' : (stored.gender === 'female' ? '♀' : ''),
        bio: '',
        gamesCount: 0,
        circlesCount: 0,
        hoursCount: 0,
      },
    });
    // 拉取真实统计
    api.user
      .myStats()
      .then(function (stats) {
        var u = that.data.user;
        u.gamesCount = (stats && stats.matchCount) || 0;
        u.hoursCount = (stats && stats.coachLessons) || 0;
        that.setData({ user: u });
      })
      .catch(function () {});
    // 拉取加入圈子数
    api.circle
      .myCircles()
      .then(function (list) {
        var u = that.data.user;
        u.circlesCount = (list || []).length;
        that.setData({ user: u });
      })
      .catch(function () {});
    // 拉取信用分（仅自己可见）
    api.user
      .getCreditLogs()
      .then(function (res) {
        var u = that.data.user;
        var score = res && res.creditScore;
        u.creditScore = (score === undefined || score === null) ? 100 : score;
        that._creditLogs = (res && res.logs) || [];
        that.setData({ user: u });
      })
      .catch(function () {});
  },

  // 我的信用分（仅自己可见）
  onCredit() {
    if (!this.data.isLogin) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    var score = this.data.user.creditScore;
    var logs = this._creditLogs || [];
    var detail = '';
    if (logs.length) {
      detail = '\n\n最近记录：\n' + logs.slice(0, 5).map(function (l) {
        var delta = (l.delta > 0 ? '+' : '') + l.delta;
        return '• ' + (l.reason || '变动') + ' ' + delta;
      }).join('\n');
    }
    wx.showModal({
      title: '我的信用分：' + score,
      content: '信用分仅自己可见，其他球友看不到。按时参与球局会逐步恢复，迟到/临时取消会扣分。' + detail,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#0B3D2E',
    });
  },

  // 更换头像（chooseAvatar 回调）
  onChooseAvatar(e) {
    var avatarUrl = (e && e.detail && e.detail.avatarUrl) || '';
    if (!avatarUrl) return;
    var that = this;
    wx.showLoading({ title: '上传中...' });
    api.upload
      .image(avatarUrl)
      .then(function (url) {
        return api.user.updateProfile({ avatar: url }).then(function () { return url; });
      })
      .then(function (url) {
        wx.hideLoading();
        wx.showToast({ title: '头像已更新', icon: 'success' });
        var stored = wx.getStorageSync('userInfo') || {};
        stored.avatar = url;
        wx.setStorageSync('userInfo', stored);
        if (app.globalData) app.globalData.userInfo = stored;
        that.loadProfile();
      })
      .catch(function (err) {
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || '更新失败', icon: 'none' });
      });
  },

  // 修改性别
  editGender() {
    var that = this;
    var opts = ['男', '女', '保密'];
    var vals = ['male', 'female', null];
    wx.showActionSheet({
      itemList: opts,
      success: function (res) {
        var g = vals[res.tapIndex];
        wx.showLoading({ title: '保存中...' });
        api.user
          .updateProfile({ gender: g })
          .then(function () {
            wx.hideLoading();
            wx.showToast({ title: '已保存', icon: 'success' });
            var stored = wx.getStorageSync('userInfo') || {};
            stored.gender = g;
            wx.setStorageSync('userInfo', stored);
            that.loadProfile();
          })
          .catch(function (err) {
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
          });
      },
    });
  },

  // 编辑资料（昵称/城市/性别/网球水平）
  onEditProfile() {
    if (!this.data.isLogin) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    var that = this;
    wx.showActionSheet({
      itemList: ['修改昵称', '修改性别', '修改城市', '修改网球水平(NTRP)'],
      success: function (res) {
        var idx = res.tapIndex;
        // 不能在一个 ActionSheet 的回调里立即弹出另一个 ActionSheet/Modal（真机会被忽略），延时打开
        setTimeout(function () {
          if (idx === 0) that.editField('name', '请输入昵称');
          else if (idx === 1) that.editGender();
          else if (idx === 2) that.editField('city', '请输入城市');
          else if (idx === 3) that.editNtrp();
        }, 350);
      },
    });
  },

  editField(field, ph) {
    var that = this;
    wx.showModal({
      title: '修改',
      editable: true,
      placeholderText: ph,
      success: function (res) {
        if (!res.confirm) return;
        var val = (res.content || '').trim();
        if (!val) return;
        var payload = {};
        payload[field] = val;
        wx.showLoading({ title: '保存中...' });
        api.user
          .updateProfile(payload)
          .then(function () {
            wx.hideLoading();
            wx.showToast({ title: '已保存', icon: 'success' });
            var stored = wx.getStorageSync('userInfo') || {};
            stored[field] = val;
            wx.setStorageSync('userInfo', stored);
            that.loadProfile();
          })
          .catch(function (err) {
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
          });
      },
    });
  },

  editNtrp() {
    var that = this;
    // 与登录页一致的 6 档（通俗名 + NTRP 数值）
    var levels = [
      { v: 2.0, t: '初学者 (NTRP 2.0)' },
      { v: 2.5, t: '入门 (NTRP 2.5)' },
      { v: 3.0, t: '进阶 (NTRP 3.0)' },
      { v: 3.5, t: '中级 (NTRP 3.5)' },
      { v: 4.0, t: '熟练 (NTRP 4.0)' },
      { v: 4.5, t: '高级 (NTRP 4.5)' },
    ];
    wx.showActionSheet({
      itemList: levels.map(function (l) { return l.t; }),
      success: function (res) {
        var ntrp = levels[res.tapIndex].v;
        wx.showLoading({ title: '保存中...' });
        api.user
          .updateNtrpLevel(ntrp)
          .then(function () {
            wx.hideLoading();
            wx.showToast({ title: '已保存', icon: 'success' });
            var stored = wx.getStorageSync('userInfo') || {};
            stored.ntrpLevel = String(ntrp);
            wx.setStorageSync('userInfo', stored);
            that.loadProfile();
          })
          .catch(function (err) {
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
          });
      },
    });
  },

  onMenu(e) {
    const name = e.currentTarget.dataset.name;
    if (name === '意见反馈') {
      this.onFeedback();
      return;
    }
    if (name === '关于') {
      wx.navigateTo({ url: '/pages/about/about' });
      return;
    }
    if (name === '我的球局') {
      if (!this.data.isLogin) { wx.navigateTo({ url: '/pages/login/login' }); return; }
      wx.navigateTo({ url: '/pages/my-matches/my-matches' });
      return;
    }
    wx.showToast({ title: `${name}开发中`, icon: 'none' });
  },

  // 意见反馈
  onFeedback() {
    if (!this.data.isLogin) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    var that = this;
    wx.showModal({
      title: '意见反馈',
      editable: true,
      placeholderText: '请输入您的建议或遇到的问题',
      success: function (res) {
        if (!res.confirm) return;
        var content = (res.content || '').trim();
        if (!content) {
          wx.showToast({ title: '反馈内容不能为空', icon: 'none' });
          return;
        }
        wx.showLoading({ title: '提交中...' });
        api.feedback
          .submit(content, '', 'suggestion')
          .then(function () {
            wx.hideLoading();
            wx.showToast({ title: '反馈已提交，感谢', icon: 'success' });
          })
          .catch(function (err) {
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
          });
      },
    });
  },

  onBookCourt() {
    // 跳转找场地页（内含官方预订平台直达 + 场馆列表）
    wx.navigateTo({
      url: '/pages/venues/venues',
      fail: function () {
        wx.showToast({ title: '页面不存在', icon: 'none' });
      },
    });
  },

  onLogout() {
    if (!this.data.isLogin) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    var that = this;
    wx.showModal({
      title: '提示',
      content: '确认退出登录？',
      confirmColor: '#3a7d5d',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          app.globalData.isLogin = false;
          app.globalData.userInfo = null;
          that.setData({
            isLogin: false,
            user: { nickname: '未登录', level: '', city: '点击登录', bio: '', gamesCount: 0, circlesCount: 0, hoursCount: 0 },
          });
          wx.switchTab({ url: '/pages/index/index' });
        }
      },
    });
  },
});
