import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); process.exit(1); }

  // 查最新5条球局
  const r1 = await db.execute(sql`SELECT id, title, circleId, createdAt FROM tennis_matches ORDER BY createdAt DESC LIMIT 5`);
  const rows = r1[0] as any[];
  console.log("最新5条球局:");
  rows.forEach(r => console.log(" -", r.id, r.title, "circleId:", r.circleId, "创建:", r.createdAt));

  // 查 circles 表
  const r2 = await db.execute(sql`SELECT id, name FROM circles LIMIT 5`);
  const circles = r2[0] as any[];
  console.log("圈子列表:");
  circles.forEach(c => console.log(" -", c.id, c.name));

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
