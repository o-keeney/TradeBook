CREATE TABLE `platform_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `platform_settings` (`key`, `value`, `updated_at`) VALUES ('tradesman_monthly_eur', '30', (strftime('%s','now') * 1000));
