const app = getApp();
const api = require('../../utils/api.js');

// 网球水平选项（NTRP 标准对照，通俗描述 + 数值）
const NTRP_OPTIONS = [
  { value: 2.0, label: '初学者', desc: '刚接触/能颠球，正在打基础' },
  { value: 2.5, label: '入门',   desc: '能慢速对拉几拍，落点不稳' },
  { value: 3.0, label: '进阶',   desc: '正反手较稳定，能完成一局' },
  { value: 3.5, label: '中级',   desc: '有一定旋转和落点控制' },
  { value: 4.0, label: '熟练',   desc: '攻防转换好，能打比赛' },
  { value: 4.5, label: '高级',   desc: '技术全面，常打竞技比赛' },
];

Page({
  data: {
    logging: false,
    // 完善资料弹层
    showProfile: false,
    saving: false,
    form: { nickname: '', avatar: '', gender: '', ntrpLevel: '' }, // gender: 'male' | 'female' | '' (保密); ntrpLevel: number | ''
    ntrpOptions: NTRP_OPTIONS,
  },

  // 微信一键登录（点击即触发 getPhoneNumber 授权，一步完成登录+绑定手机号）
  handleWechatLogin(e) {
    if (this.data.logging) return;

    const detail = (e && e.detail) || {};
    const phoneCode =
      detail.code && detail.errMsg && detail.errMsg.indexOf('ok') >= 0
        ? detail.code
        : '';

    this.setData({ logging: true });
    wx.showLoading({ title: '登录中...' });

    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.loginFail('获取微信授权失败');
          return;
        }
        this.doWechatLogin(loginRes.code, phoneCode);
      },
      fail: () => this.loginFail('微信登录失败，请重试'),
    });
  },

  doWechatLogin(code, phoneCode) {
    api.auth
      .loginWithWechat(code, '', '', phoneCode)
      .then((res) => {
        wx.hideLoading();
        this.setData({ logging: false });
        if (!res || !res.token) {
          this.loginFail('登录失败，请重试');
          return;
        }
        // 保存登录态
        wx.setStorageSync('token', res.token);
        wx.setStorageSync('userInfo', res.user || {});
        app.globalData.isLogin = true;
        app.globalData.userInfo = res.user || null;

        // 判定是否需要弹出完善资料卡片：缺头像 或 未填网球水平
        var user = res.user || {};
        var hasAvatar = !!user.avatar;
        var hasNtrp = user.ntrpLevel !== null && user.ntrpLevel !== undefined && user.ntrpLevel !== '';
        if (hasAvatar && hasNtrp) {
          this.finishAndBack('登录成功');
        } else {
          this.setData({
            showProfile: true,
            'form.nickname': user.name || '',
            'form.avatar': user.avatar || '',
            'form.gender': user.gender || '',
            'form.ntrpLevel': hasNtrp ? Number(user.ntrpLevel) : '',
          });
        }
      })
      .catch((err) => {
        this.loginFail((err && err.message) || '登录失败');
      });
  },

  // 选择微信头像（chooseAvatar 回调，返回临时头像路径）
  onChooseAvatar(e) {
    var avatarUrl = (e && e.detail && e.detail.avatarUrl) || '';
    if (avatarUrl) this.setData({ 'form.avatar': avatarUrl });
  },

  onNicknameInput(e) {
    this.setData({ 'form.nickname': e.detail.value });
  },

  onPickGender(e) {
    var g = e.currentTarget.dataset.g || '';
    this.setData({ 'form.gender': g });
  },

  // 选择网球水平
  onPickNtrp(e) {
    var v = e.currentTarget.dataset.v;
    this.setData({ 'form.ntrpLevel': Number(v) });
  },

  // 保存资料：头像若为本地临时路径需先上传，再调用 updateProfile + updateNtrpLevel
  onSaveProfile() {
    if (this.data.saving) return;
    var that = this;
    var form = this.data.form;
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    var doUpdate = function (avatarUrl) {
      var payload = { name: form.nickname || null, gender: form.gender || null };
      if (avatarUrl) payload.avatar = avatarUrl;

      // 先保存基础资料，再保存网球水平（若已选）
      api.user
        .updateProfile(payload)
        .then(function () {
          var hasNtrp = form.ntrpLevel !== '' && form.ntrpLevel !== null && form.ntrpLevel !== undefined;
          if (hasNtrp) {
            return api.user.updateNtrpLevel(Number(form.ntrpLevel));
          }
          return Promise.resolve();
        })
        .then(function () {
          // 刷新本地 userInfo
          var info = wx.getStorageSync('userInfo') || {};
          if (avatarUrl) info.avatar = avatarUrl;
          info.gender = form.gender || null;
          if (form.ntrpLevel !== '' && form.ntrpLevel !== null && form.ntrpLevel !== undefined) {
            info.ntrpLevel = Number(form.ntrpLevel);
          }
          wx.setStorageSync('userInfo', info);
          if (app.globalData) app.globalData.userInfo = info;
          that.setData({ saving: false });
          that.finishAndBack('已保存');
        })
        .catch(function (err) {
          wx.hideLoading();
          that.setData({ saving: false });
          wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
        });
    };

    if (form.avatar && form.avatar.indexOf('http') !== 0) {
      // 本地临时文件，先上传到后端拿正式 URL
      api.upload
        .image(form.avatar)
        .then(function (url) {
          doUpdate(url);
        })
        .catch(function () {
          // 上传失败则仅保存性别/水平
          doUpdate('');
        });
    } else {
      doUpdate(form.avatar || '');
    }
  },

  onSkipProfile() {
    this.finishAndBack('登录成功');
  },

  finishAndBack(msg) {
    wx.hideLoading();
    wx.showToast({ title: msg || '登录成功', icon: 'success' });
    setTimeout(function () {
      var pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    }, 600);
  },

  loginFail(msg) {
    wx.hideLoading();
    this.setData({ logging: false });
    wx.showToast({ title: msg, icon: 'none' });
  },
});
