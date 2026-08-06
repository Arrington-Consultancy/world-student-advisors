ALTER TABLE `portal_users` ADD `pipedriveObjectType` varchar(10);
--> statement-breakpoint
ALTER TABLE `portal_users` ADD `pipedriveObjectId` varchar(64);
--> statement-breakpoint
UPDATE `portal_users` SET `pipedriveObjectType` = 'deal', `pipedriveObjectId` = CAST(`pipedriveDealId` AS CHAR) WHERE `pipedriveDealId` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `portal_users` DROP COLUMN `pipedriveDealId`;
