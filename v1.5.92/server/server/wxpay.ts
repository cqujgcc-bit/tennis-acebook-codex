/**
 * 微信支付 APIv3 工具模块
 *
 * 商户号等配置通过环境变量注入，认证通过后填入即可启用：
 *   WXPAY_MCH_ID        - 商户号（10位数字）
 *   WXPAY_API_V3_KEY    - APIv3 密钥（32字节字符串）
 *   WXPAY_SERIAL_NO     - 商户证书序列号
 *   WXPAY_PRIVATE_KEY   - 商户私钥（PEM 格式，换行用 \n）
 *   WXPAY_NOTIFY_URL    - 支付回调地址（https://your-domain/api/wxpay/notify）
 *   WXPAY_PUBLIC_KEY_ID - 微信支付公钥 ID（公钥模式，用于回调签名验证）
 *   WXPAY_PUBLIC_KEY    - 微信支付公钥内容（PEM 格式，从商户平台下载）
 *
 * 在商户号未配置时，所有接口返回 mock 数据，方便前端开发调试。
 */

import crypto from "crypto";

// ─── 配置 ─────────────────────────────────────────────────────────────────────
export const wxpayConfig = {
  appId: process.env.WECHAT_APP_ID || "",
  mchId: process.env.WXPAY_MCH_ID || "",
  apiV3Key: process.env.WXPAY_API_V3_KEY || "",
  serialNo: process.env.WXPAY_SERIAL_NO || "",
  privateKey: (process.env.WXPAY_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  notifyUrl: process.env.WXPAY_NOTIFY_URL || "",
  transferNotifyUrl: process.env.WXPAY_TRANSFER_NOTIFY_URL || "",
  transferSceneId: process.env.WXPAY_TRANSFER_SCENE_ID || "",
  transferSceneInfoType: process.env.WXPAY_TRANSFER_SCENE_INFO_TYPE || "",
  // 微信支付公钥模式（新商户默认使用）
  publicKeyId: process.env.WXPAY_PUBLIC_KEY_ID || "",
  publicKey: (process.env.WXPAY_PUBLIC_KEY || "").replace(/\\n/g, "\n"),
};

export const isWxpayConfigured = () =>
  !!(wxpayConfig.mchId && wxpayConfig.apiV3Key && wxpayConfig.serialNo && wxpayConfig.privateKey);

// 暂存到 match_settlements.disputeReason 的收款确认包前缀（无异议时该列为空）
export const WX_PACKAGE_PREFIX = "WXPKG:";
export function encodeTransferPackageInfo(packageInfo?: string): string | null {
  return packageInfo ? `${WX_PACKAGE_PREFIX}${packageInfo}` : null;
}
export function decodeTransferPackageInfo(stored?: string | null): string | undefined {
  if (!stored || !stored.startsWith(WX_PACKAGE_PREFIX)) return undefined;
  return stored.slice(WX_PACKAGE_PREFIX.length);
}

export function isValidOutBillNo(value: string): boolean {
  return /^[A-Za-z0-9]{1,32}$/.test(value);
}

// ─── 商家转账场景参数 ──────────────────────────────────────────────────────────
function buildTransferSceneReportInfos(sceneId: string, remark: string): Array<{ info_type: string; info_content: string }> {
  if (sceneId === "1000") {
    const activityName = (remark || "")
      .replace(/^球局「/, "")
      .replace(/」结算.*$/, "")
      .slice(0, 32) || "球局活动";
    return [
      { info_type: "活动名称", info_content: activityName },
      { info_type: "奖励说明", info_content: "球局费用结算给发起人" },
    ];
  }
  // 佣金报酬场景固定传两条报备信息：岗位类型 + 报酬说明（微信官方文档 4013774590）。
  if (sceneId === "1005") {
    return [
      { info_type: "岗位类型", info_content: "球局发起人" },
      { info_type: "报酬说明", info_content: "球局费用结算" },
    ];
  }
  if (wxpayConfig.transferSceneInfoType) {
    return [{ info_type: wxpayConfig.transferSceneInfoType, info_content: remark.slice(0, 32) }];
  }
  return [];
}

function buildUserRecvPerception(sceneId: string): string {
  // 微信商家转账只接受固定的收款感知文案。
  if (sceneId === "1000") return "现金奖励";
  // 场景 1005 传"佣金报酬"会被微信拒绝（暂不支持展示当前传入的用户收款感知），返回空字符串表示不传该字段。
  if (sceneId === "1005") return "";
  return "";
}

// ─── 签名工具 ─────────────────────────────────────────────────────────────────
function generateNonce(len = 32): string {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}

function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function signMessage(message: string): string {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message);
  return sign.sign(wxpayConfig.privateKey, "base64");
}

function buildAuthHeader(method: string, url: string, body: string): string {
  const nonce = generateNonce();
  const ts = getTimestamp();
  const urlObj = new URL(url);
  const canonicalUrl = urlObj.pathname + (urlObj.search || "");
  const message = `${method}\n${canonicalUrl}\n${ts}\n${nonce}\n${body}\n`;
  const signature = signMessage(message);
  return (
    `WECHATPAY2-SHA256-RSA2048 mchid="${wxpayConfig.mchId}",` +
    `nonce_str="${nonce}",timestamp="${ts}",` +
    `serial_no="${wxpayConfig.serialNo}",signature="${signature}"`
  );
}

async function wxpayRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: object
): Promise<T> {
  const url = `https://api.mch.weixin.qq.com${path}`;
  const bodyStr = body ? JSON.stringify(body) : "";
  const authHeader = buildAuthHeader(method, url, bodyStr);

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader,
    },
    body: bodyStr || undefined,
  });

  const resText = await res.text();
  let data: any;
  try {
    data = resText ? JSON.parse(resText) : {};
  } catch {
    data = { rawBody: resText.slice(0, 500) };
  }
  if (!res.ok) {
    const requestId = (res.headers.get("request-id") || res.headers.get("x-request-id") || "");
    throw new Error(`WxPay API error ${res.status}${requestId ? ` requestId=${requestId}` : ""}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ─── 生成平台订单号 ────────────────────────────────────────────────────────────
export function generateOrderId(): string {
  const now = new Date();
  const ymd =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `MO${ymd}${rand}`;
}

// ─── 预下单（小程序支付）─────────────────────────────────────────────────────
export interface PrepayResult {
  prepayId: string;
  // 返回给小程序的支付参数
  timeStamp: string;
  nonceStr: string;
  packageStr: string; // "prepay_id=xxx"
  signType: "RSA";
  paySign: string;
}

export async function createPrepay(params: {
  orderId: string;
  description: string;
  amountFen: number; // 分
  openid: string;
  notifyUrl?: string;
}): Promise<PrepayResult> {
  if (!isWxpayConfigured()) {
    // Mock 模式：返回假数据，方便前端开发
    const ts = getTimestamp();
    const nonce = generateNonce(16);
    return {
      prepayId: `mock_prepay_${params.orderId}`,
      timeStamp: ts,
      nonceStr: nonce,
      packageStr: `prepay_id=mock_prepay_${params.orderId}`,
      signType: "RSA",
      paySign: "MOCK_SIGN",
    };
  }

  const notifyUrl = params.notifyUrl || wxpayConfig.notifyUrl;
  const resp = await wxpayRequest<{ prepay_id: string }>(
    "POST",
    "/v3/pay/transactions/jsapi",
    {
      appid: wxpayConfig.appId,
      mchid: wxpayConfig.mchId,
      description: params.description,
      out_trade_no: params.orderId,
      notify_url: notifyUrl,
      amount: { total: params.amountFen, currency: "CNY" },
      payer: { openid: params.openid },
    }
  );

  const ts = getTimestamp();
  const nonce = generateNonce(16);
  const packageStr = `prepay_id=${resp.prepay_id}`;
  const signMsg = `${wxpayConfig.appId}\n${ts}\n${nonce}\n${packageStr}\n`;
  const paySign = signMessage(signMsg);

  return {
    prepayId: resp.prepay_id,
    timeStamp: ts,
    nonceStr: nonce,
    packageStr,
    signType: "RSA",
    paySign,
  };
}

// ─── 查询订单状态 ────────────────────────────────────────────────────────────────
/**
 * 查询微信侧订单状态
 * @returns trade_state: SUCCESS | REFUND | NOTPAY | CLOSED | REVOKED | USERPAYING | PAYERROR
 */
export async function queryOrder(orderId: string): Promise<{ trade_state: string; trade_state_desc: string } | null> {
  if (!isWxpayConfigured()) return null;
  try {
    const resp = await wxpayRequest<{ trade_state: string; trade_state_desc: string }>(
      "GET",
      `/v3/pay/transactions/out-trade-no/${orderId}?mchid=${wxpayConfig.mchId}`,
      undefined
    );
    return resp;
  } catch {
    return null;
  }
}

// ─── 申请退款 ─────────────────────────────────────────────────────────────────
export async function refundOrder(params: {
  orderId: string;
  refundId: string;
  totalFen: number;
  refundFen: number;
  reason: string;
}): Promise<{ refundId: string; status: string }> {
  if (!isWxpayConfigured()) {
    return { refundId: `mock_refund_${params.refundId}`, status: "SUCCESS" };
  }

  const resp = await wxpayRequest<{ refund_id: string; status: string }>(
    "POST",
    "/v3/refund/domestic/refunds",
    {
      out_trade_no: params.orderId,
      out_refund_no: params.refundId,
      reason: params.reason,
      amount: {
        refund: params.refundFen,
        total: params.totalFen,
        currency: "CNY",
      },
    }
  );

  return { refundId: resp.refund_id, status: resp.status };
}

// ─── 企业付款到零钱（结算给发起者）──────────────────────────────────────────
export async function transferToUser(params: {
  batchId: string;
  openid: string;
  amountFen: number;
  remark: string;
}): Promise<{ batchId: string; transferBillNo?: string; status: string; packageInfo?: string }> {
  console.log(`[transferToUser] calling amountFen=${params.amountFen} hasOpenid=${!!params.openid}`);
  if (!isWxpayConfigured()) {
    console.log(`[transferToUser] MOCK mode`);
    return { batchId: params.batchId, status: "SUCCESS" };
  }

  if (!wxpayConfig.transferNotifyUrl || !wxpayConfig.transferSceneId) {
    throw new Error("商家转账配置不完整：请配置 WXPAY_TRANSFER_NOTIFY_URL、WXPAY_TRANSFER_SCENE_ID");
  }

  const reportInfos = buildTransferSceneReportInfos(wxpayConfig.transferSceneId, params.remark);
  const userRecvPerception = buildUserRecvPerception(wxpayConfig.transferSceneId);
  const body: Record<string, unknown> = {
    appid: wxpayConfig.appId,
    out_bill_no: params.batchId,
    transfer_amount: params.amountFen,
    transfer_remark: params.remark,
    openid: params.openid,
    notify_url: wxpayConfig.transferNotifyUrl,
    transfer_scene_id: wxpayConfig.transferSceneId,
  };
  if (reportInfos.length > 0) {
    body.transfer_scene_report_infos = reportInfos;
  }
  if (userRecvPerception) {
    body.user_recv_perception = userRecvPerception;
  }

  // 新版商家转账到零钱接口（v3 升级版）
  const resp = await wxpayRequest<{
    out_bill_no: string;
    transfer_bill_no: string;
    state: "ACCEPTED" | "PROCESSING" | "WAIT_USER_CONFIRM" | "TRANSFERING" | "SUCCESS" | "FAIL" | "CANCELING" | "CANCELLED";
    package_info?: string;
  }>(
    "POST",
    "/v3/fund-app/mch-transfer/transfer-bills",
    body
  );

  console.log(`[transferToUser] SUCCESS out_bill_no=${resp.out_bill_no}`);
  return { batchId: resp.out_bill_no, transferBillNo: resp.transfer_bill_no, status: resp.state, packageInfo: resp.package_info };
}

// ─── 商户单号查询转账单 ─────────────────────────────────────────────────────────
export async function queryTransferBill(outBillNo: string): Promise<{
  outBillNo: string;
  transferBillNo?: string;
  state: string;
  failReason?: string;
}> {
  if (!isWxpayConfigured()) {
    return { outBillNo, state: "SUCCESS" };
  }
  const resp = await wxpayRequest<{
    mch_id: string;
    out_bill_no: string;
    transfer_bill_no: string;
    appid: string;
    state: string;
    transfer_amount: number;
    transfer_remark: string;
    fail_reason?: string;
    openid: string;
    create_time: string;
    update_time: string;
  }>(
    "GET",
    `/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${encodeURIComponent(outBillNo)}`
  );
  return {
    outBillNo: resp.out_bill_no,
    transferBillNo: resp.transfer_bill_no,
    state: resp.state,
    failReason: resp.fail_reason,
  };
}

// 撤销未确认的商家转账单（仅用户确认前可撤销，撤销后原单资金会解冻/退回）
export async function cancelTransferBill(outBillNo: string): Promise<{
  outBillNo: string;
  transferBillNo?: string;
  state: string;
}> {
  const resp = await wxpayRequest<{
    out_bill_no: string;
    transfer_bill_no?: string;
    state: string;
  }>(
    "POST",
    `/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${encodeURIComponent(outBillNo)}/cancel`,
    undefined
  );
  return {
    outBillNo: resp.out_bill_no,
    transferBillNo: resp.transfer_bill_no,
    state: resp.state,
  };
}

// ─── 验证回调签名（支持公钥模式和证书模式）────────────────────────────────────
/**
 * 验证微信支付回调签名
 * @param timestamp  回调头 Wechatpay-Timestamp
 * @param nonce      回调头 Wechatpay-Nonce
 * @param body       原始请求体字符串
 * @param signature  回调头 Wechatpay-Signature（base64）
 * @param publicKeyOrCert 微信支付公钥（PEM 格式）或平台证书（PEM 格式）
 */
export function verifyNotifySignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  publicKeyOrCert: string
): boolean {
  try {
    const message = `${timestamp}\n${nonce}\n${body}\n`;
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(message);
    return verify.verify(publicKeyOrCert, signature, "base64");
  } catch {
    return false;
  }
}

/**
 * 获取用于验证回调签名的公钥内容
 * 优先使用环境变量 WXPAY_PUBLIC_KEY（公钥模式），
 * 若未配置则跳过签名验证（开发/测试环境）
 */
export function getVerifyPublicKey(): string {
  return wxpayConfig.publicKey;
}

// ─── AES-256-GCM 解密回调报文 ─────────────────────────────────────────────────
export function decryptNotifyData(
  ciphertext: string,
  nonce: string,
  associatedData: string
): string {
  const key = Buffer.from(wxpayConfig.apiV3Key, "utf8");
  const iv = Buffer.from(nonce, "utf8");
  const cipherBuf = Buffer.from(ciphertext, "base64");
  const authTag = cipherBuf.slice(cipherBuf.length - 16);
  const data = cipherBuf.slice(0, cipherBuf.length - 16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, "utf8"));

  return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
}
