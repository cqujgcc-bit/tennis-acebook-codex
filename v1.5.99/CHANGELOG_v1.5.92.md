# v1.5.92 场景 1005 补齐转账场景报备信息

## 背景

v1.5.91 不再传 `user_recv_perception` 后，微信返回：
`PARAM_ERROR: 未传入完整且对应的转账场景报备信息，请根据接口文档检查`。

官方《佣金报酬》场景文档（4013774590）确认：场景 `1005` 的
`transfer_scene_report_infos` 必须固定传两条明细：
`岗位类型` + `报酬说明`；`user_recv_perception` 可不传，默认展示“劳务报酬”。

## 修复内容

- `wxpay.ts`：场景 `1005` 时 `transfer_scene_report_infos` 固定传两条报备信息：
  - `岗位类型`：球局发起人
  - `报酬说明`：球局费用结算
- 场景 `1000` 仍传“活动名称/奖励说明”，`user_recv_perception` 规则保持 v1.5.91。

## 使用方式

部署后先用 `auth.debugRetrySettlement`（`dryRun: true`）确认配置，再对球局 65 发起真实重试：
- 返回 `WAIT_USER_CONFIRM + packageInfo`：转账创建成功，等待用户在微信确认收款。
- 若微信继续报错：记录完整错误码/文案，继续按场景 `1005` 要求调整。

## 待办

- 验证球局 65 真实转账创建成功并完成微信收款确认。
