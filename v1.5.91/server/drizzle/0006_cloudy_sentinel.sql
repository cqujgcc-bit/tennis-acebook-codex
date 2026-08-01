ALTER TABLE `bookings` MODIFY COLUMN `venueId` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `customVenueName` varchar(200);--> statement-breakpoint
ALTER TABLE `bookings` ADD `customVenueAddress` varchar(500);