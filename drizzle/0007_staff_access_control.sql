ALTER TABLE `staff_users` ADD `baseAccessLevel` int;
--> statement-breakpoint
ALTER TABLE `staff_users` ADD `caseScope` enum('organisation','team','assigned_caseload','own_applicants');
--> statement-breakpoint
ALTER TABLE `staff_users` ADD `accessStatus` enum('active','suspended','disabled');
--> statement-breakpoint
ALTER TABLE `staff_users` ADD `teamId` varchar(60);
--> statement-breakpoint
ALTER TABLE `staff_users` ADD `assignedByStaffUserId` int;
--> statement-breakpoint
ALTER TABLE `staff_users` ADD `assignedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `staff_users` ADD `assignmentReason` varchar(500);
--> statement-breakpoint
CREATE TABLE `staff_access_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffUserId` int NOT NULL,
	`grantType` enum('functional_scope','action_permission','sensitive_overlay','case_scope') NOT NULL,
	`value` varchar(60) NOT NULL,
	`expiresAt` timestamp,
	`grantedByStaffUserId` int NOT NULL,
	`reason` varchar(500) NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`revokedByStaffUserId` int,
	`revocationReason` varchar(500),
	CONSTRAINT `staff_access_grants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `staff_access_grants_staffUserId_idx` ON `staff_access_grants` (`staffUserId`);
--> statement-breakpoint
CREATE TABLE `staff_access_changes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffUserId` int NOT NULL,
	`changedByStaffUserId` int,
	`changeType` enum('level_assigned','level_changed','case_scope_changed','status_changed','team_changed','grant_added','grant_revoked','grant_expired') NOT NULL,
	`previousValue` varchar(200),
	`newValue` varchar(200),
	`reason` varchar(500) NOT NULL,
	`authorityReference` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_access_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `staff_access_changes_staffUserId_idx` ON `staff_access_changes` (`staffUserId`);
