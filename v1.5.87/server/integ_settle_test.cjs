// DB 级集成测试：验证「发起人到场分摊」结算后落库字段是否正确。
// 流程：建临时收费球局+3笔已付订单+3名付费参与者 → 复刻后端写库逻辑 → 校验 → 清理。
// 不触发真实微信退款/打款（仅验证数据库状态机）。
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({ host: "localhost", user: "tennispro", password: "TennisPro2026!", database: "tennispro" });
  const TAG = "INTEG_TEST_" + Date.now();
  let matchId;
  try {
    const organizerId = 1592760; // 珈宁（有 openid）
    const payers = [1592137, 1591171, 1590871];

    // 1) 建收费球局：场地费 6 元
    const [mr] = await conn.execute(
      `INSERT INTO tennis_matches (title, authorId, matchType, matchDate, startTime, endTime, venueName, maxParticipants, currentParticipants, status, feeRequired, courtTotalFee, city, createdAt)
       VALUES (?, ?, 'doubles', '2026-07-01', '19:00', '21:00', '测试场地', 5, 4, 'full', 1, '6.00', 'shenzhen', NOW())`,
      [TAG + " 结算测试局", organizerId]
    );
    matchId = mr.insertId;
    console.log("创建测试球局 id =", matchId);

    // 2) 建 3 名付费参与者 + 3 笔已付订单（各付 2 元）
    for (const uid of payers) {
      const orderId = "OT" + Date.now() + uid;
      await conn.execute(
        `INSERT INTO match_participants (matchId, userId, status, paymentStatus, paidAmount, topupAmount, matchAttended, orderId, createdAt)
         VALUES (?, ?, 'confirmed', 'paid', '2.00', '0.00', 0, ?, NOW())`,
        [matchId, uid, orderId]
      );
      await conn.execute(
        `INSERT INTO match_orders (orderId, matchId, userId, amount, orderType, status, createdAt)
         VALUES (?, ?, ?, '2.00', 'prepay', 'paid', NOW())`,
        [orderId, matchId, uid]
      );
    }
    console.log("已建 3 名付费参与者(各付2元)+3笔已付订单");

    // 3) 复刻后端结算写库逻辑：发起人到场，3人全到场
    //    divisor = 3 + 1 = 4; courtTotalFee=6元=600分; perFen = round(600/4)=150
    //    每人付200>150 → 各退50; 发起人自付150; 结算给发起人 = 600 - 150 - 150 = 300
    const courtTotalFen = 600;
    const attendedPayers = payers.slice(); // 全到场
    const organizerAttended = true;
    const divisor = attendedPayers.length + (organizerAttended ? 1 : 0);
    const perFen = Math.round(courtTotalFen / divisor);
    let refundTotalFen = 0;
    for (const uid of payers) {
      const paidFen = 200;
      const attended = attendedPayers.includes(uid);
      await conn.execute(`UPDATE match_participants SET matchAttended=? WHERE matchId=? AND userId=?`, [attended ? 1 : 0, matchId, uid]);
      if (!attended) continue;
      const diff = paidFen - perFen;
      if (diff > 0) {
        refundTotalFen += diff;
        await conn.execute(`UPDATE match_participants SET paymentStatus='partial_refunded', paidAmount=?, topupAmount='0.00' WHERE matchId=? AND userId=?`, [(perFen/100).toFixed(2), matchId, uid]);
      } else if (diff < 0) {
        await conn.execute(`UPDATE match_participants SET paymentStatus='topup_pending', topupAmount=? WHERE matchId=? AND userId=?`, [((-diff)/100).toFixed(2), matchId, uid]);
      }
    }
    const totalPaidFen = 600;
    const organizerShareFen = organizerAttended ? perFen : 0;
    const settleFen = totalPaidFen - refundTotalFen - organizerShareFen;
    await conn.execute(
      `INSERT INTO match_settlements (matchId, organizerId, totalAmount, platformFee, netAmount, status, confirmedAt) VALUES (?, ?, '6.00', '0.00', ?, 'settled', NOW())`,
      [matchId, organizerId, (settleFen/100).toFixed(2)]
    );
    await conn.execute(`UPDATE tennis_matches SET status='completed' WHERE id=?`, [matchId]);

    // 4) 校验
    const [parts] = await conn.execute(`SELECT userId, paymentStatus, paidAmount, topupAmount, matchAttended FROM match_participants WHERE matchId=? ORDER BY userId`, [matchId]);
    const [setts] = await conn.execute(`SELECT netAmount, status FROM match_settlements WHERE matchId=?`, [matchId]);
    console.log("\n=== 结算后参与者 ==="); console.table(parts);
    console.log("=== 结算记录 ==="); console.table(setts);

    function check(name, got, exp) { const ok = String(got) === String(exp); console.log(`${ok?'PASS':'FAIL'} | ${name} | got=${got} exp=${exp}`); if(!ok) process.exitCode=1; }
    check("divisor", divisor, 4);
    check("perFen", perFen, 150);
    check("refundTotalFen", refundTotalFen, 150);
    check("settleNetAmount", setts[0].netAmount, "3.00");
    check("settlementStatus", setts[0].status, "settled");
    // 每位到场者应为 partial_refunded, paidAmount=1.50
    parts.forEach(p => { check(`user${p.userId}.status`, p.paymentStatus, "partial_refunded"); check(`user${p.userId}.paid`, p.paidAmount, "1.50"); });

  } catch (e) {
    console.error("测试异常:", e.message); process.exitCode = 1;
  } finally {
    // 5) 清理测试数据
    if (matchId) {
      await conn.execute(`DELETE FROM match_settlements WHERE matchId=?`, [matchId]);
      await conn.execute(`DELETE FROM match_orders WHERE matchId=?`, [matchId]);
      await conn.execute(`DELETE FROM match_participants WHERE matchId=?`, [matchId]);
      await conn.execute(`DELETE FROM tennis_matches WHERE id=?`, [matchId]);
      console.log("\n已清理测试数据 matchId =", matchId);
    }
    await conn.end();
  }
})();
