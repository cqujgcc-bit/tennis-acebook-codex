import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [constraints] = await connection.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'match_participants'
        AND CONSTRAINT_NAME = 'match_participants_match_user_unique'`
  );
  if (Number(constraints[0]?.count || 0) > 0) {
    console.log("v1.5.94 migration already applied");
    process.exitCode = 0;
  } else {
    await connection.query("CREATE TABLE IF NOT EXISTS match_participants_v1594_backup LIKE match_participants");
    await connection.query(`
      INSERT IGNORE INTO match_participants_v1594_backup
      SELECT older.*
        FROM match_participants older
        JOIN match_participants newer
          ON older.matchId = newer.matchId
         AND older.userId = newer.userId
         AND older.id < newer.id
    `);
    const [deleted] = await connection.query(`
      DELETE older
        FROM match_participants older
        JOIN match_participants newer
          ON older.matchId = newer.matchId
         AND older.userId = newer.userId
         AND older.id < newer.id
    `);
    await connection.query(`
      ALTER TABLE match_participants
      ADD CONSTRAINT match_participants_match_user_unique UNIQUE (matchId, userId)
    `);
    console.log(`v1.5.94 migration applied; duplicate rows backed up/deleted: ${deleted.affectedRows || 0}`);
  }
} finally {
  await connection.end();
}
