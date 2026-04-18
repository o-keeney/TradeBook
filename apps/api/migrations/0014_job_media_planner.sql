CREATE TABLE `job_work_media` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`uploaded_by_user_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_work_media_work_order_id_idx` ON `job_work_media` (`work_order_id`);
--> statement-breakpoint
CREATE INDEX `job_work_media_uploaded_by_user_id_idx` ON `job_work_media` (`uploaded_by_user_id`);
--> statement-breakpoint
CREATE TABLE `planner_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`column_key` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `planner_tasks_work_order_id_idx` ON `planner_tasks` (`work_order_id`);
