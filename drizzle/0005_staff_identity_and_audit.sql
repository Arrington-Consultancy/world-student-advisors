CREATE TABLE `staff_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entraObjectId` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`displayName` varchar(200) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastLoginAt` timestamp,
	CONSTRAINT `staff_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_users_entraObjectId_unique` UNIQUE(`entraObjectId`),
	CONSTRAINT `staff_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `workforce_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffUserId` int,
	`authMethod` enum('entra_sso','shared_password') NOT NULL,
	`workerId` varchar(40) NOT NULL,
	`workerSpecificationVersion` varchar(60) NOT NULL,
	`caseId` varchar(60),
	`requestedCapability` varchar(80) NOT NULL,
	`permissionDecision` enum('allowed','denied') NOT NULL,
	`permissionReason` text NOT NULL,
	`connector` varchar(20),
	`connectorOperation` varchar(20),
	`success` int,
	`targetResourceId` varchar(255),
	`handoffToWorkerId` varchar(40),
	`errorCategory` varchar(30) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workforce_audit_events_id` PRIMARY KEY(`id`)
);
