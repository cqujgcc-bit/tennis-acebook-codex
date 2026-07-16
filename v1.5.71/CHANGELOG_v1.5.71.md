# v1.5.71 — 平台财务管理（基于 v1.5.59）

> 日期：2026-07-16
> 基于 v1.5.59（注册时半自动填充微信昵称）

## 新增功能

### 💰 平台财务管理后台（管理员专属）
- **财务总览面板**：累计收款、已结算、待结算、已退款、平台当前余额一目了然
- **订单与球局统计**：总订单/已支付/已结算/已退款数量，总球局/已完成/已结算数量
- **结算记录列表**：按时间倒序展示所有结算记录（球局标题、发起人、金额、状态）
- **平台资金流水**：完整交易日志，每一笔资金的进出都有记录

### 🔒 资金安全控制
- **管理员提现机制**：仅管理员可在后台发起提现操作，提现金额不能超过平台可用余额
- **资金流水追踪**：所有提现操作写入 `platform_transactions` 表，记录操作管理员、金额、余额快照
- **余额快照表**：`platform_balance` 实时记录平台可用余额、待结算、累计收款/结算/退款/提现

### 🎯 完整流程
- ✅ 发起人先垫付球场费用（线下）
- ✅ 报名人AA支付费用给平台（已有功能）
- ✅ 球局结束后发起人确认完成（已有功能）
- ✅ 确认完成后立即打款给发起人（已有功能）
- ✅ **费用放在小程序商户号中，平台不能擅自提现**
- ✅ **仅管理员操作才能提现，且全程留痕审计**

## 涉及文件
| 文件 | 改动说明 |
|------|---------|
| `drizzle/schema.ts` | 新增 `platformTransactions` 和 `platformBalance` 表 |
| `server/db.ts` | 新增 `getPlatformFinanceOverview`、`getAllSettlements`、`recordPlatformTransaction` |
| `server/routers.ts` | 新增 `admin.finance` 子路由（overview/settlements/transactions/withdraw） |
| `miniapp/utils/api.js` | 新增 `admin.finance` 方法 |
| `miniapp/pages/admin-finance/` | 新增完整财务管理页面（js/wxml/wxss/json） |
| `miniapp/pages/admin/admin.wxml` | 管理后台菜单新增「平台财务管理」入口 |
| `CODEX_CONTEXT.md` | 更新为 v1.5.71 |

## 使用方法
1. 进入管理后台 → 点击「平台财务管理」
2. 查看平台财务总览
3. 如需提现，在页面底部输入金额和用途说明，点击「发起提现」
4. 所有操作记录在平台资金流水中，可审计追溯
