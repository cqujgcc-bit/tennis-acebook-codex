CREATE TABLE `circle_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `circle_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `circleId` int;