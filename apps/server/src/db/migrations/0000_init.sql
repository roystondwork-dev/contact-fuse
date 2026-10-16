CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`is_main` integer DEFAULT false NOT NULL,
	`status` text NOT NULL,
	`granted_scopes` text NOT NULL,
	`sync_token` text,
	`last_synced_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "accounts_status_check" CHECK("accounts"."status" IN ('connected', 'needs-reauth', 'disconnected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_provider_account_id_key` ON `accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_is_main_key` ON `accounts` (`is_main`) WHERE "accounts"."is_main" = 1;--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snapshot_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`account_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`etag` text,
	`source` text NOT NULL,
	`contact_json` text NOT NULL,
	`raw_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "snapshot_contacts_source_check" CHECK("snapshot_contacts"."source" IN ('contacts', 'other-contacts'))
);
--> statement-breakpoint
CREATE INDEX `snapshot_contacts_snapshot_id_account_id_idx` ON `snapshot_contacts` (`snapshot_id`,`account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `snapshot_contacts_snapshot_id_account_id_resource_id_key` ON `snapshot_contacts` (`snapshot_id`,`account_id`,`resource_id`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`contact_count` integer DEFAULT 0 NOT NULL,
	`account_count` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	CONSTRAINT "snapshots_status_check" CHECK("snapshots"."status" IN ('running', 'completed', 'failed'))
);
