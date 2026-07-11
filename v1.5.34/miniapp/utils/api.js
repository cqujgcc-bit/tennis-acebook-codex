// utils/api.js - 业务接口封装，页面只需调用 api.xxx
const { query, mutation, BASE_URL, getToken } = require('./request.js');

const api = {
  // ─── 文件上传 ───────────────────────────────────────────
  upload: {
    // 上传本地图片，返回可访问的绝对 URL
    image: (filePath) =>
      new Promise((resolve, reject) => {
        const token = getToken();
        wx.uploadFile({
          url: BASE_URL + '/api/upload',
          filePath: filePath,
          name: 'file',
          header: token ? { Authorization: 'Bearer ' + token } : {},
          success: (res) => {
            try {
              const data = JSON.parse(res.data || '{}');
              if (data && data.url) {
                const url = data.url.indexOf('http') === 0 ? data.url : BASE_URL + data.url;
                resolve(url);
              } else {
                reject({ message: (data && data.error) || '上传失败' });
              }
            } catch (e) {
              reject({ message: '上传响应解析失败' });
            }
          },
          fail: (err) => reject({ message: '上传失败', raw: err }),
        });
      }),
  },

  // ─── 认证 ───────────────────────────────────────────────
  auth: {
    // 微信一键登录：传 wx.login 拿到的 code
    loginWithWechat: (code, nickName, avatarUrl, phoneCode) =>
      mutation('auth.loginWithWechat', { code, nickName, avatarUrl, phoneCode }),
    me: () => query('auth.me'),
    // 手机号验证码登录（备用）
    sendSmsCode: (phone) => mutation('auth.sendSmsCode', { phone }),
    miniLoginWithPhone: (phone, code) =>
      mutation('auth.miniLoginWithPhone', { phone, code }),
    // 绑定手机号
    bindPhoneToWechat: (phone, code) =>
      mutation('auth.bindPhoneToWechat', { phone, code }),
  },

  // ─── 约球 ───────────────────────────────────────────────
  match: {
    list: (params) => query('match.list', params || {}),
    getById: (id) => query('match.getById', { id: Number(id) }),
    create: (data) => mutation('match.create', data),
    join: (matchId, message) => mutation('match.join', { matchId: Number(matchId), message }),
    leave: (matchId) => mutation('match.leave', { matchId: Number(matchId) }),
    cancel: (matchId) => mutation('match.cancel', { matchId: Number(matchId) }),
    approveWaitlist: (matchId, userId) => mutation('match.approveWaitlist', { matchId: Number(matchId), userId: Number(userId) }),
    myMatches: () => query('match.myMatches'),
    // 支付：创建预付订单（返回微信支付参数 + isMockMode）
    createPayOrder: (matchId) => mutation('match.createPayOrder', { matchId: Number(matchId) }),
    // 支付：Mock 模式下前端确认支付成功（生产由微信回调处理）
    confirmPayment: (orderId, matchId) => mutation('match.confirmPayment', { orderId, matchId: Number(matchId) }),
    // 结算：发起人确认球局完成。attendance 可选：[{userId, attended}]，传入则按实际到场动态重算（多退少补）
    confirmComplete: (matchId, attendance, organizerAttended) => mutation('match.confirmMatchComplete', Object.assign({ matchId: Number(matchId) }, attendance ? { attendance: attendance } : {}, (organizerAttended === true || organizerAttended === false) ? { organizerAttended: organizerAttended } : {})),
    // V6 球局编辑：发起人修改标题/时间/地点/名额/费用
    editMatch: (data) => mutation('match.editMatch', data),
    // V6 补缴支付：到场少缴者补差额（返回微信支付参数）
    payTopup: (matchId) => mutation('match.payTopup', { matchId: Number(matchId) }),
    // V6 补缴确认（Mock 模式；生产由微信回调处理）
    confirmTopup: (orderId, matchId) => mutation('match.confirmTopupPayment', { orderId, matchId: Number(matchId) }),
    // 结算：我的钱包（待结算/已结算/订单/退款）
    myWallet: () => query('match.myWallet'),
    // 候补名单：加入候补（球局满员时）
    joinWaitlist: (matchId, message) => mutation('match.joinWaitlist', Object.assign({ matchId: Number(matchId) }, message ? { message } : {})),
    // 候补名单：退出候补
    leaveWaitlist: (matchId) => mutation('match.leaveWaitlist', { matchId: Number(matchId) }),
    // 候补名单：查询我的候补排位
    myWaitlistPosition: (matchId) => query('match.myWaitlistPosition', { matchId: Number(matchId) }),
    // 增加名额（只增不减，收费局重算人均并立即退差价给已付款者）
    increaseCapacity: (matchId, maxParticipants) => mutation('match.increaseCapacity', { matchId: Number(matchId), maxParticipants: Number(maxParticipants) }),
    // 找替补：生成转让邀请（参与者或发起人均可）
    createReplaceInvite: (matchId) => mutation('match.createReplaceInvite', { matchId: Number(matchId) }),
    // 找替补：查看邀请详情
    getReplaceInvite: (token) => query('match.getReplaceInvite', { token }),
    // 找替补：接受邀请（接位，收费局需再支付）
    acceptReplaceInvite: (token) => mutation('match.acceptReplaceInvite', { token }),
    // 局内群聊
    getMessages: (matchId, afterId, limit) =>
      query('match.getMessages', Object.assign({ matchId: Number(matchId) }, afterId ? { afterId: Number(afterId) } : {}, limit ? { limit: Number(limit) } : {})),
    sendMessage: (matchId, content, msgType) =>
      mutation('match.sendMessage', Object.assign({ matchId: Number(matchId), content }, msgType ? { msgType } : {})),
    getUnreadCount: (matchId, lastReadId) =>
      query('match.getUnreadCount', { matchId: Number(matchId), lastReadId: Number(lastReadId || 0) }),
  },

  // ─── 圈子 ───────────────────────────────────────────────
  circle: {
    myCircles: () => query('circle.myCircles'),
    create: (name, description) => mutation('circle.create', { name, description }),
    previewByCode: (code) => query('circle.previewByCode', { code }),
    getByCode: (code) => query('circle.getByCode', { code }),
    join: (code) => mutation('circle.join', { code }),
    leave: (circleId) => mutation('circle.leave', { circleId: Number(circleId) }),
    leaderboard: (circleId) => query('circle.leaderboard', { circleId: Number(circleId) }),
    getMatches: (circleId) => query('circle.getMatches', { circleId: Number(circleId) }),
    getPosts: (circleId) => query('circle.getPosts', { circleId: Number(circleId) }),
    createPost: (circleId, content) => mutation('circle.createPost', { circleId: Number(circleId), content }),
    likePost: (postId) => mutation('circle.likePost', { postId: Number(postId) }),
    deletePost: (postId) => mutation('circle.deletePost', { postId: Number(postId) }),
    getActivities: (circleId) => query('circle.getActivities', { circleId: Number(circleId) }),
    getComments: (postId) => query('circle.getComments', { postId: Number(postId) }),
    createComment: (data) => mutation('circle.createComment', {
      postId: Number(data.postId),
      circleId: Number(data.circleId),
      content: data.content,
      ...(data.parentId ? { parentId: Number(data.parentId) } : {}),
    }),
    updateSettings: (data) => mutation('circle.updateSettings', data),
    transferOwner: (circleId, targetUserId) => mutation('circle.transferOwner', { circleId: Number(circleId), targetUserId: Number(targetUserId) }),
    // ── 申请加入 / 圈主审核 ──
    applyToJoin: (circleId, message) => mutation('circle.applyToJoin', Object.assign({ circleId: Number(circleId) }, message ? { message: message } : {})),
    myJoinRequests: () => query('circle.myJoinRequests'),
    listJoinRequests: (circleId) => query('circle.listJoinRequests', { circleId: Number(circleId) }),
    reviewJoinRequest: (requestId, approve) => mutation('circle.reviewJoinRequest', { requestId: Number(requestId), approve: !!approve }),
    pendingRequestCount: (circleId) => query('circle.pendingRequestCount', { circleId: Number(circleId) }),
    // ── 圈内活动：发布（支持批量N周）/ 报名占位（无定金）──
    createActivity: (data) => mutation('circle.createActivity', data),
    signupActivity: (activityId) => mutation('circle.signupActivity', { activityId: Number(activityId) }),
    cancelActivity: (activityId) => mutation('circle.cancelActivity', { activityId: Number(activityId) }),
    // ── 活动模板：一键/批量发布固定活动 ──
    getTemplates: (circleId) => query('circle.getTemplates', { circleId: Number(circleId) }),
    createTemplate: (data) => mutation('circle.createTemplate', data),
    deleteTemplate: (templateId) => mutation('circle.deleteTemplate', { templateId: Number(templateId) }),
    // ── 赛后结算：发起人填实际总开销→按到场平摊→生成账单（无定金）──
    settleActivity: (data) => mutation('circle.settleActivity', data),
    getActivitySettlement: (activityId) => query('circle.getActivitySettlement', { activityId: Number(activityId) }),
    payActivityShare: (activityId) => mutation('circle.payActivityShare', { activityId: Number(activityId) }),
    confirmActivityPayment: (orderId, activityId) => mutation('circle.confirmActivityPayment', { orderId, activityId: Number(activityId) }),
    // ── 解散圈子（圈主，需输入圈名确认，物理删除）──
    dismissCircle: (circleId, confirmName) => mutation('circle.dismissCircle', { circleId: Number(circleId), confirmName: confirmName }),
  },

  // ─── 我的 / 用户 ────────────────────────────────────────
  user: {
    myStats: () => query('user.myStats'),
    updateProfile: (data) => mutation('user.updateProfile', data),
    updateNtrpLevel: (ntrpLevel) => mutation('user.updateNtrpLevel', { ntrpLevel }),
    updateContact: (data) => mutation('user.updateContact', data),
    getPublicProfile: (userId) => query('user.getPublicProfile', { userId: Number(userId) }),
    getCreditLogs: () => query('user.getCreditLogs'),
  },

  // ─── 意见反馈 ───────────────────────────────────────────
  feedback: {
    submit: (content, contact, category) =>
      mutation('feedback.submit', { content, contact, category }),
    myList: () => query('feedback.myList'),
    // 管理员
    adminList: (status) => query('feedback.adminList', status ? { status } : undefined),
    pendingCount: () => query('feedback.pendingCount'),
    reply: (id, reply) => mutation('feedback.reply', { id: Number(id), reply }),
  },

  // ─── 找场地·预订平台（公开）──────────────────────
  venue: {
    bookingApps: () => query('venue.bookingApps'),
  },

  // ─── 管理后台（仅 role=admin）───────────────────────────
  admin: {
    stats: () => query('admin.stats'),
    listUsers: (params) => query('admin.listUsers', params || {}),
    adjustCredit: (userId, delta, reason) =>
      mutation('admin.adjustCredit', { userId: Number(userId), delta: Number(delta), reason }),
    warnUser: (userId, reason) => mutation('admin.warnUser', { userId: Number(userId), reason }),
    banUser: (userId, reason) => mutation('admin.banUser', { userId: Number(userId), reason }),
    unbanUser: (userId) => mutation('admin.unbanUser', { userId: Number(userId) }),
    broadcast: (title, content, scope) =>
      mutation('admin.broadcast', { title, content, scope: scope || 'all' }),
    // 教练审核
    pendingCoaches: () => query('admin.pendingCoaches'),
    approveCoach: (coachId) => mutation('admin.approveCoach', { coachId: Number(coachId) }),
    rejectCoach: (coachId, reason) => mutation('admin.rejectCoach', { coachId: Number(coachId), reason }),
    // 预订平台排布
    listBookingApps: () => query('admin.listBookingApps'),
    reorderBookingApps: (orders) => mutation('admin.reorderBookingApps', { orders }),
    toggleBookingApp: (id, enabled) => mutation('admin.toggleBookingApp', { id: Number(id), enabled: !!enabled }),
    upsertBookingApp: (data) => mutation('admin.upsertBookingApp', data),
    deleteBookingApp: (id) => mutation('admin.deleteBookingApp', { id: Number(id) }),
  },

  // ─── 约课 / 教练 ────────────────────────────────────────
  coach: {
    list: (params) => query('coach.list', params || {}),
  },

  // ─── 球场 ───────────────────────────────────────────────
  venue: {
    list: (params) => query('venue.list', params || {}),
  },

  // ─── 通知 ───────────────────────────────────────────────
  notification: {
    list: () => query('notification.list'),
    unreadCount: () => query('notification.unreadCount'),
    markRead: (ids) => mutation('notification.markRead', ids && ids.length ? { ids: ids.map(Number) } : {}),
    markAllRead: () => mutation('notification.markAllRead', {}),
    remove: (id) => mutation('notification.delete', { id: Number(id) }),
  },
};

module.exports = api;
