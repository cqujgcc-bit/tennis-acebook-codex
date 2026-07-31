CREATE TABLE `circle_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `circle_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `circles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`avatar` text,
	`inviteCode` varchar(12) NOT NULL,
	`ownerId` int NOT NULL,
	`maxMembers` int NOT NULL DEFAULT 50,
	`memberCount` int NOT NULL DEFAULT 1,
	`isPrivate` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `circles_id` PRIMARY KEY(`id`),
	CONSTRAINT `circles_inviteCode_unique` UNIQUE(`inviteCode`)
);
