CREATE TABLE `infrastructure_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`automationIdentity` varchar(60) NOT NULL,
	`runReference` varchar(200) NOT NULL,
	`action` varchar(60) NOT NULL,
	`phase` enum('intent','result') NOT NULL,
	`targetSystem` enum('microsoft_entra','railway','staff_portal') NOT NULL,
	`targetResource` varchar(255) NOT NULL,
	`permissionDecision` enum('allowed','denied') NOT NULL,
	`permissionReason` text NOT NULL,
	`success` int,
	`errorCategory` varchar(40) NOT NULL,
	`deploymentId` varchar(64),
	`humanApprovalReference` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `infrastructure_audit_events_id` PRIMARY KEY(`id`)
);
