/**
 * 微信支付密钥有效性集成测试（公钥模式）
 *
 * 验证：
 *   1. 所有必要环境变量均已配置
 *   2. 私钥格式正确，能正常签名
 *   3. 公钥格式正确，能被 Node.js 正确解析
 *   4. APIv3 密钥长度正确（32字节）
 *   5. 调用微信支付 API 时签名被接受（不返回 SIGN_ERROR）
 */
import { describe, it, expect } from "vitest";
import { wxpayConfig, isWxpayConfigured } from "./wxpay";
import crypto from "crypto";

function generateNonce(len = 32): string {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}
function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}
function signMessage(message: string, privateKey: string): string {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message);
  return sign.sign(privateKey, "base64");
}
function buildAuthHeader(method: string, url: string, body: string): string {
  const nonce = generateNonce();
  const ts = getTimestamp();
  const urlObj = new URL(url);
  const canonicalUrl = urlObj.pathname + (urlObj.search || "");
  const message = `${method}\n${canonicalUrl}\n${ts}\n${nonce}\n${body}\n`;
  const signature = signMessage(message, wxpayConfig.privateKey);
  return (
    `WECHATPAY2-SHA256-RSA2048 mchid="${wxpayConfig.mchId}",` +
    `nonce_str="${nonce}",timestamp="${ts}",` +
    `serial_no="${wxpayConfig.serialNo}",signature="${signature}"`
  );
}

describe("微信支付密钥有效性（公钥模式）", () => {
  it("所有必要环境变量均已配置", () => {
    expect(wxpayConfig.mchId, "WXPAY_MCH_ID 未配置").toBeTruthy();
    expect(wxpayConfig.apiV3Key, "WXPAY_API_V3_KEY 未配置").toBeTruthy();
    expect(wxpayConfig.serialNo, "WXPAY_SERIAL_NO 未配置").toBeTruthy();
    expect(wxpayConfig.privateKey, "WXPAY_PRIVATE_KEY 未配置").toBeTruthy();
    expect(wxpayConfig.publicKeyId, "WXPAY_PUBLIC_KEY_ID 未配置").toBeTruthy();
    expect(wxpayConfig.publicKey, "WXPAY_PUBLIC_KEY 未配置").toBeTruthy();
    expect(isWxpayConfigured()).toBe(true);
  });

  it("商户号格式正确（10位数字）", () => {
    expect(wxpayConfig.mchId).toMatch(/^\d{10}$/);
  });

  it("APIv3 密钥长度为 32 字节", () => {
    expect(wxpayConfig.apiV3Key.length).toBe(32);
  });

  it("证书序列号格式正确（40位十六进制）", () => {
    expect(wxpayConfig.serialNo).toMatch(/^[0-9A-Fa-f]{40}$/);
  });

  it("公钥 ID 格式正确", () => {
    expect(wxpayConfig.publicKeyId).toMatch(/^PUB_KEY_ID_/);
  });

  it("公钥内容格式正确（PEM 格式）", () => {
    expect(wxpayConfig.publicKey).toContain("BEGIN PUBLIC KEY");
    expect(wxpayConfig.publicKey).toContain("END PUBLIC KEY");
  });

  it("私钥格式正确，能正常签名", () => {
    const testMsg = "test_message_for_signing";
    let signature = "";
    expect(() => {
      signature = signMessage(testMsg, wxpayConfig.privateKey);
    }).not.toThrow();
    expect(signature.length).toBeGreaterThan(100);
  });

  it("公钥可被 Node.js 正确解析（格式有效）", () => {
    expect(() => {
      const verify = crypto.createVerify("RSA-SHA256");
      verify.update("test");
      // 公钥是微信的，不与商户私钥配对，verify 结果 false 是正常的
      verify.verify(wxpayConfig.publicKey, "dummysig", "base64");
    }).not.toThrow();
  });

  it("APIv3 密钥可用于 AES-256-GCM 加解密", () => {
    const key = Buffer.from(wxpayConfig.apiV3Key, "utf8");
    expect(key.length).toBe(32);
    const plaintext = "wxpay_decrypt_test";
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const cipherBuf = Buffer.concat([encrypted, authTag]);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = decipher.update(cipherBuf.slice(0, cipherBuf.length - 16), undefined, "utf8") + decipher.final("utf8");
    expect(decrypted).toBe(plaintext);
  });

  it("调用微信支付 API 签名被接受（不返回 SIGN_ERROR）", async () => {
    // 查询一个不存在的订单，预期 404 ORDER_NOT_EXIST，而非 401 SIGN_ERROR
    const testOrderId = `TESTKEY${Date.now()}`;
    const url = `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${testOrderId}?mchid=${wxpayConfig.mchId}`;
    const authHeader = buildAuthHeader("GET", url, "");
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
    });
    const data = await res.json() as { code?: string; message?: string };
    console.log(`微信支付 API 响应: HTTP ${res.status}, code=${data.code}, message=${data.message}`);
    // 签名正确时不会返回 SIGN_ERROR
    expect(data.code).not.toBe("SIGN_ERROR");
    expect(res.status).not.toBe(401);
    // 预期是 ORDER_NOT_EXIST 或 PARAM_ERROR（因为是测试订单号）
    console.log(`✅ 签名验证通过，微信服务器接受了请求`);
  }, 15000);
});
