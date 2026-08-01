import { sdk } from '../server/_core/sdk.ts';

const token = await sdk.signSession({ 
  openId: 'wx_ontVn3dT9Is2nUU_Y5j6Hz9hI2ok', 
  appId: process.env.VITE_APP_ID, 
  name: '陈冲' 
});
console.log('TOKEN:', token);

// 调用 auth.me
const res = await fetch('https://tennispro.cn/api/trpc/auth.me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const json = await res.json();
console.log('RAW RESPONSE:', JSON.stringify(json, null, 2));
