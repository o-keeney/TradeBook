CREATE TABLE `tradesmen_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`trade_categories` text DEFAULT '[]' NOT NULL,
	`region_config` text DEFAULT '{}' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`verification_status` text DEFAULT 'none' NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`subscription_status` text DEFAULT 'inactive' NOT NULL,
	`subscription_tier` text,
	`avg_rating` real,
	`review_count` integer DEFAULT 0 NOT NULL,
	`contact_email` text,
	`contact_phone` text,
	`contact_email_visible` integer DEFAULT false NOT NULL,
	`contact_phone_visible` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
