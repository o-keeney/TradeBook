CREATE TABLE `bids_quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`tradesman_id` text NOT NULL,
	`estimated_cost` real,
	`estimated_timeline` text,
	`notes` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tradesman_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bids_quotes_work_order_id_idx` ON `bids_quotes` (`work_order_id`);--> statement-breakpoint
CREATE INDEX `bids_quotes_tradesman_id_idx` ON `bids_quotes` (`tradesman_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bids_quotes_work_order_tradesman_unique` ON `bids_quotes` (`work_order_id`,`tradesman_id`);--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`assigned_tradesman_id` text,
	`trade_category` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`dimensions_json` text DEFAULT '{}' NOT NULL,
	`location_address` text NOT NULL,
	`location_postcode` text NOT NULL,
	`submission_type` text NOT NULL,
	`status` text NOT NULL,
	`due_date` integer,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_tradesman_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `work_orders_customer_id_idx` ON `work_orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `work_orders_assigned_tradesman_id_idx` ON `work_orders` (`assigned_tradesman_id`);--> statement-breakpoint
CREATE INDEX `work_orders_status_idx` ON `work_orders` (`status`);