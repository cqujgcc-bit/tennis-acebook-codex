ALTER TABLE `users` ADD `consecutiveAttendCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creditRestoreApplied` boolean DEFAULT false NOT NULL;