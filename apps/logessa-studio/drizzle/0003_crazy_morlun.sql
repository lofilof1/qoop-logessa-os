DROP INDEX `production_request_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `production_request_idx` ON `production_jobs` (`owner`,`request_id`);