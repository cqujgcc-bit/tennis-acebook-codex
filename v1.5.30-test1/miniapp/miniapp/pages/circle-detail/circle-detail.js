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

function weekDay(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d.getTime())) return '';
  return '周' + '日一二三四五六'.charAt(d.getDay());
}

// 判断球局是否已过期（根据日期+开始时间）
function isDatePassed(dateStr, startTime) {
  if (!dateStr) return false;
  try {
    var t = (dateStr + ' ' + (startTime || '00:00')).replace(/-/g, '/');
    var dt = new Date(t);
    return !isNaN(dt.getTime()) && Date.now() >= dt.getTime();
  } catch (e) { return false; }
}

Page({
  data: {
    circle: null,
    activeTab: 'feed', // feed | activities | matches | rank
    posts: [],
    activities: [],
    matches: [],
    ranking: [],
    myRole: 'member',
    loading: true,
    postInput: '',
    showPostBox: false,
    submitting: false,
    // 设置/转让/编辑说明
    showSettings: false,
    showEditDesc: false,
    showTransfer: false,
    descInput: '',
    transferList: [],
    // 入圈申请审核
    showRequests: false,
    joinRequests: [],
   pendingCount: 0,
   reviewing: false,
    showCreateSheet: false,
  },

  onLoad(options) {
    this.circleId = Number(options.id);
    this.inviteCode = options.code || '';
    this.loadDetail();
  },

  onShow() {
    if (this._loaded && this.circleId) {
      this.loadMatches();
      this.loadRanking();
    }
    this._loaded = true;
  },

  noop() {},

  loadDetail() {
    var that = this;
    this.setData({ loading: true });
    if (!this.inviteCode) {
      this.setData({ loading: false });
      wx.showToast({ title: '缺少圈子信息', icon: 'none' });
      return;
    }
    api.circle
      .getByCode(this.inviteCode)
      .then(function (c) {
        c = c || {};
        if (c.id) that.circleId = c.id;
        that.setData({
          circle: {
            id: c.id,
            name: c.name || '圈子',
            description: c.description || '这个圈子还没有简介',
            rawDescription: c.description || '',
            memberCount: c.memberCount || 0,
            activeGames: 0,
            inviteCode: c.inviteCode || that.inviteCode,
          },
          myRole: (function () {
            var myInfo = wx.getStorageSync('userInfo') || {};
            if (c.ownerId && myInfo.id && c.ownerId === myInfo.id) return 'owner';
            return c.myRole || 'member';
          })(),
          loading: false,
        });
        that.loadPosts();
        that.loadRanking();
        that.loadMatches();
        that.loadPendingCount();
      })
      .catch(function (err) {
        that.setData({ loading: false });
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  switchTab(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'activities' && this.circleId) {
      this.loadActivities();
    }
  },

  loadPosts() {
    var that = this;
    api.circle
      .getPosts(this.circleId)
      .then(function (list) {
        var myInfo = wx.getStorageSync('userInfo') || {};
        var myId = myInfo.id;
        var myRole = that.data.myRole;
        var isManager = (myRole === 'owner' || myRole === 'admin');
        var posts = (list || []).map(function (p) {
          return {
            id: p.id,
            canDelete: (!!myId && p.authorId === myId) || isManager,
            content: p.content,
            isPinned: !!p.isPinned,
            authorName: p.authorName || '球友',
            authorAvatar: p.authorAvatar || '',
            authorLetter: (p.authorName || '?').charAt(0),
            timeText: fmtTime(p.createdAt),
            likeCount: p.likeCount || 0,
            liked: false,
            commentCount: p.commentCount || 0,
            showComments: false,
            comments: [],
            cmtInput: '',
            cmtSubmitting: false,
            replyParentId: 0,
            replyPlaceholder: '说点什么…',
          };
        });
        that.setData({ posts: posts });
      })
      .catch(function () {
        that.setData({ posts: [] });
      });
  },

  onDeletePost(e) {
    var idx = e.currentTarget.dataset.idx;
    var post = this.data.posts[idx];
    if (!post) return;
    var that = this;
    wx.showModal({
      title: '删除动态',
      content: '确定删除这条动态吗？删除后不可恢复。',
      confirmColor: '#E5484D',
      success: function (res) {
        if (!res.confirm) return;
        api.circle.deletePost(post.id)
          .then(function () {
            var posts = that.data.posts.slice();
            posts.splice(idx, 1);
            that.setData({ posts: posts });
            wx.showToast({ title: '已删除', icon: 'success' });
          })
          .catch(function (err) {
            wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' });
          });
      },
    });
  },

  loadRanking() {
    var that = this;
    api.circle
      .leaderboard(this.circleId)
      .then(function (list) {
        var ranking = (list || []).map(function (item, idx) {
          return {
            rank: idx + 1,
            userId: item.userId,
            name: item.name || '球友',
            avatar: item.avatar || '',
            letter: (item.name || '?').charAt(0),
            role: item.role === 'owner' ? '圈主' : (item.role === 'admin' ? '管理员' : ''),
            rawRole: item.role || 'member',
            matchCount: item.matchCount || 0,
          };
        });
        that._rankRaw = ranking;
        that.setData({ ranking: ranking });
      })
      .catch(function () {
        that.setData({ ranking: [] });
      });
  },

  loadMatches() {
    var that = this;
    api.circle
      .getMatches(this.circleId)
      .then(function (list) {
        var matches = (list || []).map(function (m) {
          var isExpired = m.status === 'open' && isDatePassed(m.matchDate, m.startTime);
          var isActive = m.status === 'open' && !isExpired;
          return {
            id: m.id,
            title: m.title || '网球局',
            dateText: (m.matchDate || '') + ' ' + weekDay(m.matchDate),
            startTime: m.startTime || '',
            venueName: m.venueName || '待定',
            levelRequired: m.levelRequired || '',
            current: m.currentParticipants || 0,
            max: m.maxParticipants || 0,
            statusText: isActive ? '征集中' : (isExpired ? '已结束' : (m.status === 'full' ? '已满员' : (m.status === 'completed' ? '已结束' : '已取消'))),
            isActive: isActive,
            authorAvatar: m.authorAvatar || '',
            authorLetter: (m.authorName || '?').charAt(0),
          };
        });
        var active = matches.filter(function (m) { return m.isActive; }).length;
        var c = that.data.circle || {};
        c.activeGames = active;
        that.setData({ matches: matches, circle: c });
      })
      .catch(function () {
        that.setData({ matches: [] });
      });
  },

  // ── 加载圈内活动列表 ──
  loadActivities() {
    var that = this;
    api.circle.getActivities(this.circleId).then(function (list) {
      var activities = (list || []).map(function (a) {
        var dateStr = a.activityDate || '';
        var timeStr = (a.startTime || '') + (a.endTime ? ('-' + a.endTime) : '');
        var isAA = a.feeMode === 'aa';
        var startTs = 0;
        if (dateStr) {
          var t = (dateStr + ' ' + (a.startTime || '00:00')).replace(/-/g, '/');
          startTs = new Date(t).getTime() || 0;
        }
        return {
          id: a.id,
          title: a.title || '活动',
          dateStr: dateStr,
          timeStr: timeStr,
          venueName: a.venueName || '',
          description: a.description || '',
          currentParticipants: a.currentParticipants || 0,
          maxParticipants: a.maxParticipants || 0,
          isAA: isAA,
          feeLabel: isAA ? 'AA结算' : '免费',
          settleLabel: a.settleStatus === 'settled' ? '已结算' : (a.settleStatus === 'settling' ? '待支付' : ''),
        };
      });
      that.setData({ activities: activities });
    }).catch(function () {
      that.setData({ activities: [] });
    });
  },

  onShareCode() {
    var code = this.data.circle && this.data.circle.inviteCode;
    if (!code) return;
    wx.setClipboardData({
      data: code,
      success: function () {
        wx.showToast({ title: '邀请码已复制，发给球友吧', icon: 'none' });
      },
    });
  },

  togglePostBox() {
    this.setData({ showPostBox: !this.data.showPostBox, postInput: '' });
  },

  onPostInput(e) {
    this.setData({ postInput: e.detail.value });
  },

  submitPost() {
    var that = this;
    var content = (this.data.postInput || '').trim();
    if (!content) {
      wx.showToast({ title: '说点什么吧', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    api.circle
      .createPost(this.circleId, content)
      .then(function () {
        that.setData({ submitting: false, showPostBox: false, postInput: '' });
        wx.showToast({ title: '已发布', icon: 'success' });
        that.loadPosts();
      })
      .catch(function (err) {
        that.setData({ submitting: false });
        wx.showToast({ title: (err && err.message) || '发布失败', icon: 'none' });
      });
  },

  onLike(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var idx = e.currentTarget.dataset.idx;
    api.circle
      .likePost(id)
      .then(function (r) {
        var posts = that.data.posts;
        var p = posts[idx];
        if (r && r.liked) {
          p.liked = true; p.likeCount = (p.likeCount || 0) + 1;
        } else {
          p.liked = false; p.likeCount = Math.max(0, (p.likeCount || 0) - 1);
        }
        var patch = {}; patch['posts[' + idx + ']'] = p;
        that.setData(patch);
      })
      .catch(function () {});
  },

  // ─── 评论 ───
  toggleComments(e) {
    var that = this;
    var idx = e.currentTarget.dataset.idx;
    var posts = this.data.posts;
    var p = posts[idx];
    var willShow = !p.showComments;
    p.showComments = willShow;
    var patch = {}; patch['posts[' + idx + ']'] = p;
    this.setData(patch);
    if (willShow) {
      this.loadComments(idx, p.id);
    }
  },

  loadComments(idx, postId) {
    var that = this;
    api.circle
      .getComments(postId)
      .then(function (list) {
        list = list || [];
        var nameMap = {};
        list.forEach(function (c) { nameMap[c.id] = c.authorName || '球友'; });
        var comments = list.map(function (c) {
          return {
            id: c.id,
            content: c.content,
            authorName: c.authorName || '球友',
            authorAvatar: c.authorAvatar || '',
            authorLetter: (c.authorName || '?').charAt(0),
            replyToName: c.parentId ? (nameMap[c.parentId] || '') : '',
            timeText: fmtTime(c.createdAt),
          };
        });
        var p = that.data.posts[idx];
        if (!p) return;
        p.comments = comments;
        p.commentCount = comments.length;
        var patch = {}; patch['posts[' + idx + ']'] = p;
        that.setData(patch);
      })
      .catch(function () {});
  },

  onCommentInput(e) {
    var idx = e.currentTarget.dataset.idx;
    var p = this.data.posts[idx];
    p.cmtInput = e.detail.value;
    var patch = {}; patch['posts[' + idx + ']'] = p;
    this.setData(patch);
  },

  onReplyComment(e) {
    var pidx = e.currentTarget.dataset.pidx;
    var cid = e.currentTarget.dataset.cid;
    var cname = e.currentTarget.dataset.cname;
    var p = this.data.posts[pidx];
    p.replyParentId = Number(cid);
    p.replyPlaceholder = '回复 ' + cname + '…';
    var patch = {}; patch['posts[' + pidx + ']'] = p;
    this.setData(patch);
  },

  submitComment(e) {
    var that = this;
    var idx = e.currentTarget.dataset.idx;
    var p = this.data.posts[idx];
    if (!p) return;
    var content = (p.cmtInput || '').trim();
    if (!content) {
      wx.showToast({ title: '说点什么吧', icon: 'none' });
      return;
    }
    if (p.cmtSubmitting) return;
    p.cmtSubmitting = true;
    var patch0 = {}; patch0['posts[' + idx + ']'] = p;
    this.setData(patch0);
    var payload = { postId: p.id, circleId: this.circleId, content: content };
    if (p.replyParentId) payload.parentId = p.replyParentId;
    api.circle
      .createComment(payload)
      .then(function () {
        var pp = that.data.posts[idx];
        pp.cmtSubmitting = false;
        pp.cmtInput = '';
        pp.replyParentId = 0;
        pp.replyPlaceholder = '说点什么…';
        var patch = {}; patch['posts[' + idx + ']'] = pp;
        that.setData(patch);
        that.loadComments(idx, pp.id);
      })
      .catch(function (err) {
        var pp = that.data.posts[idx];
        pp.cmtSubmitting = false;
        var patch = {}; patch['posts[' + idx + ']'] = pp;
        that.setData(patch);
        wx.showToast({ title: (err && err.message) || '评论失败', icon: 'none' });
      });
  },

  goMatchDetail(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/game-detail/game-detail?id=' + id });
  },

  // ─── 统一发起活动入口（底部栏）───
  onCreateActivity() {
    this.setData({ showCreateSheet: true });
  },
  closeCreateSheet() {
    this.setData({ showCreateSheet: false });
  },
  onSelectActivityType(e) {
    var type = e.currentTarget.dataset.type;
    this.setData({ showCreateSheet: false });
    if (type === 'match') {
      this.onCreateGame();
    } else {
      this.onGoActivities();
    }
  },

  onCreateGame() {
    var token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/pages/create-game/create-game?circleId=' + this.circleId });
  },

  // ─── 设置 / 编辑说明 / 转让 / 退出 ───
  openSettings() { this.setData({ showSettings: true }); },
  closeSettings() { this.setData({ showSettings: false }); },

  // ── 入圈申请审核（仅圈主/管理员）──
  loadPendingCount() {
    if (this.data.myRole !== 'owner' && this.data.myRole !== 'admin') return;
    var that = this;
    api.circle.pendingRequestCount(this.circleId)
      .then(function (r) { that.setData({ pendingCount: (r && r.count) || 0 }); })
      .catch(function () {});
  },

  openRequests() {
    var that = this;
    this.setData({ showSettings: false });
    wx.showLoading({ title: '加载中...' });
    api.circle.listJoinRequests(this.circleId)
      .then(function (list) {
        wx.hideLoading();
        var reqs = (list || []).map(function (r) {
          return {
            id: r.id,
            userId: r.userId,
            name: r.name || '球友',
            letter: (r.name || '?').charAt(0),
            avatar: r.avatar || '',
            ntrpLevel: r.ntrpLevel || '',
            message: r.message || '',
          };
        });
        that.setData({ showRequests: true, joinRequests: reqs });
      })
      .catch(function (err) {
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },
  closeRequests() { this.setData({ showRequests: false }); },

  onReviewRequest(e) {
    var that = this;
    if (this.data.reviewing) return;
    var reqId = e.currentTarget.dataset.id;
    var approve = e.currentTarget.dataset.approve === 'true' || e.currentTarget.dataset.approve === true;
    this.setData({ reviewing: true });
    api.circle.reviewJoinRequest(reqId, approve)
      .then(function () {
        var left = (that.data.joinRequests || []).filter(function (r) { return r.id !== reqId; });
        that.setData({ joinRequests: left, reviewing: false, pendingCount: Math.max(0, that.data.pendingCount - 1) });
        wx.showToast({ title: approve ? '已通过' : '已拒绝', icon: 'success' });
        if (approve) { that.loadRanking(); var c = that.data.circle || {}; if (c.memberCount != null) { c.memberCount = c.memberCount + 1; that.setData({ circle: c }); } }
        if (left.length === 0) that.setData({ showRequests: false });
      })
      .catch(function (err) {
        that.setData({ reviewing: false });
        wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
      });
  },

  openEditDesc() {
    var c = this.data.circle || {};
    this.setData({ showSettings: false, showEditDesc: true, descInput: c.rawDescription || '' });
  },
  closeEditDesc() { this.setData({ showEditDesc: false }); },
  onDescInput(e) { this.setData({ descInput: e.detail.value }); },

  saveDesc() {
    var that = this;
    var desc = (this.data.descInput || '').trim();
    api.circle
      .updateSettings({ circleId: this.circleId, description: desc })
      .then(function () {
        var c = that.data.circle || {};
        c.rawDescription = desc;
        c.description = desc || '这个圈子还没有简介';
        that.setData({ circle: c, showEditDesc: false });
        wx.showToast({ title: '已保存', icon: 'success' });
      })
      .catch(function (err) {
        wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
      });
  },

  openTransfer() {
    // 排除自己，列出其他成员
    var me = this.data.myRole;
    var list = (this._rankRaw || []).filter(function (m) { return m.rawRole !== 'owner'; });
    this.setData({ showSettings: false, showTransfer: true, transferList: list });
  },
  closeTransfer() { this.setData({ showTransfer: false }); },

  onPickNewOwner(e) {
    var that = this;
    var uid = e.currentTarget.dataset.uid;
    var name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '转让圈主',
      content: '确定将圈主转让给「' + name + '」吗？转让后你将变为普通成员。',
      confirmText: '确定转让',
      success: function (res) {
        if (!res.confirm) return;
        api.circle
          .transferOwner(that.circleId, uid)
          .then(function () {
            that.setData({ showTransfer: false, myRole: 'member' });
            wx.showToast({ title: '已转让', icon: 'success' });
            that.loadRanking();
          })
          .catch(function (err) {
            wx.showToast({ title: (err && err.message) || '转让失败', icon: 'none' });
          });
      },
    });
  },

  onLeave() {
    var that = this;
    wx.showModal({
      title: '退出圈子',
      content: '确定要退出该圈子吗？退出后将无法查看圈内动态和球局。',
      confirmText: '退出',
      confirmColor: '#C2410C',
      success: function (res) {
        if (!res.confirm) return;
        api.circle
          .leave(that.circleId)
          .then(function () {
            wx.showToast({ title: '已退出', icon: 'success' });
            setTimeout(function () { wx.navigateBack(); }, 800);
          })
          .catch(function (err) {
            wx.showToast({ title: (err && err.message) || '退出失败', icon: 'none' });
          });
      },
    });
  },

  // ── 进入圈子活动列表 ──
  onGoActivities() {
    var c = this.data.circle || {};
    var isOwner = this.data.myRole === 'owner';
    wx.navigateTo({
      url: '/pages/circle-activities/circle-activities?circleId=' + this.circleId +
        '&circleName=' + encodeURIComponent(c.name || '圈子活动') +
        '&isOwner=' + (isOwner ? '1' : '0'),
    });
  },

  // ── 查看活动详情（圈内活动Tab直接导航到活动列表页）──
  goActivityDetail(e) {
    var activityId = Number(e.currentTarget.dataset.id);
    wx.navigateTo({
      url: '/pages/activity-settle/activity-settle?activityId=' + activityId + '&mode=bill',
    });
  },

  // ── 解散圈子（仅圈主，物理删除，二次确认）──
  onDismiss() {
    var that = this;
    var c = this.data.circle || {};
    var name = c.name || '';
    this.setData({ showSettings: false });
    wx.showModal({
      title: '确认解散「' + name + '」？',
      content: '解散后该圈子的动态、活动、成员关系将被永久删除，且不可恢复。请谨慎操作。',
      confirmText: '确认解散',
      cancelText: '再想想',
      confirmColor: '#C2410C',
      success: function (res) {
        if (!res.confirm) return;
        wx.showLoading({ title: '解散中', mask: true });
        api.circle
          .dismissCircle(that.circleId, name)
          .then(function () {
            wx.hideLoading();
            wx.showToast({ title: '圈子已解散', icon: 'success' });
            setTimeout(function () { wx.navigateBack(); }, 800);
          })
          .catch(function (err) {
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || '解散失败', icon: 'none' });
          });
      },
    });
  },
});
