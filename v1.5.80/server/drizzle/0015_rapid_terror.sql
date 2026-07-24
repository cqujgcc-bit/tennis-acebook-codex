ALTER TABLE `venues` MODIFY COLUMN `area` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `venues` ADD `district` varchar(50);--> statement-breakpoint
ALTER TABLE `venues` ADD `operatorName` varchar(200);--> statement-breakpoint
ALTER TABLE `venues` ADD `bookingMethod` varchar(300);--> statement-breakpoint
ALTER TABLE `venues` ADD `coverImage` text;--> statement-breakpoint
ALTER TABLE `venues` ADD `featureDesc` text;