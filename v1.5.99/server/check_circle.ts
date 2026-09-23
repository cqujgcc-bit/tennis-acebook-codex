import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); process.exit(1); }

  // 检查 circleId 列是否存在
  const cols = await db.execute(sql`SHOW COLUMNS FROM tennis_matches LIKE 'circleId'`);
  console.log("circleId column exists:", (cols[0] as any[]).length > 0);

  // 查有 circleId 的球局
  const matches = await db.execute(sql`SELECT id, title, circleId FROM tennis_matches WHERE circleId IS NOT NULL LIMIT 5`);
  const rows = matches[0] as any[];
  console.log("matches with circleId count:", rows.length);
  rows.forEach(r => console.log(" -", r.id, r.title, "circleId:", r.circleId));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
