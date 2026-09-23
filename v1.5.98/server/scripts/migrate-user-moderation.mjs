import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

// Check existing columns
const [cols] = await conn.query("SHOW COLUMNS FROM users");
const existingCols = cols.map((c) => c.Field);
console.log("Existing columns:", existingCols);

const migrations = [];

if (!existingCols.includes("status")) {
  migrations.push(
    "ALTER TABLE `users` ADD COLUMN `status` ENUM('active','warned','banned') NOT NULL DEFAULT 'active'"
  );
}
if (!existingCols.includes("banReason")) {
  migrations.push("ALTER TABLE `users` ADD COLUMN `banReason` TEXT");
}
if (!existingCols.includes("warningCount")) {
  migrations.push(
    "ALTER TABLE `users` ADD COLUMN `warningCount` INT NOT NULL DEFAULT 0"
  );
}
if (!existingCols.includes("warningHistory")) {
  migrations.push(
    "ALTER TABLE `users` ADD COLUMN `warningHistory` JSON"
  );
}

if (migrations.length === 0) {
  console.log("All columns already exist, nothing to migrate.");
} else {
  for (const sql of migrations) {
    console.log("Running:", sql);
    await conn.query(sql);
    console.log("  ✓ Done");
  }
  console.log("Migration complete!");
}

await conn.end();
