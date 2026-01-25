CREATE TABLE `concerts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`venue` text NOT NULL,
	`city` text NOT NULL,
	`ticket_url` text,
	`is_sold_out` integer DEFAULT false,
	`description` text,
	`created_at` text DEFAULT '',
	`updated_at` text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`image` text,
	`order` integer DEFAULT 0,
	`bio` text,
	`created_at` text DEFAULT '',
	`updated_at` text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `merch` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`image` text,
	`price` text,
	`buy_url` text,
	`order` integer DEFAULT 0,
	`created_at` text DEFAULT '',
	`updated_at` text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`image` text,
	`excerpt` text,
	`tags` text,
	`gallery` text,
	`body` text,
	`created_at` text DEFAULT '',
	`updated_at` text DEFAULT ''
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT ''
);
