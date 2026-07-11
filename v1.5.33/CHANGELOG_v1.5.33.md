# v1.5.33 — 球局/活动历史分区 + 待操作提醒

> 日期：2026-07-11
> 基于 v1.5.32

## 改动

### 1. my-matches（我的球局）— 进行中/历史分区 + 待操作横幅
- 球局分为「📌 进行中」和「📂 历史球局」两个区域
- 历史球局默认折叠，可展开查看（按时间降序）
- 已过时间但未 completed/cancelled 的球局 → 历史
- ⏰ **待操作提醒横幅**：如果你是发起人，有已结束但未确认完成的球局，顶部显示醒目横幅，点击直接跳转到详情页处理

### 2. circle-detail（圈子详情）— 球局/活动 Tab 同步分区
- **圈内球局 Tab**：进行中 / 历史分区，历史折叠
- **圈内活动 Tab**：进行中（近期活动）/ 历史分区，历史折叠
- 进行中按时间升序，历史按时间降序

### 3. 历史判定规则
- 球局：时间已过 / completed / cancelled / full → 历史
- 活动：开始时间已过且已结算/结算中 → 历史

## 涉及文件

| 文件 | 改动说明 |
|------|---------|
| `pages/my-matches/my-matches.js` | 数据分 active/history；新增 `isActiveMatch`/`goDetailByPending`/`toggleHistory` |
| `pages/my-matches/my-matches.wxml` | 待操作横幅 + 进行中/历史分区 + 折叠控制 |
| `pages/my-matches/my-matches.wxss` | 横幅样式 + 分区标签 + 历史卡片弱化 |
| `pages/circle-detail/circle-detail.js` | `loadMatches`/`loadActivities` 分 active/history + toggle 函数 |
| `pages/circle-detail/circle-detail.wxml` | 球局/活动 Tab 分区折叠 |
| `pages/circle-detail/circle-detail.wxss` | 分区标签 + 历史卡片弱化 |

## 存档

- 本地：`outputs/v1.5.33/miniapp`
- Git：`tennis-acebook-codex` 仓库，tag `v1.5.33`
