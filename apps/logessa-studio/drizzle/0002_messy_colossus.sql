CREATE TABLE `production_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request_id` text NOT NULL,
	`input` text NOT NULL,
	`output` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`step` text DEFAULT 'plan' NOT NULL,
	`design_id` text,
	`error` text,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`started_step` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `production_owner_idx` ON `production_jobs` (`owner`,`created_at`);--> statement-breakpoint
CREATE INDEX `production_request_idx` ON `production_jobs` (`owner`,`request_id`);