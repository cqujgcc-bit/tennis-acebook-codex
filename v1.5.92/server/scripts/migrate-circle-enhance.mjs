// 圈子功能完善增量迁移（路线一：无定金 + 赛后按到场平摊；幂等、只增不删）
// 1) circle_activities 表补结算字段：feeMode/totalCost/settleStatus/settledAt
// 2) circle_activity_signups 表补到场与账单字段：attended/shareAmount/payStatus/orderId/paidAt
// 3) 新建 activity_templates 表
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

async function colsOf(table) {
  try {
    const [rows] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
    return rows.map((c) => c.Field);
  } catch (e) {
    return null; // 表不存在
  }
}

async function tableExists(table) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [table]
  );
  return rows[0].c > 0;
}

const migrations = [];

// ---- 1) circle_activities 补列 ----
const caCols = await colsOf("circle_activities");
if (caCols) {
  if (!caCols.includes("feeMode"))
    migrations.push("ALTER TABLE `circle_activities` ADD COLUMN `feeMode` ENUM('free','aa') NOT NULL DEFAULT 'free'");
  if (!caCols.includes("totalCost"))
    migrations.push("ALTER TABLE `circle_activities` ADD COLUMN `totalCost` INT NOT NULL DEFAULT 0");
  if (!caCols.includes("settleStatus"))
    migrations.push("ALTER TABLE `circle_activities` ADD COLUMN `settleStatus` ENUM('none','settling','settled') NOT NULL DEFAULT 'none'");
  if (!caCols.includes("settledAt"))
    migrations.push("ALTER TABLE `circle_activities` ADD COLUMN `settledAt` TIMESTAMP NULL");
} else {
  console.warn("⚠ circle_activities 表不存在，跳过补列（请确认基础表已建）");
}

// ---- 2) circle_activity_signups 补列 ----
const suCols = await colsOf("circle_activity_signups");
if (suCols) {
  if (!suCols.includes("attended"))
    migrations.push("ALTER TABLE `circle_activity_signups` ADD COLUMN `attended` BOOLEAN NOT NULL DEFAULT TRUE");
  if (!suCols.includes("shareAmount"))
    migrations.push("ALTER TABLE `circle_activity_signups` ADD COLUMN `shareAmount` INT NOT NULL DEFAULT 0");
  if (!suCols.includes("payStatus"))
    migrations.push("ALTER TABLE `circle_activity_signups` ADD COLUMN `payStatus` ENUM('none','unpaid','paid') NOT NULL DEFAULT 'none'");
  if (!suCols.includes("orderId"))
    migrations.push("ALTER TABLE `circle_activity_signups` ADD COLUMN `orderId` VARCHAR(64) NULL");
  if (!suCols.includes("paidAt"))
    migrations.push("ALTER TABLE `circle_activity_signups` ADD COLUMN `paidAt` TIMESTAMP NULL");
} else {
  console.warn("⚠ circle_activity_signups 表不存在，跳过补列");
}

// ---- 3) activity_templates 建表 ----
if (!(await tableExists("activity_templates"))) {
  migrations.push(`CREATE TABLE \`activity_templates\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`circleId\` INT NOT NULL,
    \`title\` VARCHAR(100) NOT NULL,
    \`startTime\` VARCHAR(5) NULL,
    \`endTime\` VARCHAR(5) NULL,
    \`venueName\` VARCHAR(100) NULL,
    \`maxParticipants\` INT NOT NULL DEFAULT 20,
    \`feeMode\` ENUM('free','aa') NOT NULL DEFAULT 'free',
    \`description\` TEXT NULL,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

if (migrations.length === 0) {
  console.log("✓ 所有结构已存在，无需迁移。");
} else {
  for (const sql of migrations) {
    console.log("Running:", sql.replace(/\s+/g, " ").slice(0, 90) + "...");
    await conn.query(sql);
    console.log("  ✓ Done");
  }
  console.log(`\n✓ 迁移完成，共执行 ${migrations.length} 条。`);
}

await conn.end();
