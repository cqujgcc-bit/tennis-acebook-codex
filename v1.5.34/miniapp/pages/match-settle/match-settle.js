var api = require('../../utils/api.js');

Page({
  data: {
    matchId: 0,
    loading: true,
    submitting: false,
    title: '',
    totalFeeYuan: '0.00',
    totalFeeFen: 0,
    payList: [],          // [{userId,name,avatar,paidYuan,paidFen,attended}]
    organizerName: '我（发起人）',
    organizerAttended: true,  // 发起人本人是否到场（到场则一同分摊场地费）
    attendedCount: 0,     // 付费到场人数
    divisor: 0,           // 分摊总人数（含发起人）
    perPersonYuan: '0.00',
    organizerShareYuan: '0.00',
    settleToMeYuan: '0.00',
    preview: []
  },

  onLoad: function (opts) {
    var id = Number(opts.id || opts.matchId || 0);
    this.setData({ matchId: id });
    this.load(id);
  },

  load: function (id) {
    var that = this;
    api.match.getById(id).then(function (res) {
      var m = (res && res.match) ? res.match : {};
      var author = (res && res.author) ? res.author : {};
      var participants = (res && res.participants) ? res.participants : [];
      var payList = [];
      var totalPaidFen = 0;
      participants.forEach(function (p) {
        var ps = p.paymentStatus || '';
        if (ps === 'paid' || ps === 'partial_refunded') {
          var u = p.user || {};
          var paidYuan = Number(p.paidAmount != null && Number(p.paidAmount) > 0 ? p.paidAmount : (m.feePerPerson || 0));
          var paidFen = Math.round(paidYuan * 100);
          totalPaidFen += paidFen;
          payList.push({
            userId: u.id || p.userId,
            name: u.name || '球友',
            avatar: u.avatar || '',
            paidYuan: paidYuan.toFixed(2),
            paidFen: paidFen,
            attended: true
          });
        }
      });
      var totalFeeFen = (m.courtTotalFee && Number(m.courtTotalFee) > 0)
        ? Math.round(Number(m.courtTotalFee) * 100)
        : totalPaidFen;
      that.setData({
        loading: false,
        title: m.title || '球局结算',
        organizerName: (author.name ? author.name + '（发起人·我）' : '我（发起人）'),
        payList: payList,
        totalFeeFen: totalFeeFen,
        totalFeeYuan: (totalFeeFen / 100).toFixed(2)
      });
      that.recompute();
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
    });
  },

  onToggle: function (e) {
    var idx = e.currentTarget.dataset.index;
    var list = this.data.payList;
    list[idx].attended = !list[idx].attended;
    this.setData({ payList: list });
    this.recompute();
  },

  // 切换发起人本人是否到场
  onToggleOrganizer: function () {
    this.setData({ organizerAttended: !this.data.organizerAttended });
    this.recompute();
  },

  recompute: function () {
    var list = this.data.payList;
    var totalFeeFen = this.data.totalFeeFen;
    var organizerAttended = this.data.organizerAttended;
    var attended = list.filter(function (x) { return x.attended; });
    var attendedCount = attended.length;
    // 分摊总人数 = 付费到场人数 + (发起人到场 ? 1 : 0)
    var divisor = attendedCount + (organizerAttended ? 1 : 0);
    var preview = [];
    var perFen = 0;
    if (divisor > 0) {
      perFen = Math.round(totalFeeFen / divisor);
    }
    var refundTotalFen = 0;
    list.forEach(function (x) {
      if (!x.attended) {
        preview.push({ userId: x.userId, name: x.name, type: 'absent', text: '缺席·不退款扣分' });
        return;
      }
      var diff = x.paidFen - perFen;
      if (diff > 0) {
        refundTotalFen += diff;
        preview.push({ userId: x.userId, name: x.name, type: 'refund', text: '退 ¥' + (diff / 100).toFixed(2) });
      } else if (diff < 0) {
        preview.push({ userId: x.userId, name: x.name, type: 'topup', text: '补缴 ¥' + ((-diff) / 100).toFixed(2) });
      } else {
        preview.push({ userId: x.userId, name: x.name, type: 'equal', text: '无需多退少补' });
      }
    });
    // 发起人自付份额 + 结算到我的金额
    var totalPaidFen = list.reduce(function (s, x) { return s + x.paidFen; }, 0);
    var organizerShareFen = organizerAttended ? perFen : 0;
    var settleToMeFen = totalPaidFen - refundTotalFen - organizerShareFen;
    if (settleToMeFen < 0) settleToMeFen = 0;
    this.setData({
      attendedCount: attendedCount,
      divisor: divisor,
      perPersonYuan: (perFen / 100).toFixed(2),
      organizerShareYuan: (organizerShareFen / 100).toFixed(2),
      settleToMeYuan: (settleToMeFen / 100).toFixed(2),
      preview: preview
    });
  },

  onSubmit: function () {
    if (this.data.submitting) return;
    var that = this;
    var list = this.data.payList;
    var organizerAttended = this.data.organizerAttended;
    if (list.length === 0) {
      // 无付费者，直接走普通确认完成
      this.doConfirm(null, organizerAttended);
      return;
    }
    var attendedCount = list.filter(function (x) { return x.attended; }).length;
    var divisor = attendedCount + (organizerAttended ? 1 : 0);
    if (divisor === 0) {
      wx.showToast({ title: '到场人数不能为 0', icon: 'none' });
      return;
    }
    var attendance = list.map(function (x) { return { userId: Number(x.userId), attended: !!x.attended }; });
    var orgText = organizerAttended ? '（含您本人，共 ' + divisor + ' 人分摊）' : '（您本人未到场，不分摊）';
    wx.showModal({
      title: '确认结算',
      content: '将按 ' + attendedCount + ' 位球友到场' + orgText + '重算场地费并多退少补，确认后不可撤销。',
      confirmText: '确认结算',
      confirmColor: '#0B3D2E',
      success: function (r) {
        if (r.confirm) that.doConfirm(attendance, organizerAttended);
      }
    });
  },

  doConfirm: function (attendance, organizerAttended) {
    var that = this;
    var matchId = this.data.matchId;
    this.setData({ submitting: true });
    wx.showLoading({ title: '结算中...', mask: true });
    api.match.confirmComplete(matchId, attendance, organizerAttended).then(function (r) {
      wx.hideLoading();
      that.setData({ submitting: false });
      wx.showToast({ title: '结算完成', icon: 'success', duration: 2000 });
      var pages = getCurrentPages();
      var prev = pages[pages.length - 2];
      if (prev && typeof prev.loadDetail === 'function') { prev.loadDetail(); }
      setTimeout(function () { wx.navigateBack(); }, 1500);
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ submitting: false });
      wx.showToast({ title: (err && err.message) || '结算失败', icon: 'none' });
    });
  }
});
