# v1.5.31 — 功能验证修复 + 球局状态修正 + 圈子活动Tab

> 日期：2026-07-11
> 基于 v1.5.30 activity-create UI 重构

## 改动汇总

| # | 改动 | 类型 | 涉及文件 |
|---|------|------|---------|
| 1 | activity-create 人数步进器边界 + 快捷日期高亮 + picker 文案 | Bug 修复 | activity-create.js/.wxml |
| 2 | 历史球局已结束仍显示"招募中" | Bug 修复 | my-matches.js |
| 3 | circle-detail 球局列表过期状态显示 | Bug 修复 | circle-detail.js |
| 4 | 圈子新增「圈内活动」Tab | 新功能 | circle-detail.js/.wxml |
| 5 | 活动入口点进结算页无法报名 | Bug 修复 | circle-detail.js |

### 1. activity-create 体验修复

- **人数步进器**：`onPickTemplate` 模板填充时增加 `Math.max(2, Math.min(30, …))` clamp
- **快捷日期**：`onLoad` 初始化 `quickDate: 'today'`，页面打开即高亮"今天"
- **日期 picker**：选中今天时显示日期值而非"选其他日期"
- **onMaxChange**：防御性 clamp（2–30）

### 2. 球局结束状态修复

`my-matches.js` 中 `ended` 判断原来仅依赖 `endDt`。无结束时间的球局 `endDt` 为 null，`ended` 始终 false，已过期的球局显示"招募中"。

修复：增加 `(m.endTime || m.startTime || '00:00')` 兜底，确保即使无结束时间，也会用开始时间判断是否过期。

### 3. circle-detail 球局过期判断

新增 `isDatePassed()` 辅助函数，圈内球局列表 Tab 中 `status === 'open'` 的球局如果已过开始时间，显示为"已结束"而非"征集中"。

### 4. 圈内活动 Tab

circle-detail Tab 栏新增「圈内活动」（在"圈内动态"之后），自动加载活动列表并展示卡片（标题、费用标签、日期、场地、人数）。点击卡片导航到 `circle-activities` 列表页（可报名/查看账单）。

### 5. 活动入口修复

`goActivityDetail` 原来导航到 `activity-settle?mode=bill`（结算/账单页），该页面无报名按钮。改为导航到 `circle-activities` 列表页，包含完整报名/取消/结算功能。

## 变更文件清单

| 文件 | 改动说明 |
|------|---------|
| `pages/activity-create/activity-create.js` | 3处修复 |
| `pages/activity-create/activity-create.wxml` | 1处修复 |
| `pages/my-matches/my-matches.js` | 1处逻辑 |
| `pages/circle-detail/circle-detail.js` | 新增 `isDatePassed` / `loadActivities` / `goActivityDetail` 重定向 |
| `pages/circle-detail/circle-detail.wxml` | 新增活动 Tab + 活动列表卡片 |

## 存档位置

- 本地：`outputs/v1.5.31/miniapp`
- Git：`tennis-acebook-codex` 仓库，tag `v1.5.31`
