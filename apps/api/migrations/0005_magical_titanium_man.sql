CREATE TABLE `job_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`author_id` text NOT NULL,
	`update_type` text NOT NULL,
	`content` text,
	`media_urls` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_updates_work_order_id_idx` ON `job_updates` (`work_order_id`);