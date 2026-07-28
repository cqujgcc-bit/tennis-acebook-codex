/**
 * Safe additive enum migration: extend match_participants.status enum to include
 * the new value `waitlist` (候补名单). This is a pure ADD — all existing enum
 * values are preserved and no row data is modified.
 *
 * Idempotent: if `waitlist` already exists in the enum, it does nothing.
 *
 * Usage: pnpm tsx scripts/add-waitlist-status.ts
 */
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const conn = await mysql.createConnection(url);
  const [dbRows] = await conn.query("SELECT DATABASE() AS db");
  const dbName = (dbRows as any)[0].db;

  const [cols] = await conn.query(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='status'",
    [dbName, "match_participants"],
  );
  if (!(cols as any[]).length) {
    console.log("[skip] match_participants.status not found");
    await conn.end();
    process.exit(0);
  }
  const colType = (cols as any[])[0].COLUMN_TYPE as string; // e.g. enum('pending','confirmed',...)
  console.log("current type:", colType);

  if (colType.includes("'waitlist'")) {
    console.log("waitlist already present. Nothing to do.");
    await conn.end();
    process.exit(0);
  }

  // Pure additive: keep all existing values, append 'waitlist'. Default unchanged.
  const ddl =
    "ALTER TABLE `match_participants` MODIFY COLUMN `status` " +
    "ENUM('pending','confirmed','rejected','cancelled','waitlist') NOT NULL DEFAULT 'confirmed'";
  console.log("applying:", ddl);
  await conn.query(ddl);
  console.log("Done. waitlist value added.");
  await conn.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
