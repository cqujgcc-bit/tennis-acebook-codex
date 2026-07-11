require('dotenv').config({ path: '/var/www/tennispro-new/.env' });
const cfg = {
  mchId: process.env.WXPAY_MCH_ID || '',
  apiV3Key: process.env.WXPAY_API_V3_KEY || '',
  serialNo: process.env.WXPAY_SERIAL_NO || '',
  privateKey: (process.env.WXPAY_PRIVATE_KEY || '').replace(/\\n/g, "\n"),
};
console.log('mchId:', !!cfg.mchId, cfg.mchId.length);
console.log('apiV3Key:', !!cfg.apiV3Key, cfg.apiV3Key.length);
console.log('serialNo:', !!cfg.serialNo, cfg.serialNo.length);
console.log('privateKey:', !!cfg.privateKey, cfg.privateKey.length);
console.log('isConfigured:', !!(cfg.mchId && cfg.apiV3Key && cfg.serialNo && cfg.privateKey));
