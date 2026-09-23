const api = require('../../utils/api.js');

Page({
  data: {
    inviteCode: '',
    list: [],
    loading: true,
    showMenu: false,
    menuCircle: {},
  },

  onLoad() {
    this.loadMyCircles();
  },

  onShow() {
    if (this.data._loaded) this.loadMyCircles();
    this.setData({ _loaded: true });
  },

  loadMyCircles() {
    var token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ list: [], loading: false });
      return;
    }
    var that = this;
    this.setData({ loading: true });
    api.circle
      .myCircles()
      .then(function (list) {
        var decorated = (list || []).map(function (c) {
          var avatars = (c.memberAvatars || []).map(function (m) {
            return {
              avatar: m.avatar || '',
              letter: (m.name || '?').charAt(0),
            };
          });
          var mc = c.memberCount || 0;
          var extra = mc > 5 ? mc - 5 : 0;
          return {
            id: c.id,
            avatar: c.avatar || '',
            name: c.name,
            description: c.description || '这个圈子还没有简介',
            memberCount: mc,
            isOwner: c.myRole === 'owner',
            roleLabel: c.myRole === 'owner' ? '圈主' : '成员',
            inviteCode: c.inviteCode,
            activeGames: c.activeGames || 0,
            avatars: avatars,
            extraCount: extra,
          };
        });
        that.setData({ list: decorated, loading: false });
      })
      .catch(function (err) {
        that.setData({ list: [], loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  onCodeInput(e) {
    this.setData({ inviteCode: e.detail.value });
  },

  onJoinByCode() {
    var code = (this.data.inviteCode || '').trim().toUpperCase();
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    var token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    var that = this;
    // 先预览圈子信息再确认加入
    wx.showLoading({ title: '查询中...' });
    api.circle
      .previewByCode(code)
      .then(function (info) {
        wx.hideLoading();
        var name = (info && info.name) || '该圈子';
        wx.showModal({
          title: '加入圈子',
          content: '确认加入「' + name + '」？',
          success: function (res) {
            if (!res.confirm) return;
            wx.showLoading({ title: '加入中...' });
            api.circle
              .join(code)
              .then(function () {
                wx.hideLoading();
                wx.showToast({ title: '加入成功', icon: 'success' });
                that.setData({ inviteCode: '' });
                that.loadMyCircles();
              })
              .catch(function (err) {
                wx.hideLoading();
                wx.showToast({ title: (err && err.message) || '加入失败', icon: 'none' });
              });
          },
        });
      })
      .catch(function (err) {
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || '邀请码无效', icon: 'none' });
      });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    const code = e.currentTarget.dataset.code || '';
    wx.navigateTo({ url: `/pages/circle-detail/circle-detail?id=${id}&code=${code}` });
  },

  noop() {},

  // 打开卡片操作菜单
  onOpenCardMenu(e) {
    var idx = e.currentTarget.dataset.index;
    var c = this.data.list[idx];
    if (!c) return;
    this.setData({ showMenu: true, menuCircle: c });
  },
  closeCardMenu() { this.setData({ showMenu: false }); },

  onEnterFromMenu() {
    var c = this.data.menuCircle || {};
    this.setData({ showMenu: false });
    if (!c.id) return;
    wx.navigateTo({ url: `/pages/circle-detail/circle-detail?id=${c.id}&code=${c.inviteCode || ''}` });
  },

  onManageFromMenu() {
    var c = this.data.menuCircle || {};
    this.setData({ showMenu: false });
    if (!c.id) return;
    // 圈主进入详情页打开管理（详情页齿轮即管理入口）
    wx.navigateTo({ url: `/pages/circle-detail/circle-detail?id=${c.id}&code=${c.inviteCode || ''}` });
  },

  // 成员直接退出圈子
  onLeaveFromMenu() {
    var that = this;
    var c = this.data.menuCircle || {};
    if (!c.id) return;
    wx.showModal({
      title: '退出圈子',
      content: '确定要退出「' + (c.name || '该圈子') + '」吗？退出后将无法查看圈内动态和球局。',
      confirmText: '退出',
      confirmColor: '#C2410C',
      success: function (res) {
        if (!res.confirm) return;
        wx.showLoading({ title: '退出中...', mask: true });
        api.circle
          .leave(c.id)
          .then(function () {
            wx.hideLoading();
            wx.showToast({ title: '已退出', icon: 'success' });
            that.setData({ showMenu: false });
            that.loadMyCircles();
          })
          .catch(function (err) {
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || '退出失败', icon: 'none' });
          });
      },
    });
  },

  onCreateCircle() {
    var token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    var that = this;
    // 第一步：圈子名称
    wx.showModal({
      title: '创建圈子（1/2）',
      editable: true,
      placeholderText: '请输入圈子名称（2-50字）',
      success: function (res) {
        if (!res.confirm) return;
        var name = (res.content || '').trim();
        if (name.length < 2) {
          wx.showToast({ title: '圈子名称至少2字', icon: 'none' });
          return;
        }
        // 第二步：圈子说明（可留空）
        wx.showModal({
          title: '圈子说明（2/2）',
          editable: true,
          placeholderText: '一句话介绍圈子（可留空，后续可改）',
          confirmText: '创建',
          success: function (res2) {
            if (!res2.confirm) return;
            var desc = (res2.content || '').trim();
            that.doCreateCircle(name, desc);
          },
        });
      },
    });
  },

  doCreateCircle(name, desc) {
    var that = this;
    wx.showLoading({ title: '创建中...' });
    api.circle
      .create(name, desc || '')
      .then(function (r) {
        wx.hideLoading();
        wx.showModal({
          title: '创建成功',
          content: '圈子邀请码：' + (r.inviteCode || '') + '\n分享给球友即可加入',
          showCancel: false,
        });
        that.loadMyCircles();
      })
      .catch(function (err) {
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || '创建失败', icon: 'none' });
      });
  },
});
