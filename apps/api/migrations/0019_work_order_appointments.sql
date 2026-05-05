CREATE TABLE `work_order_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`tradesman_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`reminder_sent_at` integer,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tradesman_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_order_appointments_work_order_id_idx` ON `work_order_appointments` (`work_order_id`);
--> statement-breakpoint
CREATE INDEX `work_order_appointments_tradesman_id_starts_at_idx` ON `work_order_appointments` (`tradesman_id`,`starts_at`);
--> statement-breakpoint
CREATE INDEX `work_order_appointments_customer_id_idx` ON `work_order_appointments` (`customer_id`);
