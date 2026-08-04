ALTER TABLE `concerts` ADD `country` text DEFAULT 'Spain';--> statement-breakpoint
ALTER TABLE `concerts` ADD `region` text;--> statement-breakpoint
ALTER TABLE `concerts` ADD `timezone` text DEFAULT 'Europe/Madrid';--> statement-breakpoint
ALTER TABLE `concerts` ADD `start_time` text DEFAULT '20:00';