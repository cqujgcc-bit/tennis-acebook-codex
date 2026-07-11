CREATE TABLE `circle_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`creatorId` int NOT NULL,
	`title` varchar(100) NOT NULL,
	`description` text,
	`activityDate` varchar(10) NOT NULL,
	`startTime` varchar(5),
	`venueName` varchar(100),
	`maxParticipants` int DEFAULT 20,
	`currentParticipants` int DEFAULT 0,
	`status` enum('open','full','cancelled','completed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `circle_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `circle_activity_signups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `circle_activity_signups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `circle_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`userId` int NOT NULL,
	`content` varchar(200),
	`trainingMinutes` int DEFAULT 0,
	`checkinDate` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `circle_checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `circle_post_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `circle_post_likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`delta` int NOT NULL,
	`reason` varchar(200) NOT NULL,
	`matchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_venues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`address` varchar(200),
	`district` varchar(50),
	`phone` varchar(20),
	`imageUrl` text,
	`bookingUrl` text,
	`description` text,
	`courtCount` int DEFAULT 0,
	`priceRange` varchar(50),
	`amenities` json DEFAULT ('[]'),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_venues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venue_available_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`slotDate` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`courtName` varchar(50),
	`courtType` enum('hard','clay','grass','indoor') DEFAULT 'hard',
	`price` decimal(8,2),
	`isBooked` boolean NOT NULL DEFAULT false,
	`remark` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venue_available_slots_id` PRIMARY KEY(`id`)
);
