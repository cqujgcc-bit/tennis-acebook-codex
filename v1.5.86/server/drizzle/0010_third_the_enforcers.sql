ALTER TABLE `tennis_matches` MODIFY COLUMN `levelRequired` enum('itf1','itf2','itf3','itf4','itf5','itf6','itf7','itf8','itf9','itf10','any') NOT NULL DEFAULT 'any';--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `costPerPerson` decimal(10,2);--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `imageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `tennis_matches` ADD `longitude` decimal(10,7);