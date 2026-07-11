# v1.5.30-test1 — 球局状态修复 + 圈子活动Tab

> 日期：2026-07-11
> 基于 v1.5.30 activity-create UI 重构版本

## 修复内容

### 问题一：已结束球局显示"招募中"

**根因**：`my-matches.js` 的 `decorate` 函数中 `ended` 仅判断结束时间（`endDt`）。如果球局没有设置结束时间，`endDt` 为 null，`ended` 为 false，导致球局过了开始时间仍然显示"招募中"。

**涉及文件**：
- `pages/my-matches/my-matches.js` — `decorate` 函数中 `ended` 判断增加 `m.startTime || '00:00'` 兜底
- `pages/circle-detail/circle-detail.js` — 球局列表增加 `isDatePassed()` 辅助函数，open 状态的球局如已过开始时间，状态显示为"已结束"

### 问题二：圈内活动发布后看不到

**根因**：circle-detail 页面只有「圈内动态」「圈内球局」「活跃榜」三个 Tab，「圈内活动」列表页（circle-activities）只能通过"发起活动"→"休闲约球"入口进入，入口标签是"发起"而非"查看"，用户找不到。

**涉及文件**：
- `pages/circle-detail/circle-detail.wxml` — Tab 栏增加「圈内活动」；新增活动列表卡片渲染（复用 `match-card` 样式）；空状态提示
- `pages/circle-detail/circle-detail.js` — 增加 `activities` 数据字段、`loadActivities()` 加载函数、`switchTab` 切换到 activities Tab 时自动加载、`goActivityDetail` 导航到结算/账单页

## 改动文件清单

| 文件 | 改动类型 |
|------|---------|
| `pages/my-matches/my-matches.js` | Bug 修复（1 行逻辑变更） |
| `pages/circle-detail/circle-detail.js` | 新功能 + Bug 修复（~80 行新增） |
| `pages/circle-detail/circle-detail.wxml` | 新功能（~30 行新增） |

## 测试说明

1. 球局状态：在"历史球局"中，已过开始时间但没有结束时间的球局应显示"已结束"而非"招募中"
2. 圈内活动：进入圈子详情页，Tab 栏应有"圈内活动"，点击后显示活动列表
3. 活动列表卡片点击应跳转到 activity-settle 账单页
