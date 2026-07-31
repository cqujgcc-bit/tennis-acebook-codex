# v1.5.89 转账结果回调修复 + 线上诊断重试接口

## 修复内容

- 修复商家转账结果回调：服务器未配置 `WXPAY_PUBLIC_KEY` 时，`/api/wxpay/transfer-notify` 之前会把所有微信回调判为签名失败并返回 401，导致用户确认收款后 App 一直不更新“已结算”。现在与支付回调一致，未配置公钥时跳过签名校验并记录告警，确保转账结果能落库。
- 微信 API 请求错误现在会返回完整响应体和 `request-id`，不再出现无法定位原因的 JSON 解析错误。
- 新增带临时密钥的诊断接口：
  - `auth.debugSettlementList`：查看最近 100 条结算记录的 `status / wxBatchId / 是否暂存收款确认包`。
  - `auth.debugRetrySettlement`：可 `dryRun` 查看状态，也可真实复现“重试打款”流程，返回微信转账 API 的完整结果或错误详情。

## 使用方式

部署后可直接用密钥调用 `auth.debugRetrySettlement` 对球局 65 做一次真实重试，观察：
- `WAIT_USER_CONFIRM + packageInfo`：转账已创建，等待用户在微信确认收款。
- 返回 `transfer-failed + error`：拿到微信 API 的具体错误码，继续修参数或开通商户权限。

## 待办

- 确认球局 65 转账创建成功并完成微信收款确认。
- 收款到账后由回调自动把结算记录改为 `settled`。
- 后续版本移除临时诊断接口与临时密钥。
