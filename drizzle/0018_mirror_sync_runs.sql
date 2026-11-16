-- Reporting mirror sync runs (Pipedrive to Google Drive).
--
-- Tom Arrington's direction of 11 September 2026: a scheduled, sanitised,
-- read-only export of CRM reporting data into one dedicated Google Drive
-- folder, with every run recorded and a failed run never overwriting the
-- last good data.
--
-- ADDITIVE ONLY. One CREATE TABLE. No existing table, column or row is
-- touched. Rollback would be DROP TABLE, which is destructive and is not
-- provided.

CREATE TABLE `mirror_sync_runs` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `startedAt` TIMESTAMP NOT NULL,
  `finishedAt` TIMESTAMP NULL,
  `status` ENUM('running','complete','partial','failed') NOT NULL,
  `reason` VARCHAR(400),
  `trigger` ENUM('schedule','manual','acceptance') NOT NULL,
  `tokenSource` VARCHAR(20),
  `leadCount` INT,
  `dealCount` INT,
  `personCount` INT,
  `coverageFrom` TIMESTAMP NULL,
  `coverageTo` TIMESTAMP NULL,
  `folderId` VARCHAR(100),
  `manifestFileId` VARCHAR(100),
  `filesJson` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT (now()),
  CONSTRAINT `mirror_sync_runs_id` PRIMARY KEY(`id`)
);
