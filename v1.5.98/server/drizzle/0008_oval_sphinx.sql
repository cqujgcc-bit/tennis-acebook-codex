ALTER TABLE `coach_profiles` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `coach_profiles` ADD `contentReviewStatus` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `coach_profiles` ADD `contentReviewNote` text;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','warned','banned') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `banReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `warningCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `warningHistory` json DEFAULT ('[]');