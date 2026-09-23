# v1.5.86 商家转账结算修复

## 核心修复

- 现金营销（1000）场景：`transfer_scene_report_infos` 改为固定传 `活动名称` + `奖励说明` 两条；`user_recv_perception` 改为 `活动奖励`，不再把业务备注直接传给微信。
- `retrySettlement` 先查询原转账单，不再无条件标记 `settled`；`WAIT_USER_CONFIRM` 时返回确认参数，钱包页可拉起微信收款确认。
- 微信返回的 `package_info` 会暂存在结算记录中，用户关闭确认页后仍可从钱包重试再次拉起确认页。
- 兼容结算分支也按微信真实状态更新，不再在 `WAIT_USER_CONFIRM` 时误标已结算。
- 24 小时自动结算不再直接标记 `settled`：先查询微信单据，`SUCCESS` 才结算；未确认/处理中保持 `confirming`。
- 补缴结算同样只在实际转账 `SUCCESS` 后标记已结算。

## 部署注意

- 场景为 1000 时无需再依赖 `WXPAY_TRANSFER_SCENE_INFO_TYPE=1000`，该变量可保留但会被忽略。
- 仍须确认商户后台已开通“商家转账”且场景 ID 为 1000（现金营销）。
