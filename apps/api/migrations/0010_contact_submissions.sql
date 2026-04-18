CREATE TABLE `contact_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`message` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_submissions_created_at_idx` ON `contact_submissions` (`created_at`);
