CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_work_order_id_unique` ON `conversations` (`work_order_id`);
--> statement-breakpoint
CREATE INDEX `conversations_updated_at_idx` ON `conversations` (`updated_at`);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversation_messages_conversation_id_created_at_idx` ON `conversation_messages` (`conversation_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `conversation_messages_author_id_idx` ON `conversation_messages` (`author_id`);
--> statement-breakpoint
CREATE TABLE `conversation_read_states` (
	`conversation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`last_read_at` integer NOT NULL,
	PRIMARY KEY(`conversation_id`, `user_id`),
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversation_read_states_user_id_idx` ON `conversation_read_states` (`user_id`);
