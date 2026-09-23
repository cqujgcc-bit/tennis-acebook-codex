import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// 读取环境变量
const envPath = '/home/ubuntu/tennis-booking-platform/.env';
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
} catch {}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const conn = await createConnection(dbUrl);
const [rows] = await conn.execute(
  "SELECT id, name, email, phone, openId, loginMethod, role, status, (passwordHash IS NOT NULL) as hasPassword FROM users WHERE role = 'admin'"
);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
