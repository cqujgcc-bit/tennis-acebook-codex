CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingNo` varchar(30) NOT NULL,
	`studentId` int NOT NULL,
	`coachId` int NOT NULL,
	`venueId` int NOT NULL,
	`lessonDate` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`durationHours` decimal(4,2) DEFAULT '1.00',
	`pricePerHour` decimal(10,2) NOT NULL,
	`totalAmount` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) DEFAULT '0.00',
	`finalAmount` decimal(10,2) NOT NULL,
	`couponId` int,
	`status` enum('pending','confirmed','completed','cancelled_by_student','cancelled_by_coach','rejected') NOT NULL DEFAULT 'pending',
	`studentNote` text,
	`coachNote` text,
	`cancelReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`confirmedAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_bookingNo_unique` UNIQUE(`bookingNo`)
);
--> statement-breakpoint
CREATE TABLE `coach_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`dayOfWeek` int,
	`specificDate` varchar(10),
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coach_availability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coach_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`tagline` varchar(200),
	`bio` text,
	`avatar` text,
	`coverImage` text,
	`yearsExperience` int DEFAULT 0,
	`certifications` json DEFAULT ('[]'),
	`specialties` json DEFAULT ('[]'),
	`achievements` json DEFAULT ('[]'),
	`pricePerHour` decimal(10,2) NOT NULL DEFAULT '600.00',
	`inviteCode` varchar(20),
	`shareSlug` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`isVerified` boolean NOT NULL DEFAULT false,
	`totalLessons` int NOT NULL DEFAULT 0,
	`totalStudents` int NOT NULL DEFAULT 0,
	`avgRating` decimal(3,2) DEFAULT '5.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coach_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `coach_profiles_inviteCode_unique` UNIQUE(`inviteCode`),
	CONSTRAINT `coach_profiles_shareSlug_unique` UNIQUE(`shareSlug`)
);
--> statement-breakpoint
CREATE TABLE `coach_venues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`venueId` int NOT NULL,
	`isPreferred` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coach_venues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_usages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`userId` int NOT NULL,
	`bookingId` int NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_usages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int,
	`code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('fixed','percent') NOT NULL,
	`discountValue` decimal(10,2) NOT NULL,
	`minOrderAmount` decimal(10,2) DEFAULT '0.00',
	`maxUsageCount` int DEFAULT 100,
	`usedCount` int NOT NULL DEFAULT 0,
	`isFirstLesson` boolean DEFAULT false,
	`validFrom` timestamp NOT NULL,
	`validUntil` timestamp NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `invite_usages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`invitedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invite_usages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('booking_created','booking_confirmed','booking_rejected','booking_cancelled','lesson_reminder','payment_success','review_received','settlement_completed','system') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`relatedId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`studentId` int NOT NULL,
	`coachId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(50) DEFAULT 'wechat_pay',
	`transactionId` varchar(100),
	`paidAt` timestamp,
	`settlementStatus` enum('pending','settled') NOT NULL DEFAULT 'pending',
	`settledAt` timestamp,
	`platformFeeRate` decimal(5,4) DEFAULT '0.0500',
	`platformFee` decimal(10,2) DEFAULT '0.00',
	`coachEarnings` decimal(10,2) DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`studentId` int NOT NULL,
	`coachId` int NOT NULL,
	`rating` int NOT NULL,
	`content` text,
	`tags` json DEFAULT ('[]'),
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_bookingId_unique` UNIQUE(`bookingId`)
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`area` enum('大学城','南山','福田','其他') NOT NULL,
	`address` varchar(200) NOT NULL,
	`description` text,
	`facilities` json DEFAULT ('[]'),
	`courtCount` int NOT NULL DEFAULT 1,
	`courtTypes` json DEFAULT ('[]'),
	`pricePerHour` decimal(10,2) DEFAULT '100.00',
	`openTime` varchar(10) DEFAULT '08:00',
	`closeTime` varchar(10) DEFAULT '22:00',
	`phone` varchar(20),
	`images` json DEFAULT ('[]'),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','coach','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` text;