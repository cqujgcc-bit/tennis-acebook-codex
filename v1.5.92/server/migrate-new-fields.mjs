import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const conn = await mysql.createConnection(url);

// TiDB does not support DEFAULT expressions for JSON columns; use NULL default instead
const sqls = [
  "ALTER TABLE `coach_profiles` ADD COLUMN IF NOT EXISTS `certificationImages` json",
  "ALTER TABLE `coach_profiles` ADD COLUMN IF NOT EXISTS `socialLinks` json",
  "ALTER TABLE `coach_profiles` ADD COLUMN IF NOT EXISTS `videoUrl` varchar(500)",
  "ALTER TABLE `coach_profiles` ADD COLUMN IF NOT EXISTS `categoryTags` json",
  "ALTER TABLE `coach_profiles` ADD COLUMN IF NOT EXISTS `sortWeight` int NOT NULL DEFAULT 0",
];

for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log("OK:", sql.slice(0, 80));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("SKIP (already exists):", sql.slice(0, 80));
    } else {
      console.error("ERROR:", e.message);
    }
  }
}

await conn.end();
console.log("Migration complete");
