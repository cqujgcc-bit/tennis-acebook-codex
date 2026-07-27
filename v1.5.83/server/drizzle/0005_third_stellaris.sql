ALTER TABLE `coach_availability` ADD `venueId` int;--> statement-breakpoint
ALTER TABLE `coach_availability` ADD `courtNo` varchar(20);--> statement-breakpoint
ALTER TABLE `coach_availability` ADD `venueNote` varchar(200);--> statement-breakpoint
ALTER TABLE `venues` ADD `mapUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `venues` ADD `bookingNote` text;