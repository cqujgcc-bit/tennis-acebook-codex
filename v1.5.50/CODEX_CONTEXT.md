# AceBook 项目上下文 — v1.5.34

> 最后更新：2026-07-11

## 当前版本：v1.5.34

### 版本演进

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.5.32 | 2026-07-11 | 活动报名墙+排序过滤+历史活动折叠 |
| v1.5.33 | 2026-07-11 | 球局/活动历史分区+待操作提醒 |
| **v1.5.34** | **2026-07-11** | **活动取消功能（前端+后端）** |

### v1.5.34 改动
1. 后端 `routers.ts` `circle.cancelActivity`（仅发起人、未结算）
2. 前端 `circle-activities` 取消按钮（红色）

### 后端代码
- 修改 `server/server/routers.ts` 中的 circle 区块
- 完整复现部署即可

### 存档规则
- 独立版本文件夹 `outputs/v1.5.xx/`
- Git tag `v1.5.xx`，推送到 GitHub

### 代码仓库
- `git@github.com:cqujgcc-bit/tennis-acebook-codex.git`
