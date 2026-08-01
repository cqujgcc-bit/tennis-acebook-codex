/**
 * 直接测试微信支付 API 是否可用
 * 用生产环境配置发一个查询订单的请求（不创建新订单）
 */
const crypto = require('crypto');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('/home/ubuntu/tennis-booking-platform/.project-config.json', 'utf8'));
const envVars = config.env_vars || {};

const wxpayConfig = {
  appId: envVars.WECHAT_APP_ID || '',
  mchId: envVars.WXPAY_MCH_ID || '',
  apiV3Key: envVars.WXPAY_API_V3_KEY || '',
  serialNo: envVars.WXPAY_SERIAL_NO || '',
  privateKey: (envVars.WXPAY_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  notifyUrl: envVars.WXPAY_NOTIFY_URL || '',
};

console.log('=== 微信支付配置检查 ===');
console.log('appId:', wxpayConfig.appId ? wxpayConfig.appId.substring(0, 8) + '...' : '❌ 未配置');
console.log('mchId:', wxpayConfig.mchId ? wxpayConfig.mchId : '❌ 未配置');
console.log('apiV3Key:', wxpayConfig.apiV3Key ? wxpayConfig.apiV3Key.substring(0, 8) + '...' : '❌ 未配置');
console.log('serialNo:', wxpayConfig.serialNo ? wxpayConfig.serialNo.substring(0, 16) + '...' : '❌ 未配置');
console.log('privateKey:', wxpayConfig.privateKey ? '已配置 (' + wxpayConfig.privateKey.length + ' chars)' : '❌ 未配置');
console.log('notifyUrl:', wxpayConfig.notifyUrl || '❌ 未配置');

const isConfigured = !!(wxpayConfig.mchId && wxpayConfig.apiV3Key && wxpayConfig.serialNo && wxpayConfig.privateKey);
console.log('\nisWxpayConfigured:', isConfigured ? '✅ YES' : '❌ NO');

if (!isConfigured) {
  console.log('\n❌ 微信支付未配置，所有支付都走 Mock 模式！这就是问题所在。');
  process.exit(0);
}

function generateNonce(len = 32) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}
function getTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}
function signMessage(message) {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(wxpayConfig.privateKey, 'base64');
}
function buildAuthHeader(method, url, body) {
  const nonce = generateNonce();
  const ts = getTimestamp();
  const urlObj = new URL(url);
  const canonicalUrl = urlObj.pathname + (urlObj.search || '');
  const message = `${method}\n${canonicalUrl}\n${ts}\n${nonce}\n${body}\n`;
  const signature = signMessage(message);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${wxpayConfig.mchId}",nonce_str="${nonce}",timestamp="${ts}",serial_no="${wxpayConfig.serialNo}",signature="${signature}"`;
}

async function testWxpayApi() {
  // 查询一个已有的订单（不创建新订单）
  const orderId = 'MO20260616379923'; // 最新的订单
  const url = `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${orderId}?mchid=${wxpayConfig.mchId}`;
  
  console.log('\n=== 测试查询订单 API ===');
  console.log('查询订单:', orderId);
  
  try {
    const authHeader = buildAuthHeader('GET', url, '');
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });
    const data = await res.json();
    console.log('HTTP状态:', res.status);
    console.log('响应:', JSON.stringify(data, null, 2));
    
    if (res.status === 200) {
      console.log('\n✅ 微信支付 API 调用成功！订单状态:', data.trade_state);
    } else if (res.status === 404) {
      console.log('\n⚠️ 订单不存在（可能预下单失败了）');
    } else {
      console.log('\n❌ API 调用失败:', data.code, data.message);
    }
  } catch (e) {
    console.error('\n❌ 请求失败:', e.message);
  }
}

testWxpayApi();
