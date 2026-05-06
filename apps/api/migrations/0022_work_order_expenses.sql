CREATE TABLE `work_order_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`item_label` text NOT NULL,
	`notes` text,
	`amount` real NOT NULL,
	`incurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_order_expenses_work_order_id_idx` ON `work_order_expenses` (`work_order_id`);
--> statement-breakpoint
CREATE INDEX `work_order_expenses_provider_id_idx` ON `work_order_expenses` (`provider_id`);
--> statement-breakpoint
CREATE INDEX `work_order_expenses_work_order_id_incurred_at_idx` ON `work_order_expenses` (`work_order_id`,`incurred_at`);
