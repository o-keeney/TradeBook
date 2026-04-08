CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`password_hash` text,
	`gdpr_consent_data_processing` integer DEFAULT false NOT NULL,
	`gdpr_consent_marketing` integer DEFAULT false NOT NULL,
	`gdpr_consent_contact_display` integer DEFAULT false NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);