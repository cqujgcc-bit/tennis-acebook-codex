const mysql = require("mysql2/promise");
(async () => {
  const conn = await mysql.createConnection({host:"localhost",user:"tennispro",password:"TennisPro2026!",database:"tennispro"});
  const [matches] = await conn.execute("SELECT id,title,feeRequired,feePerPerson,courtTotalFee,maxParticipants,currentParticipants,status FROM tennis_matches ORDER BY id DESC LIMIT 8");
  console.log("=== 最近球局 ==="); console.table(matches);
  const [parts] = await conn.execute("SELECT id,matchId,userId,status,paymentStatus,paidAmount,topupAmount,matchAttended FROM match_participants ORDER BY id DESC LIMIT 12");
  console.log("=== 最近参与者 ==="); console.table(parts);
  const [orders] = await conn.execute("SELECT orderId,matchId,userId,amount,orderType,status FROM match_orders ORDER BY id DESC LIMIT 12");
  console.log("=== 最近订单 ==="); console.table(orders);
  await conn.end();
})();
