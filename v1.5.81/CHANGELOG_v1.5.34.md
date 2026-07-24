# v1.5.34 — 活动取消功能

> 日期：2026-07-11
> 基于 v1.5.33

## 改动

### 新增功能：发起人可取消活动

**后端**：
- `server/routers.ts` — 新增 `circle.cancelActivity` mutation
  - 验证发起人身份
  - 已结算的不能取消
  - 已取消的不能重复取消
  - 清除所有报名记录，状态设为 `cancelled`

**前端**：
- `utils/api.js` — 新增 `cancelActivity` 接口
- `circle-activities.js` — 新增 `onCancelActivity` 函数
- `circle-activities.wxml` — 取消活动按钮（仅发起人、未结算时显示）
- `circle-activities.wxss` — 新增 `.btn-del` 红色按钮样式

### 用户交互
1. 发起人打开活动列表
2. 未结算的活动卡片显示红色「取消活动」按钮
3. 点击 → 弹窗确认 → 确认后清空报名并标记已取消

## 涉及文件

| 文件 | 改动说明 |
|------|---------|
| `server/routers.ts` | 新增 `cancelActivity` mutation |
| `miniapp/utils/api.js` | 新增 `cancelActivity` 调用 |
| `miniapp/pages/circle-activities/circle-activities.js` | 新增 `onCancelActivity` |
| `miniapp/pages/circle-activities/circle-activities.wxml` | 取消按钮（活跃+历史） |
| `miniapp/pages/circle-activities/circle-activities.wxss` | 红色按钮样式 |

## 存档

- 本地：`outputs/v1.5.34/miniapp` + `server/`
- Git：`tennis-acebook-codex` 仓库，tag `v1.5.34`
