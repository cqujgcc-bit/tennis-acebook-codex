/**
 * Safe additive schema sync: compares Drizzle schema tables against the live
 * MySQL database and adds ONLY missing columns. Never drops or alters existing
 * columns, never touches data. Run on the server after deploy.
 *
 * Usage: pnpm tsx scripts/sync-missing-columns.ts
 */
import mysql from "mysql2/promise";
import { getTableConfig } from "drizzle-orm/mysql-core";
import * as schema from "../drizzle/schema";

function sqlType(col: any): string {
  // Reconstruct a best-effort column DDL type from drizzle column metadata.
  const t = col.getSQLType();
  return t;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const conn = await mysql.createConnection(url);
  const [dbRows] = await conn.query("SELECT DATABASE() AS db");
  const dbName = (dbRows as any)[0].db;

  const tables = Object.values(schema).filter(
    (v: any) => v && typeof v === "object" && getTableConfigSafe(v),
  );

  const alters: string[] = [];

  for (const tbl of tables as any[]) {
    const cfg = getTableConfigSafe(tbl);
    if (!cfg) continue;
    const tableName = cfg.name;

    // existing columns in DB
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?",
      [dbName, tableName],
    );
    const existing = new Set((cols as any[]).map((r) => r.COLUMN_NAME));
    if (existing.size === 0) {
      // table doesn't exist at all — skip (handled elsewhere)
      console.log(`[skip] table not found in DB: ${tableName}`);
      continue;
    }

    for (const col of cfg.columns) {
      const name = col.name;
      if (existing.has(name)) continue;
      // build ADD COLUMN clause
      let ddl = `\`${name}\` ${sqlType(col)}`;
      if (col.notNull) ddl += " NOT NULL";
      // default
      if (col.hasDefault && col.default !== undefined) {
        let d = col.default;
        if (typeof d === "boolean") d = d ? 1 : 0;
        if (d === null) {
          ddl += " DEFAULT NULL";
        } else if (typeof d === "number") {
          ddl += ` DEFAULT ${d}`;
        } else if (typeof d === "string") {
          ddl += ` DEFAULT '${d.replace(/'/g, "''")}'`;
        } else if (Array.isArray(d) || typeof d === "object") {
          ddl += ` DEFAULT ('${JSON.stringify(d).replace(/'/g, "''")}')`;
        }
      } else if (!col.notNull) {
        ddl += " DEFAULT NULL";
      }
      alters.push(`ALTER TABLE \`${tableName}\` ADD COLUMN ${ddl};`);
    }
  }

  if (alters.length === 0) {
    console.log("No missing columns. Database schema is up to date.");
  } else {
    console.log(`Found ${alters.length} missing column(s). Applying:`);
    for (const a of alters) {
      console.log("  " + a);
      try {
        await conn.query(a);
      } catch (e: any) {
        console.error("  FAILED: " + a + " -> " + e.message);
      }
    }
    console.log("Done.");
  }
  await conn.end();
  process.exit(0);
}

function getTableConfigSafe(v: any) {
  try {
    return getTableConfig(v);
  } catch {
    return null;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
