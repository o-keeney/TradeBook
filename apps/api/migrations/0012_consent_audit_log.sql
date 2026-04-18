CREATE TABLE `consent_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`ip` text,
	`user_agent` text,
	`gdpr_consent_data_processing` integer NOT NULL,
	`gdpr_consent_marketing` integer NOT NULL,
	`gdpr_consent_contact_display` integer NOT NULL,
	`source` text DEFAULT 'register' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `consent_audit_log_user_id_idx` ON `consent_audit_log` (`user_id`);
--> statement-breakpoint
CREATE INDEX `consent_audit_log_created_at_idx` ON `consent_audit_log` (`created_at`);
