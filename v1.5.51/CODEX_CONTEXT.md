# AceBook 项目上下文 — 完整恢复文件

> 用途：新对话开始时读此文件，即可无缝接手。
> 最后更新：2026-07-16 | 版本 v1.5.51

## 项目概览
- **项目名称**：AceBook（网球社交约球小程序）
- **技术栈**：微信小程序 + TypeScript + tRPC + Drizzle ORM + MySQL
- **域名**：https://tennispro.cn
- **微信 AppID**：wx517c76b146302fe5
- **阿里云服务器**：root@120.78.0.96，PM2 进程 tennispro-new
- **Codex 版本仓库**：git@github.com:cqujgcc-bit/tennis-acebook-codex.git

## 当前版本：v1.5.51
- **修复**: claimAdmin 正确位于 `admin: router({...})` 内部，路径 `admin.claimAdmin` 可用
- 授权码：`ACEBK-SETUP-0716`（一次性，仅首次有效）
- 自动部署管线稳定运行（GitHub Actions 双 Job）

## 版本文件夹规则（重要）
- **v1.5.34 之前**：所有版本共用 v1.5.34 文件夹
- **v1.5.50 起**：每个版本使用独立文件夹（如 v1.5.51/）
- 部署管线自动检测最新版本目录

## 代码位置
| 用途 | 路径 |
|------|------|
| 主工作目录 | `.../tennis-acebook-codex/v1.5.51/` |
| 版本存档 | `.../kai-q/outputs/v1.5.51/` |

## 关键功能
- 圈子系统（创建/加入/管理）
- 圈子活动（发布/报名/AA结算/取消）
- 球局管理（创建/报名/支付/完成/结算）
- 圈子动态（发帖/评论/点赞）
- 成员管理（头像墙/活跃榜/审核）
- 管理员后台（用户管理/教练审核/公告/反馈）
- 管理员初始化（授权码激活）
- 自动部署（GitHub Actions → 阿里云 + 微信体验版）

## 开发工作流
1. 在 `v1.5.xx/` 目录修改代码
2. 每次新版本建新目录
3. `git add v1.5.xx && git commit && git tag v1.5.xx && git push origin main --tags`
4. GitHub Actions 自动部署后端 + 上传体验版
