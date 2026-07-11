# AceBook 项目上下文 — Codex 对话恢复文件

> 用途：新对话开始时，Codex 先读此文件，即可恢复到本次对话结束时的工作位置。
> 最后更新：2026-07-11

## 项目概览

- **项目名称**：AceBook（网球社交约球小程序）
- **技术栈**：微信小程序（WXML/WXSS/JS）+ TypeScript + tRPC + Drizzle ORM + MySQL
- **域名**：`https://tennispro.cn`
- **AppID**：`wx517c76b146302fe5`
- **Manus 原始仓库**：GitHub Actions 自动部署到阿里云（`git push main` 触发）
- **Codex 版本仓库**：`git@github.com:cqujgcc-bit/tennis-acebook-codex.git`（SSH 已配好）

## 当前版本：v1.5.31

### 版本演进历史

| 版本 | 日期 | 说明 | 改动范围 |
|---|---|---|---|
| v1.5.28 | 2026-07-06 | 运动风尚 CSS 动画升级（纯 WXSS） | 全局 app.wxss + 5 个页面 wxss |
| v1.5.29 | 2026-07-08 | 圈子活动+球局入口合并 | circle-detail 三个文件 |
| v1.5.30 | 2026-07-08 | 活动创建页 UI 重构 | activity-create 三个文件 |
| v1.5.30-test1 | 2026-07-09 | activity-create 功能验证修复 | activity-create.js/.wxml |
| **v1.5.31** | **2026-07-11** | **球局状态+圈子活动Tab+活动入口修复** | **详见 CHANGELOG** |

### v1.5.31 改动
1. activity-create 体验修复（人数 clamp、快捷日期高亮、picker 文案）
2. 历史球局已结束显示"招募中" → 修复为根据时间判断
3. circle-detail 球局列表过期状态判断
4. 圈子新增「圈内活动」Tab
5. 活动入口点进结算页无法报名 → 改为导航到活动列表页

## 关键决策记录

### 活动与球局的关系
- **结论**：两个功能有必要同时存在，但入口应合一
- 圈内球局（`tennisMatches` 表）：完整球局流程
- 圈子活动（`circleActivities` 表）：社交+AA结算
- 后端两套表保持独立，前端通过统一入口+类型选择路由

### 存档体系（2026-07-11 约定）
- 每次改动创建独立版本文件夹（如 `v1.5.31`），不覆盖旧版本
- 本地存档：`/Users/chenchong/Documents/Codex/2026-07-09/kai-q/outputs/`
- Git 仓库：`tennis-acebook-codex`，每个版本一个 tag，推送到 GitHub

## 架构关键点

### 球局状态流转
```
status: open → full → completed / cancelled
显示逻辑：有结束时间则用结束时间，否则用开始时间判断是否过期
```

### 发起人身份
- 发起人存在 `tennisMatches.authorId`，不在 `matchParticipants` 表

### 圈子双轨制
- 圈内球局：`tennisMatches` 表，`circleOnly=true` + `circleId`
- 圈子活动：`circleActivities` 表，独立流程（AA结算/模板/重复发布）
