INSERT OR IGNORE INTO `platform_settings` (`key`, `value`, `updated_at`) VALUES
  ('require_email_verified_for_mutations', '1', (strftime('%s','now') * 1000)),
  ('require_sms_verified_for_mutations', '0', (strftime('%s','now') * 1000));

--> statement-breakpoint
ALTER TABLE `users` ADD `phone_verified` integer DEFAULT false NOT NULL;
