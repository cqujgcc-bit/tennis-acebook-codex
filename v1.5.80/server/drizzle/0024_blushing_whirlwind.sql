CREATE TABLE `match_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`matchId` int NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','refunding','refunded','settled') NOT NULL DEFAULT 'pending',
	`wxPrepayId` varchar(100),
	`wxTransactionId` varchar(64),
	`refundId` varchar(64),
	`refundReason` varchar(200),
	`paidAt` timestamp,
	`refundedAt` timestamp,
	`settledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `match_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_orders_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `match_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`organizerId` int NOT NULL,
	`totalAmount` decimal(10,2) NOT NULL,
	`platformFee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`netAmount` decimal(10,2) NOT NULL,
	`status` enum('pending','confirming','disputed','settled','cancelled') NOT NULL DEFAULT 'pending',
	`confirmedAt` timestamp,
	`settledAt` timestamp,
	`wxBatchId` varchar(64),
	`disputeReason` text,
	`disputeUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `match_settlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_settlements_matchId_unique` UNIQUE(`matchId`)
);
--> statement-breakpoint
ALTER TABLE `match_participants` ADD `paymentStatus` enum('not_required','pending','paid','refunded') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `match_participants` ADD `orderId` varchar(64);--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `feeRequired` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `feePerPerson` decimal(10,2);--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `paymentDeadline` timestamp;