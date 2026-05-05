ALTER TABLE `tradesmen_profiles` ADD `stripe_customer_id` text;
--> statement-breakpoint
ALTER TABLE `tradesmen_profiles` ADD `stripe_subscription_id` text;
--> statement-breakpoint
ALTER TABLE `tradesmen_profiles` ADD `stripe_price_id` text;
--> statement-breakpoint
ALTER TABLE `tradesmen_profiles` ADD `stripe_current_period_end` integer;
--> statement-breakpoint
ALTER TABLE `tradesmen_profiles` ADD `stripe_trial_ends_at` integer;
