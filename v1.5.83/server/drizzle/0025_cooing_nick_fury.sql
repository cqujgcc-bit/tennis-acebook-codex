CREATE TABLE `match_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`msgType` enum('text','system') NOT NULL DEFAULT 'text',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_messages_id` PRIMARY KEY(`id`)
);
