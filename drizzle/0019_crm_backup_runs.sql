-- Pipedrive disaster-recovery backup runs (to Google Drive).
--
-- Tom Arrington's direction of 11 September 2026: a daily timestamped
-- backup snapshot of the CRM with a manifest, never overwriting the last
-- good backup after a failed export.
--
-- ADDITIVE ONLY. One CREATE TABLE. No existing table, column or row is
-- touched. Rollback would be DROP TABLE, which is destructive and is not
-- provided.

CREATE TABLE `crm_backup_runs` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `startedAt` TIMESTAMP NOT NULL,
  `finishedAt` TIMESTAMP NULL,
  `status` ENUM('running','complete','partial','failed') NOT NULL,
  `reason` VARCHAR(400),
  `trigger` ENUM('schedule','manual','acceptance') NOT NULL,
  `tokenSource` VARCHAR(20),
  `snapshotLabel` VARCHAR(40),
  `snapshotFolderId` VARCHAR(100),
  `countsJson` TEXT,
  `totalBytes` INT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT (now()),
  CONSTRAINT `crm_backup_runs_id` PRIMARY KEY(`id`)
);
