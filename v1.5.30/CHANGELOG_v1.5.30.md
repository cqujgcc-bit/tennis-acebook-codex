# AceBook v1.5.30 — 活动创建页 UI 重构

**发布日期**：2026-07-08 | **AppID**：`wx517c76b146302fe5`

## 概述
活动创建表单全面重构：配色对齐 app 设计系统、表单分区、快速日期选择、时间联排、步进器人数选择、费用模式视觉升级。

## 变更文件

### pages/activity-create/activity-create.wxss（完全重写）
- 色值全部对齐：`#1aad19` → `#0B3D2E`、`#f5f6f8` → `#F4F6F5`、`#999` → `#8A968F`
- 圆角 `16rpx` → `24rpx`（统一卡片圆角）
- 新增 13 个组件样式：`.form-section` / `.section-accent` / `.date-chip` / `.time-row` / `.stepper-row` / `.fee-row` / `.create-bar` 等
- 卡片入场动画 `ab-card-enter`（4 个分区依次入场）
- 底部栏改用 blur 毛玻璃效果，对齐首页 dock

### pages/activity-create/activity-create.wxml（完全重写）
- 9 个平铺字段 → 4 个分区卡片（活动信息 / 时间设置 / 场地与人数 / 费用）
- 每个分区左侧绿色渐变色带装饰
- 新增快速日期选择：今天 / 明天 / 后天 + 自定义日期 picker
- 时间字段合并为联排：开始时间 [至] 结束时间
- 人数上限改用步进器（− / +）
- 费用模式改用图标卡片选择（免费 🆓 / AA 💸），选中态墨绿+网球黄
- 底部栏：存为模板（ghost）+ 发布活动（primary）

### pages/activity-create/activity-create.js（增量修改）
- 新增 `todayDate` / `quickDate` 数据字段
- 新增 `onQuickDate(e)` — 快速日期选中
- 新增 `onStepMax(e)` — 人数步进

## 影响范围
- **仅** `pages/activity-create/` 三个文件
- 其他页面 / 后端 / 数据库：零变动
