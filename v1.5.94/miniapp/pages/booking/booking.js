const api = require('../../utils/api.js');

// ===== 自然日判定 =====
// 判断 dateStr(YYYY-MM-DD) 是否与 now 同一自然日
function isSameNaturalDay(dateStr, now) {
  if (!dateStr) return false;
  var d = (dateStr || '').slice(0, 10);
  var y = now.getFullYear();
  var mo = ('0' + (now.getMonth() + 1)).slice(-2);
  var dd = ('0' + now.getDate()).slice(-2);
  return d === (y + '-' + mo + '-' + dd);
}

// ===== 倒计时计算 =====
// 依据 matchDate(YYYY-MM-DD) + startTime(HH:mm) 与 endTime 计算
function computeCountdown(m, now) {
  var dateStr = (m.matchDate || '').slice(0, 10);
  if (!dateStr || !m.startTime) {
    return { cdText: '', cdClass: '', ended: false };
  }
  try {
    var start = new Date((dateStr + ' ' + m.startTime).replace(/-/g, '/'));
    var end = null;
    if (m.endTime) end = new Date((dateStr + ' ' + m.endTime).replace(/-/g, '/'));
    var diff = start.getTime() - now.getTime(); // 距开赛毫秒
    // 方案B：是否为“当天”的局（按自然日）。当天的局当天都不算结束，次日凌晨才进历史
    var isSameDay = isSameNaturalDay(dateStr, now);

    // 已过结束时间
    if (end && now.getTime() > end.getTime()) {
      // 当天的局：标记“今日已打/可结算”，但 ended=false（当天仍可见、不进历史）
      if (isSameDay) return { cdText: '✅ 今日已打', cdClass: 'cd-done', ended: false };
      return { cdText: '已结束', cdClass: 'cd-ended', ended: true };
    }
    // 进行中（已过开赛、未到结束 / 无结束时间则开赛后2小时内算进行中）
    if (diff <= 0) {
      var stillOn = end ? now.getTime() <= end.getTime() : (now.getTime() - start.getTime() <= 2 * 3600 * 1000);
      if (stillOn) return { cdText: '🟢 进行中', cdClass: 'cd-live', ended: false };
      // 无结束时间且已超过2小时：当天仍标“今日已打”、不进历史
      if (isSameDay) return { cdText: '✅ 今日已打', cdClass: 'cd-done', ended: false };
      return { cdText: '已结束', cdClass: 'cd-ended', ended: true };
    }
    var mins = Math.floor(diff / 60000);
    var hours = Math.floor(mins / 60);
    var days = Math.floor(hours / 24);
    if (days >= 1) {
      return { cdText: '⏳ 还有 ' + days + ' 天', cdClass: 'cd-normal', ended: false };
    }
    if (hours >= 1) {
      var remMin = mins - hours * 60;
      return { cdText: '⏳ ' + hours + '小时' + (remMin > 0 ? remMin + '分' : '') + '后', cdClass: 'cd-soon', ended: false };
    }
    // 1小时内
    return { cdText: '🔥 即将开始 ' + mins + '分', cdClass: 'cd-urgent', ended: false };
  } catch (e) {
    return { cdText: '', cdClass: '', ended: false };
  }
}

// 后端字段 → 页面卡片字段映射
function decorate(list, now) {
  now = now || new Date();
  return (list || []).map(function (m) {
    var organizerName = m.organizerName || '球友';
    var initial = organizerName.charAt(0);
    var cost = parseFloat(m.costPerPerson || m.feePerPerson || 0);
    var priceText = cost > 0 ? ('💰 ¥' + cost + '/人') : '🆓 免费';
    // 日期星期
    var week = '';
    try {
      var d = new Date((m.matchDate || '').replace(/-/g, '/'));
      var wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      week = wk[d.getDay()] || '';
    } catch (e) {}
    var dateText = (m.matchDate || '').slice(5); // MM-DD
    // 水平范围
    var levelRange = '不限';
    if (m.ntrpMin && m.ntrpMax) levelRange = m.ntrpMin + '-' + m.ntrpMax;
    else if (m.ntrpMin) levelRange = m.ntrpMin + '+';
    // 标签
    var tags = [];
    var typeMap = { singles: '单打', doubles: '双打', mixed_doubles: '混双', practice: '练习', group: '多打' };
    if (typeMap[m.matchType]) tags.push('🏸 ' + typeMap[m.matchType]);
    if (m.circleOnly) tags.push('圈子专属');
    // 距离
    var distanceText = '';
    if (m.distanceKm != null && !isNaN(m.distanceKm)) {
      distanceText = ' · ' + m.distanceKm + 'km';
    }
    // 倒计时
    var cd = computeCountdown(m, now);
    return {
      id: m.id,
      title: m.title,
      isPrivate: !!m.circleOnly,
      circleName: m.circleName || '圈子',
      status: m.status,
      date: dateText,
      week: week,
      startTime: m.startTime,
      endTime: m.endTime || '',
      courtName: m.venueName,
      district: (m.venueAddress || '').slice(0, 12),
      distanceText: distanceText,
      levelRange: levelRange,
      tags: tags,
      organizerName: organizerName,
      organizerInitial: initial,
      currentPlayers: m.currentParticipants || 0,
      maxPlayers: m.maxParticipants || 0,
      priceText: priceText,
      isFree: cost === 0,
      matchType: m.matchType,
      matchDate: (m.matchDate || '').slice(0, 10),
      cdText: cd.cdText,
      cdClass: cd.cdClass,
      cdEnded: cd.ended,
      _raw: m,
    };
  });
}

function isToday(dateStr) {
  if (!dateStr) return false;
  var t = new Date();
  var y = t.getFullYear();
  var mo = ('0' + (t.getMonth() + 1)).slice(-2);
  var dd = ('0' + t.getDate()).slice(-2);
  return dateStr.slice(0, 10) === (y + '-' + mo + '-' + dd);
}

Page({
  data: {
    city: '深圳',
    activeFilter: 'all',
    filters: [
      { key: 'all', label: '全部' },
      { key: 'open', label: '🔥招募' },
      { key: 'nearby', label: '📍附近' },
      { key: 'today', label: '📅今天' },
      { key: 'circle', label: '👥圈子' },
      { key: 'doubles', label: '🏸双打' },
      { key: 'history', label: '📚历史' },
    ],
    games: [],
    allGames: [],
    _searchKeyword: '',
    loading: true,
    nearbyEnabled: false,
    userLat: null,
    userLng: null,
  },

  onLoad: function () {
    // 首次加载交由 onShow 统一处理，避免重复请求
  },

  onShow: function () {
    // 每次进入约球页都重新拉取列表，避免看到旧快照（修复“刚发/状态变化看不到”）
    this.loadMatches();
    this.startCountdownTimer();
  },

  onHide: function () {
    this.stopCountdownTimer();
  },

  onUnload: function () {
    this.stopCountdownTimer();
  },

  // ===== 倒计时定时器（每60秒刷新文案）=====
  startCountdownTimer: function () {
    var that = this;
    this.stopCountdownTimer();
    this._cdTimer = setInterval(function () {
      that.refreshCountdown();
    }, 60000);
  },
  stopCountdownTimer: function () {
    if (this._cdTimer) {
      clearInterval(this._cdTimer);
      this._cdTimer = null;
    }
  },
  refreshCountdown: function () {
    var now = new Date();
    // 同步更新 allGames 的倒计时状态，再重跑一次过滤，保证“进行中/今日已打”状态及时反映
    var all = (this.data.allGames || []).map(function (g) {
      var cd = computeCountdown(g._raw, now);
      g.cdText = cd.cdText;
      g.cdClass = cd.cdClass;
      g.cdEnded = cd.ended;
      return g;
    });
    this.setData({ allGames: all });
    this.applyFilter(this.data.activeFilter);
  },

  onPullDownRefresh: function () {
    this.loadMatches(true);
  },

  loadMatches: function (fromPull, extraInput) {
    var that = this;
    this.setData({ loading: true });
    var input = Object.assign({ limit: 50 }, extraInput || {});
    api.match
      .list(input)
      .then(function (list) {
        var decorated = decorate(list, new Date());
        that.setData({ allGames: decorated, loading: false });
        that.applyFilter(that.data.activeFilter);
        if (fromPull) wx.stopPullDownRefresh();
      })
      .catch(function (err) {
        that.setData({ loading: false, games: [] });
        if (fromPull) wx.stopPullDownRefresh();
        wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
      });
  },

  onFilterTap: function (e) {
    var key = e.currentTarget.dataset.key;
    if (key === 'nearby') {
      this.enableNearby();
      return;
    }
    this.applyFilter(key);
  },

  onSearchInput: function (e) {
    var kw = (e.detail.value || "").trim();
    this.setData({ _searchKeyword: kw });
    this.applyFilter(this.data.activeFilter);
  },

  onSearchConfirm: function (e) {
  },

  onClearSearch: function () {
    this.setData({ _searchKeyword: "" });
    this.applyFilter(this.data.activeFilter);
  },

  // ===== 附近：定位 + 拉取带距离的列表 =====
  enableNearby: function () {
    var that = this;
    wx.getLocation({
      type: 'gcj02',
      success: function (res) {
        that.setData({ nearbyEnabled: true, userLat: res.latitude, userLng: res.longitude });
        // 重新拉取列表并带上经纬度，后端返回 distanceKm
        that.setData({ loading: true });
        api.match
          .list({ limit: 50, nearbyLat: res.latitude, nearbyLng: res.longitude })
          .then(function (list) {
            var decorated = decorate(list, new Date());
            // 按距离升序（无距离的排后面）
            decorated.sort(function (a, b) {
              var da = a._raw.distanceKm == null ? 999999 : a._raw.distanceKm;
              var db = b._raw.distanceKm == null ? 999999 : b._raw.distanceKm;
              return da - db;
            });
            that.setData({ allGames: decorated, loading: false, activeFilter: 'nearby', games: decorated });
          })
          .catch(function (err) {
            that.setData({ loading: false });
            wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
          });
      },
      fail: function () {
        wx.showModal({
          title: '需要定位权限',
          content: '开启定位后才能查看附近的球局。请在微信设置中允许位置权限。',
          confirmText: '去设置',
          cancelText: '取消',
          success: function (r) {
            if (r.confirm) wx.openSetting();
          },
        });
      },
    });
  },

  applyFilter: function (key) {
    var all = this.data.allGames;
    var kw = this.data._searchKeyword || '';
    if (kw) {
      kw = kw.toLowerCase();
      all = all.filter(function (g) {
        return (g.courtName || '').toLowerCase().indexOf(kw) >= 0 ||
               (g.title || '').toLowerCase().indexOf(kw) >= 0 ||
               (g.district || '').toLowerCase().indexOf(kw) >= 0;
      });
    }
    var nowD = new Date();
    var todayStr = nowD.getFullYear() + '-' + ('0' + (nowD.getMonth() + 1)).slice(-2) + '-' + ('0' + nowD.getDate()).slice(-2);
    // 方案B：区分“历史”与“可见”。已取消/已完成/已过期 或 球局日期早于今天 才算历史；
    // 当天的局（含已打完）当天都可见，次日凌晨才进历史。
    function isHistory(g) {
      var st = (g.status || '').toLowerCase();
      if (st === 'completed' || st === 'cancelled' || st === 'expired') return true;
      var d = (g.matchDate || '').slice(0, 10);
      if (d && d < todayStr) return true; // 日期早于今天 → 历史
      return false; // 今天及以后一律可见（哪怕 cdEnded 为真/今日已打）
    }
    // 排序：非历史按 日期+开始时间 升序（今天/进行中靠前）
    function sortActive(a, b) {
      var ka = (a.matchDate || '') + ' ' + (a.startTime || '');
      var kb = (b.matchDate || '') + ' ' + (b.startTime || '');
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    }
    var list;
    if (key === 'history') {
      // 历史：只看已结束/已过期，按日期倒序（最近的在前）
      list = all.filter(isHistory).sort(function (a, b) { return sortActive(b, a); });
    } else {
      // 非历史 tab：默认排除历史球局
      var actives = all.filter(function (g) { return !isHistory(g); }).sort(sortActive);
      if (key === 'open') {
        list = actives.filter(function (g) { return g.status === 'open' || g.status === 'recruiting'; });
      } else if (key === 'today') {
        list = actives.filter(function (g) { return isToday(g.matchDate); });
      } else if (key === 'circle') {
        list = actives.filter(function (g) { return g.isPrivate; });
      } else if (key === 'doubles') {
        list = actives.filter(function (g) { return g.matchType === 'doubles' || g.matchType === 'mixed_doubles'; });
      } else {
        list = actives;
      }
    }
    this.setData({ activeFilter: key, games: list });
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/game-detail/game-detail?id=' + id });
  },

  goCreate: function () {
    var token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    this.setData({ _needRefresh: true });
    wx.navigateTo({ url: '/pages/create-game/create-game' });
  },

  onSearchTap: function () {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' });
  },

  onLocationTap: function () {
    wx.showToast({ title: '切换城市开发中', icon: 'none' });
  },
});
