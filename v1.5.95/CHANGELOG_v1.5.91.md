# v1.5.91 场景 1005 不再传 user_recv_perception

## 背景

v1.5.90 切换商家转账场景 `1005`（佣金报酬）后，真实重试球局 65 时微信返回：
`INVALID_REQUEST: 暂不支持展示当前传入的用户收款感知`。

## 修复内容

- `wxpay.ts`：场景 `1005` 时 `buildUserRecvPerception` 返回空字符串，转账请求不再携带 `user_recv_perception`。
- 场景 `1000` 仍传固定文案“现金奖励”。

## 使用方式

部署后先用 `auth.debugRetrySettlement`（`dryRun: true`）确认配置，再对球局 65 发起真实重试：
- 返回 `WAIT_USER_CONFIRM + packageInfo`：转账创建成功，等待用户在微信确认收款。
- 若微信继续报错：记录完整错误码/文案，按场景 `1005` 要求补 `transfer_scene_report_infos` 或 `user_name`。

## 待办

- 验证球局 65 真实转账创建成功并完成微信收款确认。
