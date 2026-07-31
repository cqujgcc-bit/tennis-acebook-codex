const api = require('../../utils/api.js');

function fmtTime(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  var now = new Date();
  var diff = Math.floor((now - d) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + '天前';
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  var dd = ('0' + d.getDate()).slice(-2);
  return mm + '-' + dd;
}

function iconFor(type) {
  switch (type) {
    case 'match_cancelled': return { icon: '❌', cls: 'ic-cancel' };
    case 'circle_match': return { icon: '🎾', cls: 'ic-circle' };
    case 'circle_announcement': return { icon: '📢', cls: 'ic-circle' };
    case 'circle_joined': return { icon: '👋', cls: 'ic-circle' };
    case 'post_liked': return { icon: '❤️', cls: 'ic-social' };
    case 'post_commented': return { icon: '💬', cls: 'ic-social' };
    case 'comment_replied': return { icon: '↩️', cls: 'ic-social' };
    case 'system': return { icon: '🎾', cls: 'ic-match' };
    default: return { icon: '🔔', cls: 'ic-default' };
  }
}

Page({
  data: {
    list: [],
    unreadCount: 0,
    loading: true,
  },

  onLoad() {
    this.loadList();
  },

  onShow() {
    if (this._loaded) this.loadList();
    this._loaded = true;
  },

  onPullDownRefresh() {
    this.loadList(function () { wx.stopPullDownRefresh(); });
  },

  loadList(done) {
    var that = this;
    this.setData({ loading: true });
    api.notification
      .list()
      .then(function (rows) {
        rows = rows || [];
        var list = rows.map(function (n) {
          var ic = iconFor(n.type);
          return {
            id: n.id,
            type: n.type,
            title: n.title || '通知',
            content: n.content || '',
            isRead: !!n.isRead,
            timeText: fmtTime(n.createdAt),
            icon: ic.icon,
            iconClass: ic.cls,
            relatedId: n.relatedId,
          };
        });
        var unread = list.filter(function (n) { return !n.isRead; }).length;
        that.setData({ list: list, unreadCount: unread, loading: false });
        that.syncBadge(unread);
        if (done) done();
      })
      .catch(function () {
        that.setData({ loading: false });
        if (done) done();
      });
  },

  syncBadge(n) {
    try {
      if (n > 0) {
        wx.setTabBarBadge({ index: 4, text: String(n > 99 ? '99+' : n) });
      } else {
        wx.removeTabBarBadge({ index: 4 });
      }
    } catch (e) {}
  },

  onMarkAll() {
    var that = this;
    api.notification
      .markAllRead()
      .then(function () {
        var list = that.data.list.map(function (n) { n.isRead = true; return n; });
        that.setData({ list: list, unreadCount: 0 });
        that.syncBadge(0);
        wx.showToast({ title: '已全部已读', icon: 'success' });
      })
      .catch(function () {
        wx.showToast({ title: '操作失败', icon: 'none' });
      });
  },

  onTapItem(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var idx = e.currentTarget.dataset.idx;
    var item = this.data.list[idx];
    // 标记已读
    if (item && !item.isRead) {
      api.notification.markRead([id]).then(function () {
        var list = that.data.list;
        list[idx].isRead = true;
        var unread = list.filter(function (n) { return !n.isRead; }).length;
        that.setData({ list: list, unreadCount: unread });
        that.syncBadge(unread);
      }).catch(function () {});
    }
    // 跳转：球局相关 → 球局详情
    if (item && item.relatedId && (item.type === 'system' || item.type === 'match_cancelled' || item.type === 'circle_match')) {
      wx.navigateTo({ url: '/pages/game-detail/game-detail?id=' + item.relatedId });
    }
  },
});
