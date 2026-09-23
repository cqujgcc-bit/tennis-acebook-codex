CREATE TABLE `match_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`revieweeId` int NOT NULL,
	`punctualityScore` int NOT NULL,
	`friendlinessScore` int NOT NULL,
	`levelMatchScore` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `city` varchar(50) DEFAULT 'shenzhen' NOT NULL;--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `ntrpMin` decimal(3,1);--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `ntrpMax` decimal(3,1);--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `costSplitType` enum('free','aa','host_pays','custom') DEFAULT 'aa';--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `bringOwnBall` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `ntrpLevel` decimal(3,1);--> statement-breakpoint
ALTER TABLE `users` ADD `creditScore` int DEFAULT 100 NOT NULL;