/**
 * Safe additive: create ONLY tables that do not yet exist in the live DB,
 * derived from the Drizzle schema column metadata. Existing tables are left
 * untouched. Run after sync-missing-columns.ts.
 *
 * Usage: pnpm tsx scripts/create-missing-tables.ts
 */
import mysql from "mysql2/promise";
import { getTableConfig } from "drizzle-orm/mysql-core";
import * as schema from "../drizzle/schema";

function getTableConfigSafe(v: any) {
  try {
    return getTableConfig(v);
  } catch {
    return null;
  }
}

function columnDDL(col: any): string {
  let ddl = `\`${col.name}\` ${col.getSQLType()}`;
  if (col.primary && col.autoIncrement) {
    ddl += " NOT NULL AUTO_INCREMENT";
    return ddl;
  }
  if (col.notNull) ddl += " NOT NULL";
  if (col.hasDefault && col.default !== undefined) {
    let d = col.default;
    if (typeof d === "boolean") d = d ? 1 : 0;
    if (d === null) ddl += " DEFAULT NULL";
    else if (typeof d === "number") ddl += ` DEFAULT ${d}`;
    else if (typeof d === "string") ddl += ` DEFAULT '${d.replace(/'/g, "''")}'`;
    else if (Array.isArray(d) || typeof d === "object")
      ddl += ` DEFAULT ('${JSON.stringify(d).replace(/'/g, "''")}')`;
  } else if (col.defaultNow) {
    ddl += " DEFAULT CURRENT_TIMESTAMP";
  } else if (!col.notNull) {
    ddl += " DEFAULT NULL";
  }
  return ddl;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const conn = await mysql.createConnection(url);
  const [dbRows] = await conn.query("SELECT DATABASE() AS db");
  const dbName = (dbRows as any)[0].db;

  const [tblRows] = await conn.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=?",
    [dbName],
  );
  const existingTables = new Set((tblRows as any[]).map((r) => r.TABLE_NAME));

  const tables = Object.values(schema)
    .map((v: any) => getTableConfigSafe(v))
    .filter(Boolean) as any[];

  let created = 0;
  for (const cfg of tables) {
    if (existingTables.has(cfg.name)) continue;
    const colDefs: string[] = cfg.columns.map(columnDDL);
    const pkCols = cfg.columns.filter((c: any) => c.primary).map((c: any) => `\`${c.name}\``);
    const parts = [...colDefs];
    if (pkCols.length) parts.push(`PRIMARY KEY (${pkCols.join(", ")})`);
    const ddl = `CREATE TABLE \`${cfg.name}\` (\n  ${parts.join(",\n  ")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
    console.log(`Creating table ${cfg.name} ...`);
    try {
      await conn.query(ddl);
      created++;
    } catch (e: any) {
      console.error(`FAILED ${cfg.name}: ${e.message}`);
      console.error(ddl);
    }
  }
  console.log(created === 0 ? "No missing tables." : `Created ${created} table(s).`);
  await conn.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
