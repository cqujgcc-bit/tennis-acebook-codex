const mysql2 = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const config = JSON.parse(fs.readFileSync('/home/ubuntu/tennis-booking-platform/.project-config.json', 'utf8'));
  const dbUrl = config.env_vars?.DATABASE_URL;
  const conn = await mysql2.createConnection(dbUrl);

  console.log('=== 检查最近支付用户的 wechatOpenid ===');
  // 查找最近有订单的用户
  const [orders] = await conn.query('SELECT userId FROM match_orders GROUP BY userId ORDER BY MAX(id) DESC LIMIT 5');
  const userIds = orders.map(r => r.userId);
  console.log('有订单的用户IDs:', userIds);

  for (const uid of userIds) {
    const [users] = await conn.query('SELECT id, name, phone, wechatOpenid, wechatId, loginMethod FROM users WHERE id = ?', [uid]);
    if (users[0]) {
      console.log(`用户 ${uid}:`, JSON.stringify(users[0]));
    }
  }

  console.log('\n=== 检查最新订单的 wxPrepayId ===');
  const [latestOrders] = await conn.query('SELECT orderId, status, wxPrepayId, wxTransactionId, amount, userId, matchId FROM match_orders ORDER BY id DESC LIMIT 3');
  console.log('最新订单:', JSON.stringify(latestOrders, null, 2));

  console.log('\n=== 检查 tennis_matches 表中 feeRequired 字段 ===');
  const [matches] = await conn.query('SELECT id, title, feeRequired, feePerPerson, status FROM tennis_matches WHERE feeRequired = 1 ORDER BY id DESC LIMIT 5');
  console.log('有场地费的球局:', JSON.stringify(matches, null, 2));

  console.log('\n=== 检查 match_participants 的 paymentStatus ===');
  const [participants] = await conn.query('SELECT id, matchId, userId, status, paymentStatus, orderId FROM match_participants WHERE paymentStatus != "not_required" ORDER BY id DESC LIMIT 10');
  console.log('有支付状态的参与者:', JSON.stringify(participants, null, 2));

  await conn.end();
}

main().catch(e => { console.error('脚本失败:', e.message); process.exit(1); });
