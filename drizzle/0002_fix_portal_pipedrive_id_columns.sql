ALTER TABLE `portal_users` DROP COLUMN `pipedriveDealId`;
--> statement-breakpoint
ALTER TABLE `portal_users` ADD COLUMN `pipedriveObjectType` varchar(10);
--> statement-breakpoint
ALTER TABLE `portal_users` ADD COLUMN `pipedriveObjectId` varchar(64);
