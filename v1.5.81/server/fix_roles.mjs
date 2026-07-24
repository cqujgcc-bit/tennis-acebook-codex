// 直接通过drizzle操作数据库
import { createServer } from 'http';

// 用内部API调用方式
const BASE = 'http://localhost:3001';

async function trpcPost(path, body, token) {
  const res = await fetch(`${BASE}/api/trpc/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ json: body })
  });
  const data = await res.json();
  return data?.result?.data?.json ?? data?.error?.json;
}

async function trpcGet(path, input, token) {
  const params = input ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : '';
  const res = await fetch(`${BASE}/api/trpc/${path}${params}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  const data = await res.json();
  return data?.result?.data?.json ?? data?.error?.json;
}

async function main() {
  // 1. 登录 a@a.com
  const loginRes = await trpcPost('auth.miniLoginWithEmail', { email: 'a@a.com', password: 'aaaaaaaa' });
  const token = loginRes?.token;
  console.log('a@a.com token:', token ? '✅ OK' : '❌ FAIL', loginRes);
  
  // 2. 获取用户信息
  const me = await trpcGet('auth.me', undefined, token);
  console.log('a@a.com info:', { id: me?.id, role: me?.role, openId: me?.openId });
  
  // 3. 获取coach@test.com用户ID
  const users = await trpcGet('admin.listUsers', { query: 'coach@test.com' }, token);
  console.log('coach user search:', users);
}

main().catch(console.error);
