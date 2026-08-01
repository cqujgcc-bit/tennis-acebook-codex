ALTER TABLE `coach_profiles` ADD `certificationImages` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `coach_profiles` ADD `socialLinks` json DEFAULT ('{}');--> statement-breakpoint
ALTER TABLE `coach_profiles` ADD `videoUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `coach_profiles` ADD `categoryTags` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `coach_profiles` ADD `sortWeight` int DEFAULT 0 NOT NULL;