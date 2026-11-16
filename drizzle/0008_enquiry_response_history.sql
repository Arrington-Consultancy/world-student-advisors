CREATE TABLE `staff_enquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffUserId` int,
	`authMethod` enum('entra_sso','shared_password') NOT NULL,
	`caseId` varchar(60),
	`requestSummary` varchar(500) NOT NULL,
	`functionalScope` varchar(40) NOT NULL,
	`sensitiveOverlay` varchar(40),
	`leadWorkerId` varchar(40),
	`outcome` enum('recommendation','recommendation_with_unresolved_disagreement','human_check_required','invalid','no_recommendation') NOT NULL,
	`finalResponse` text,
	`qualityCheckPassed` int,
	`approvalState` enum('not_required','prepared_for_approval','approved','rejected','executed') NOT NULL,
	`approvedByStaffUserId` int,
	`approvedAt` timestamp,
	`actionTaken` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp,
	CONSTRAINT `staff_enquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `staff_enquiries_staffUserId_idx` ON `staff_enquiries` (`staffUserId`);
--> statement-breakpoint
CREATE INDEX `staff_enquiries_caseId_idx` ON `staff_enquiries` (`caseId`);
--> statement-breakpoint
CREATE INDEX `staff_enquiries_createdAt_idx` ON `staff_enquiries` (`createdAt`);
--> statement-breakpoint
CREATE TABLE `staff_enquiry_contributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enquiryId` int NOT NULL,
	`workerId` varchar(40) NOT NULL,
	`workerSpecificationVersion` varchar(60) NOT NULL,
	`isLead` int NOT NULL,
	`functionalScope` varchar(40) NOT NULL,
	`position` text,
	`confidence` enum('certain','likely','unproven') NOT NULL,
	`evidenceQuality` enum('verified','partial','insufficient') NOT NULL,
	`disagreedWithWorkerId` varchar(40),
	`cannotAnswer` int NOT NULL,
	`evidenceReference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_enquiry_contributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `staff_enquiry_contributions_enquiryId_idx` ON `staff_enquiry_contributions` (`enquiryId`);
