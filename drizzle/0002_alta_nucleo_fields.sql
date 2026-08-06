ALTER TABLE `concerts` ADD `announce_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `concerts` ADD `status` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `concerts` ADD `lineup` text;--> statement-breakpoint
ALTER TABLE `concerts` ADD `address` text;--> statement-breakpoint
ALTER TABLE `concerts` ADD `postal_code` text;--> statement-breakpoint
ALTER TABLE `concerts` ADD `bandsintown_url` text;--> statement-breakpoint
ALTER TABLE `concerts` ADD `calendar_event_id` text;--> statement-breakpoint
ALTER TABLE `concerts` ADD `effects` text DEFAULT '{}' NOT NULL;