ALTER TABLE `posts` ADD `concert_id` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `published` integer DEFAULT false NOT NULL;