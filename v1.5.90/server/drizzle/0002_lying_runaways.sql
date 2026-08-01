CREATE TABLE `sms_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code` varchar(6) NOT NULL,
	`purpose` enum('login','register') NOT NULL DEFAULT 'login',
	`isUsed` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_codes_id` PRIMARY KEY(`id`)
);
