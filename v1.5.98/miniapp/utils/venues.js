// AceBook 找场地数据（精简版：仅保留可一键跳转的小程序预订平台）
// 跳转需在小程序后台「跳转小程序」名单中登记对应 appid

// 场馆预订小程序（竖排列表展示）
const BOOKING_APPS = [
  { id: 'app_shangyue', name: '上越网球中心-沙河店', desc: '网球场地在线预订', appid: 'wx37ae7794b2ac6dd8', emoji: '🎾' },
  { id: 'app_iszhen', name: 'i深圳', desc: '深圳市政务官方平台 · 体育场馆一键预约', appid: 'wx0ff2b53ff21637f0', emoji: '🏙' },
  { id: 'app_iszt', name: 'i深体', desc: '深圳市体育场馆预约（深圳湾/香蜜/中心公园等）', appid: 'wxea33bdce8cd5fd8e', emoji: '🏟' },
  { id: 'app_nswtb', name: '南山文体通', desc: '南山区公共场馆预约（荔香/粤海等）', appid: 'wx9f30f1cea85e1e8c', emoji: '🎾' },
  { id: 'app_swtb', name: '深铁文体通', desc: '地铁沿线体育场馆预约', appid: 'wx4ac7a768ffcdd5ce', emoji: '🚇' },
  { id: 'app_fsbt', name: '泛思博特网球', desc: '专业网球场馆预订', appid: 'wx2088ca46b47d8be7', emoji: '🏆' },
  { id: 'app_xyh', name: '新益汇网球中心', desc: '网球中心场馆预订', appid: 'wx9127bb0d2c3cefab', emoji: '🎾' },
  { id: 'app_gaoshi', name: '高时运动社区', desc: '高时文体中心场馆预约', appid: 'wx99dd86939adaebd5', emoji: '🏸' },
  { id: 'app_shangku', name: '尚酷网球', desc: '尚酷网球场馆预订', appid: 'wx702009499d3e30ec', emoji: '🎾' },
];

module.exports = { BOOKING_APPS };
