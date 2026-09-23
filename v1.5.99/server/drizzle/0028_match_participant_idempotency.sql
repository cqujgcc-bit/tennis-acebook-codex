CREATE TABLE IF NOT EXISTS match_participants_v1594_backup LIKE match_participants;
--> statement-breakpoint
INSERT IGNORE INTO match_participants_v1594_backup
SELECT older.*
FROM match_participants older
JOIN match_participants newer
  ON older.matchId = newer.matchId
 AND older.userId = newer.userId
 AND older.id < newer.id;
--> statement-breakpoint
DELETE older
FROM match_participants older
JOIN match_participants newer
  ON older.matchId = newer.matchId
 AND older.userId = newer.userId
 AND older.id < newer.id;
--> statement-breakpoint
ALTER TABLE match_participants
  ADD CONSTRAINT match_participants_match_user_unique UNIQUE (matchId, userId);
