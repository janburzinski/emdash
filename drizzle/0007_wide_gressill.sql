CREATE TABLE `remote_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`label` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_remote_shares_token_hash` ON `remote_shares` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_remote_shares_task_id` ON `remote_shares` (`task_id`);