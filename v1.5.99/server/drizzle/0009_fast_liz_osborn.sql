CREATE TABLE `coach_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`address` varchar(300) NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coach_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`totalLessons` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`originalPrice` decimal(10,2),
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','confirmed','rejected','cancelled') NOT NULL DEFAULT 'confirmed',
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `package_deductions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentPackageId` int NOT NULL,
	`bookingId` int,
	`deductedBy` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `package_deductions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packageId` int NOT NULL,
	`studentId` int NOT NULL,
	`coachId` int NOT NULL,
	`totalLessons` int NOT NULL,
	`remainingLessons` int NOT NULL,
	`pricePaid` decimal(10,2) NOT NULL,
	`status` enum('pending_payment','active','exhausted','refund_requested','refunded') NOT NULL DEFAULT 'pending_payment',
	`refundNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`paidAt` timestamp,
	CONSTRAINT `student_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tennis_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(100) NOT NULL,
	`matchType` enum('singles','doubles','mixed_doubles','practice','group') NOT NULL,
	`levelRequired` enum('beginner','intermediate','advanced','any') NOT NULL DEFAULT 'any',
	`matchDate` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5),
	`venueName` varchar(200) NOT NULL,
	`venueAddress` varchar(300),
	`maxParticipants` int NOT NULL DEFAULT 2,
	`currentParticipants` int NOT NULL DEFAULT 1,
	`description` text,
	`contactInfo` varchar(200),
	`status` enum('open','full','cancelled','completed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tennis_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coach_profiles` ADD `pkuDiscount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `pkuAlumni` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pkuInfo` json DEFAULT ('null');