CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`tradesman_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tradesman_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_work_order_id_unique` ON `reviews` (`work_order_id`);
--> statement-breakpoint
CREATE INDEX `reviews_tradesman_id_idx` ON `reviews` (`tradesman_id`);
--> statement-breakpoint
CREATE INDEX `reviews_reviewer_id_idx` ON `reviews` (`reviewer_id`);
