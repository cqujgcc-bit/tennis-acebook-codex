import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Check if columns already exist
  const [cols] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='coach_profiles' AND COLUMN_NAME IN ('phone','contentReviewStatus','contentReviewNote')"
  );
  const existing = cols.map(c => c.COLUMN_NAME);
  console.log("Existing columns:", existing);

  if (!existing.includes("phone")) {
    await conn.query("ALTER TABLE coach_profiles ADD COLUMN phone VARCHAR(20) NULL");
    console.log("✅ Added phone column");
  } else {
    console.log("⏭ phone already exists");
  }

  if (!existing.includes("contentReviewStatus")) {
    await conn.query("ALTER TABLE coach_profiles ADD COLUMN contentReviewStatus ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'");
    console.log("✅ Added contentReviewStatus column");
  } else {
    console.log("⏭ contentReviewStatus already exists");
  }

  if (!existing.includes("contentReviewNote")) {
    await conn.query("ALTER TABLE coach_profiles ADD COLUMN contentReviewNote TEXT NULL");
    console.log("✅ Added contentReviewNote column");
  } else {
    console.log("⏭ contentReviewNote already exists");
  }

  console.log("Migration complete!");
} catch (err) {
  console.error("Migration failed:", err.message);
} finally {
  await conn.end();
}
