import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

function parseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port) || 3306,
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
}

const accounts = [
  // 管理员
  { phone: '13800000000', password: 'Admin@2024', name: '管理员', role: 'admin' },
  // 10个测试用户
  { phone: '13800000001', password: 'Test@1001', name: '测试用户01', role: 'user' },
  { phone: '13800000002', password: 'Test@1002', name: '测试用户02', role: 'user' },
  { phone: '13800000003', password: 'Test@1003', name: '测试用户03', role: 'user' },
  { phone: '13800000004', password: 'Test@1004', name: '测试用户04', role: 'user' },
  { phone: '13800000005', password: 'Test@1005', name: '测试用户05', role: 'user' },
  { phone: '13800000006', password: 'Test@1006', name: '测试用户06', role: 'user' },
  { phone: '13800000007', password: 'Test@1007', name: '测试用户07', role: 'user' },
  { phone: '13800000008', password: 'Test@1008', name: '测试用户08', role: 'user' },
  { phone: '13800000009', password: 'Test@1009', name: '测试用户09', role: 'user' },
  { phone: '13800000010', password: 'Test@1010', name: '测试用户10', role: 'user' },
];

const conn = await mysql.createConnection(parseUrl(DB_URL));

for (const acc of accounts) {
  const openId = `phone_${acc.phone}`;
  const hash = await bcrypt.hash(acc.password, 10);
  const now = new Date();

  await conn.execute(
    `INSERT INTO users (openId, phone, name, role, loginMethod, passwordHash, lastSignedIn, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'phone_password', ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       phone = VALUES(phone),
       name = VALUES(name),
       role = VALUES(role),
       passwordHash = VALUES(passwordHash),
       loginMethod = VALUES(loginMethod),
       lastSignedIn = VALUES(lastSignedIn),
       updatedAt = VALUES(updatedAt)`,
    [openId, acc.phone, acc.name, acc.role, hash, now, now, now]
  );

  console.log(`✅ ${acc.role === 'admin' ? '[管理员]' : '[用户]  '} ${acc.name}  手机号: ${acc.phone}  密码: ${acc.password}`);
}

await conn.end();
console.log('\n✅ 所有账户创建完成！');
