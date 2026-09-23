# v1.5.81 — 结算全面修复+重试打款功能

> 日期：2026-07-24
> 基于 v1.5.80

## 修复清单

### 结算逻辑
- settleFen 不再扣除 organizerShareFen（发起人已垫付场地费）
- divisor 不变（分母包含发起人，按人头分摊）
- 参与者多退少补逻辑保留，发起人最终得到：实收 - 退款

### 转账API
- 移除旧版 `/v3/transfer/batches`（已废弃）
- 改用新版 `POST /v3/fund-app/mch-transfer/transfer-bills`
- 添加 `transfer_scene_id: "1000"`（新版接口需要）
- 添加完整日志记录每步执行情况

### 新增重试功能
- 后端 `match.retrySettlement` API
- 前端「我的钱包」页面增加"重试打款"入口
- 历史结算卡住的球局可在此重新发起打款

### 日志
- 结算时打印 totalPaid/settleFen/payeeOpenid 等信息
- transferToUser 调用前后打印日志
- retrySettlement 全程日志
