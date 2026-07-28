ALTER TABLE `users` ADD `wechatOpenid` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_wechatOpenid_unique` UNIQUE(`wechatOpenid`);