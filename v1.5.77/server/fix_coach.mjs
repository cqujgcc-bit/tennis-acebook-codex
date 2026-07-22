import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// 读取环境变量
const envFile = readFileSync('/home/ubuntu/tennis-booking-platform/.env', 'utf8');
const dbUrl = envFile.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();

async function main() {
  const conn = await mysql.createConnection(dbUrl);
  
  // 1. 升级 a@a.com 为 admin
  await conn.execute("UPDATE users SET role = 'admin' WHERE email = 'a@a.com'");
  console.log('✅ a@a.com upgraded to admin');
  
  // 2. 升级 coach@test.com 为 coach
  await conn.execute("UPDATE users SET role = 'coach' WHERE email = 'coach@test.com'");
  console.log('✅ coach@test.com upgraded to coach');
  
  // 3. 审核通过教练档案
  const [coachUser] = await conn.execute("SELECT id FROM users WHERE email = 'coach@test.com'");
  const userId = coachUser[0]?.id;
  if (userId) {
    await conn.execute(`UPDATE coach_profiles SET status = 'approved', verification_status = 'approved', is_verified = 1, is_active = 1 WHERE user_id = ${userId}`);
    console.log('✅ coach profile approved for user_id:', userId);
  }
  
  // 4. 验证
  const [rows] = await conn.execute("SELECT u.email, u.role, cp.id as coach_id, cp.status, cp.verification_status, cp.is_verified FROM users u LEFT JOIN coach_profiles cp ON cp.user_id = u.id WHERE u.email IN ('a@a.com', 'coach@test.com')");
  console.log('验证结果:', JSON.stringify(rows, null, 2));
  
  await conn.end();
}
main().catch(console.error);
