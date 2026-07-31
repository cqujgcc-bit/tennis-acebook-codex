const mysql2 = require('mysql2/promise');
const fs = require('fs');

async function main() {
  // 从 .project-config.json 读取数据库连接
  const config = JSON.parse(fs.readFileSync('/home/ubuntu/tennis-booking-platform/.project-config.json', 'utf8'));
  const dbUrl = config.env_vars?.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not found in .project-config.json');

  console.log('连接数据库...');
  // URL 已包含 ssl 参数，不重复添加
  const conn = await mysql2.createConnection(dbUrl);

  // 先检查 users 表现有字段
  const [cols] = await conn.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`);
  const existingCols = cols.map(r => r.COLUMN_NAME);
  console.log('现有字段数量:', existingCols.length);
  console.log('现有字段:', existingCols.join(', '));

  // 需要添加的字段
  const migrations = [
    { col: 'wechatOpenid', sql: "ALTER TABLE `users` ADD `wechatOpenid` varchar(128)" },
    { col: 'wechatOpenid_unique', sql: "ALTER TABLE `users` ADD CONSTRAINT `users_wechatOpenid_unique` UNIQUE(`wechatOpenid`)", checkCol: 'wechatOpenid' },
    { col: 'gender', sql: "ALTER TABLE `users` ADD `gender` enum('male','female')" },
    { col: 'city', sql: "ALTER TABLE `users` ADD `city` varchar(50)" },
    { col: 'tennisLevel', sql: "ALTER TABLE `users` ADD `tennisLevel` int" },
    { col: 'ntrpLevel', sql: "ALTER TABLE `users` ADD `ntrpLevel` decimal(3,1)" },
    { col: 'creditScore', sql: "ALTER TABLE `users` ADD `creditScore` int DEFAULT 100 NOT NULL" },
    { col: 'consecutiveAttendCount', sql: "ALTER TABLE `users` ADD `consecutiveAttendCount` int DEFAULT 0 NOT NULL" },
    { col: 'creditRestoreApplied', sql: "ALTER TABLE `users` ADD `creditRestoreApplied` boolean DEFAULT false NOT NULL" },
  ];

  for (const m of migrations) {
    const checkCol = m.checkCol || m.col;
    if (existingCols.includes(checkCol) && !m.col.endsWith('_unique')) {
      console.log(`✓ 字段 ${m.col} 已存在，跳过`);
      continue;
    }
    try {
      await conn.query(m.sql);
      console.log(`✅ 添加字段 ${m.col} 成功`);
    } catch (e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists') || e.message.includes('Duplicate key') || e.message.includes('Duplicate entry')) {
        console.log(`✓ 字段 ${m.col} 已存在（重复），跳过`);
      } else {
        console.error(`❌ 添加字段 ${m.col} 失败:`, e.message);
      }
    }
  }

  // 验证结果
  const [newCols] = await conn.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`);
  console.log('\n迁移后字段数量:', newCols.length);
  console.log('字段列表:', newCols.map(r => r.COLUMN_NAME).join(', '));

  await conn.end();
  console.log('\n✅ 迁移完成');
}

main().catch(e => { console.error('迁移失败:', e.message); process.exit(1); });
