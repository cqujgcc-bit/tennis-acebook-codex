const api = require('../../utils/api.js');

function initial(name) {
  if (!name) return '球';
  return name.charAt(0);
}

Page({
  data: {
    matchId: null,
    messages: [],
    draft: '',
    loading: true,
    scrollTo: '',
    scrollHeight: 500,
    keyboardPad: 0,
    myId: null,
  },

  onLoad: function (options) {
    var matchId = options.matchId;
    var title = options.title ? decodeURIComponent(options.title) : '球局群聊';
    wx.setNavigationBarTitle({ title: title });

    var myInfo = wx.getStorageSync('userInfo') || {};
    // 计算滚动区高度（屏幕高 - 输入栏约 110px）
    var sys = wx.getSystemInfoSync();
    var sh = sys.windowHeight - 56;

    this.baseScrollHeight = sh;
    this.setData({
      matchId: Number(matchId),
      myId: myInfo.id || null,
      scrollHeight: sh,
    });
    this.lastId = 0;
    this.loadInitial();
  },

  onUnload: function () { this.stopPoll(); },
  onHide: function () { this.stopPoll(); },
  onShow: function () {
    if (this.data.matchId && !this.loading) this.startPoll();
  },

  // 首次加载
  loadInitial: function () {
    var that = this;
    api.match.getMessages(this.data.matchId, null, 50)
      .then(function (res) {
        var list = (res && res.messages) || [];
        that.applyMessages(list, true);
        that.setData({ loading: false });
        that.scrollBottom();
        that.startPoll();
      })
      .catch(function (err) {
        that.setData({ loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  // 轮询增量
  startPoll: function () {
    var that = this;
    this.stopPoll();
    this.timer = setInterval(function () {
      api.match.getMessages(that.data.matchId, that.lastId, 50)
        .then(function (res) {
          var list = (res && res.messages) || [];
          if (list.length) {
            that.applyMessages(list, false);
            that.scrollBottom();
          }
        })
        .catch(function () {});
    }, 4000);
  },
  stopPoll: function () { if (this.timer) { clearInterval(this.timer); this.timer = null; } },

  // 合并消息
  applyMessages: function (list, replace) {
    var myId = this.data.myId;
    var mapped = list.map(function (m) {
      return {
        id: m.id,
        content: m.content,
        msgType: m.msgType || 'text',
        userId: m.userId,
        userName: m.userName || '球友',
        userAvatar: m.userAvatar || '',
        initial: initial(m.userName),
        isSelf: myId && m.userId === myId,
      };
    });
    var merged = replace ? mapped : this.data.messages.concat(mapped);
    if (merged.length) this.lastId = merged[merged.length - 1].id;
    this.setData({ messages: merged });
  },

  scrollBottom: function () {
    var that = this;
    setTimeout(function () { that.setData({ scrollTo: 'bottom-anchor' }); }, 50);
  },

  onDraftInput: function (e) { this.setData({ draft: e.detail.value }); },
  // 键盘高度变化：整个输入栏上移，同时压缩消息滚动区高度
  onKbHeight: function (e) {
    var h = (e.detail && e.detail.height) || 0;
    this.setData({
      keyboardPad: h,
      scrollHeight: this.baseScrollHeight - h,
    });
    if (h > 0) this.scrollBottom();
  },
  onFocus: function () { this.scrollBottom(); },
  onBlur: function () {
    this.setData({ keyboardPad: 0, scrollHeight: this.baseScrollHeight });
  },

  onSend: function () {
    var content = (this.data.draft || '').trim();
    if (!content) return;
    var token = wx.getStorageSync('token');
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    if (this.sending) return;
    this.sending = true;
    var that = this;
    this.setData({ draft: '' });
    api.match.sendMessage(this.data.matchId, content)
      .then(function () {
        that.sending = false;
        // 立即拉取增量显示自己的消息
        return api.match.getMessages(that.data.matchId, that.lastId, 50);
      })
      .then(function (res) {
        var list = (res && res.messages) || [];
        if (list.length) { that.applyMessages(list, false); that.scrollBottom(); }
      })
      .catch(function (err) {
        that.sending = false;
        that.setData({ draft: content });
        wx.showToast({ title: (err && err.message) || '发送失败', icon: 'none' });
      });
  },
});
