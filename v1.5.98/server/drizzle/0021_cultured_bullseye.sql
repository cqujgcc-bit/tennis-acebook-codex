CREATE TABLE `match_replace_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int,
	`token` varchar(64) NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_replace_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_replace_invites_token_unique` UNIQUE(`token`)
);
