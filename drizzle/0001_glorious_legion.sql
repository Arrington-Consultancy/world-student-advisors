CREATE TABLE `failed_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formType` varchar(30) NOT NULL,
	`email` varchar(320),
	`payload` text NOT NULL,
	`errorMessage` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `failed_submissions_id` PRIMARY KEY(`id`)
);
