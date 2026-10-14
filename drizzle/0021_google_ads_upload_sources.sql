-- Google Ads conversion uploads: Leads as well as Deals, and a cap on
-- status checks.
--
-- Google Ads worker brief of 14 October 2026, approved by Tom Arrington:
-- upload every Pipedrive Lead that came from a Google click as an
-- "Enquiry" conversion. A Lead's id is a UUID, and this table was keyed on
-- an integer dealId, so a row now names its source: sourceType 'deal' or
-- 'lead', and sourceId as text. statusChecks counts how many times Google
-- answered PROCESSING or REQUEST_STATUS_UNKNOWN for an upload, so the sync
-- can stop asking after five and say so.
--
-- ADDITIVE, AND NO ROW IS LOST. Three columns are added. Every existing row
-- is a Deal row, so it is backfilled with sourceType 'deal' (the column
-- default) and sourceId = its dealId, before sourceId becomes NOT NULL.
-- dealId becomes nullable, because a Lead row has no Deal. The existing
-- unique key on (dealId, conversionActionId) is kept; MySQL allows any
-- number of NULLs in it, so Lead rows do not collide there. The new
-- unique key on (sourceType, sourceId, conversionActionId) is what makes
-- a repeat run send nothing twice for either kind of source.

ALTER TABLE `google_ads_conversion_uploads` ADD `sourceType` enum('deal','lead') NOT NULL DEFAULT 'deal';
--> statement-breakpoint
ALTER TABLE `google_ads_conversion_uploads` ADD `sourceId` varchar(64);
--> statement-breakpoint
ALTER TABLE `google_ads_conversion_uploads` ADD `statusChecks` int NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `google_ads_conversion_uploads` SET `sourceId` = CAST(`dealId` AS CHAR) WHERE `sourceId` IS NULL;
--> statement-breakpoint
ALTER TABLE `google_ads_conversion_uploads` MODIFY `sourceId` varchar(64) NOT NULL;
--> statement-breakpoint
ALTER TABLE `google_ads_conversion_uploads` MODIFY `dealId` int;
--> statement-breakpoint
CREATE UNIQUE INDEX `google_ads_conversion_uploads_source_action` ON `google_ads_conversion_uploads` (`sourceType`,`sourceId`,`conversionActionId`);
