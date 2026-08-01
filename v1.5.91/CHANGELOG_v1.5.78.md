# v1.5.78 — 转账接口升级为新版商家转账API

> 日期：2026-07-24
> 基于 v1.5.77

## 修复
- 微信商户号升级后，旧版 `/v3/transfer/batches` 接口返回 `NO_AUTH`
- 改为新版接口：`POST /v3/fund-app/mch-transfer/transfer-bills`
- 请求格式从 batch 方式简化为单笔转账

## 涉及文件
| 文件 | 改动 |
|------|------|
| `server/server/wxpay.ts` | transferToUser 改用新版 API 地址和参数格式 |
