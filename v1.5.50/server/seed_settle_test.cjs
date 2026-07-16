const mysql = require("mysql2/promise");
(async () => {
  const conn = await mysql.createConnection({host:"localhost",user:"tennispro",password:"TennisPro2026!",database:"tennispro"});
  // 找一个真实用户作为发起人
  const [users] = await conn.execute("SELECT id,name,wechatOpenid FROM users ORDER BY id DESC LIMIT 5");
  console.log("候选用户:"); console.table(users);
  await conn.end();
})();
