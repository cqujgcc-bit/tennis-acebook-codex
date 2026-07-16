/**
 * 一次性脚本：对数据库中所有 pending 状态的 match_orders 发起微信退款
 * 使用方式：node scripts/refund-pending-orders.mjs
 *
 * 前提条件：
 * - 环境变量中已配置 WXPAY_MCH_ID, WXPAY_API_V3_KEY, WXPAY_SERIAL_NO, WXPAY_PRIVATE_KEY
 * - 或者直接在下面的 CONFIG 中填入（仅用于一次性执行，执行后删除）
 */

import crypto from "crypto";
import mysql from "mysql2/promise";

// ─── 配置（从环境变量读取，或直接填入）─────────────────────────────────────────
const CONFIG = {
  mchId: process.env.WXPAY_MCH_ID || "",
  apiV3Key: process.env.WXPAY_API_V3_KEY || "",
  serialNo: process.env.WXPAY_SERIAL_NO || "",
  privateKey: (process.env.WXPAY_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  dbUrl: process.env.DATABASE_URL || "",
};

// ─── 签名工具 ─────────────────────────────────────────────────────────────────
function generateNonce(len = 32) {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}

function getTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

function signMessage(message) {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message);
  return sign.sign(CONFIG.privateKey, "base64");
}

function buildAuthHeader(method, url, body) {
  const nonce = generateNonce();
  const ts = getTimestamp();
  const urlObj = new URL(url);
  const canonicalUrl = urlObj.pathname + (urlObj.search || "");
  const message = `${method}\n${canonicalUrl}\n${ts}\n${nonce}\n${body}\n`;
  const signature = signMessage(message);
  return (
    `WECHATPAY2-SHA256-RSA2048 mchid="${CONFIG.mchId}",` +
    `nonce_str="${nonce}",timestamp="${ts}",` +
    `serial_no="${CONFIG.serialNo}",signature="${signature}"`
  );
}

async function wxpayRequest(method, path, body) {
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

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`WxPay API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ─── 解析数据库连接 URL ────────────────────────────────────────────────────────
function parseDbUrl(url) {
  // mysql://user:pass@host:port/dbname?...
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!match) throw new Error("无法解析数据库 URL: " + url);
  return {
    user: decodeURIComponent(match[1]),
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

// ─── 主逻辑 ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== 历史 pending 订单退款脚本 ===\n");

  // 验证配置
  if (!CONFIG.mchId || !CONFIG.apiV3Key || !CONFIG.serialNo || !CONFIG.privateKey) {
    console.error("❌ 微信支付配置不完整，请检查环境变量");
    process.exit(1);
  }
  if (!CONFIG.dbUrl) {
    console.error("❌ 数据库 URL 未配置");
    process.exit(1);
  }

  console.log(`✅ 商户号: ${CONFIG.mchId}`);
  console.log(`✅ 私钥长度: ${CONFIG.privateKey.length}`);

  // 连接数据库
  const dbConfig = parseDbUrl(CONFIG.dbUrl);
  const conn = await mysql.createConnection({
    ...dbConfig,
    ssl: { rejectUnauthorized: true },
  });
  console.log("✅ 数据库连接成功\n");

  // 查询所有 pending 订单
  const [rows] = await conn.execute(
    "SELECT id, orderId, matchId, userId, amount, status FROM match_orders WHERE status = 'pending' ORDER BY id ASC"
  );

  console.log(`找到 ${rows.length} 条 pending 订单：`);
  for (const row of rows) {
    console.log(`  - orderId=${row.orderId} matchId=${row.matchId} userId=${row.userId} amount=${row.amount}`);
  }
  console.log();

  if (rows.length === 0) {
    console.log("没有需要退款的订单。");
    await conn.end();
    return;
  }

  // 逐条退款
  let successCount = 0;
  let failCount = 0;

  for (const order of rows) {
    const orderId = order.orderId;
    const refundId = `RF${orderId}`;
    const amountFen = Math.round(Number(order.amount) * 100);

    console.log(`\n处理订单 ${orderId}（¥${order.amount}）...`);

    try {
      // 先查询微信侧订单状态，确认是否真的已支付
      console.log(`  查询微信订单状态...`);
      let wxOrderStatus = null;
      try {
        const wxOrder = await wxpayRequest(
          "GET",
          `/v3/pay/transactions/out-trade-no/${orderId}?mchid=${CONFIG.mchId}`,
          null
        );
        wxOrderStatus = wxOrder.trade_state;
        console.log(`  微信订单状态: ${wxOrderStatus} (${wxOrder.trade_state_desc || ''})`);
      } catch (queryErr) {
        console.warn(`  ⚠️  查询微信订单失败: ${queryErr.message}`);
        console.log(`  继续尝试退款...`);
      }

      // 如果微信侧订单不是 SUCCESS，跳过退款
      if (wxOrderStatus && wxOrderStatus !== "SUCCESS") {
        console.log(`  ⏭️  微信侧订单状态为 ${wxOrderStatus}，非 SUCCESS，跳过退款`);
        // 将本地订单标记为 cancelled（未实际付款）
        await conn.execute(
          "UPDATE match_orders SET status = 'cancelled', updatedAt = NOW() WHERE orderId = ?",
          [orderId]
        );
        console.log(`  ✅ 本地订单已标记为 cancelled`);
        continue;
      }

      // 发起退款
      console.log(`  发起退款 refundId=${refundId} amount=${amountFen}分...`);
      const refundResp = await wxpayRequest("POST", "/v3/refund/domestic/refunds", {
        out_trade_no: orderId,
        out_refund_no: refundId,
        reason: "订单取消全额退款",
        amount: {
          refund: amountFen,
          total: amountFen,
          currency: "CNY",
        },
      });

      console.log(`  ✅ 退款成功! refund_id=${refundResp.refund_id} status=${refundResp.status}`);

      // 更新数据库
      await conn.execute(
        `UPDATE match_orders SET status = 'refunded', refundId = ?, refundReason = '历史订单补退款', refundedAt = NOW(), updatedAt = NOW() WHERE orderId = ?`,
        [refundResp.refund_id || refundId, orderId]
      );
      await conn.execute(
        `UPDATE match_participants SET paymentStatus = 'refunded' WHERE matchId = ? AND userId = ?`,
        [order.matchId, order.userId]
      );
      console.log(`  ✅ 数据库已更新`);
      successCount++;

    } catch (err) {
      console.error(`  ❌ 退款失败: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n=== 退款完成 ===`);
  console.log(`成功: ${successCount} 笔`);
  console.log(`失败: ${failCount} 笔`);

  await conn.end();
}

main().catch((err) => {
  console.error("脚本执行异常:", err);
  process.exit(1);
});
