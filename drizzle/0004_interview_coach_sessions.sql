CREATE TABLE `interview_coach_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`portalUserId` int NOT NULL,
	`interviewType` enum('cas','ukvi','university','course') NOT NULL,
	`averageScore` int NOT NULL,
	`passed` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interview_coach_sessions_id` PRIMARY KEY(`id`)
);
