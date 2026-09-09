-- Staff Portal: Google sign-in with a per-address approval list.
--
-- Tom Arrington decided on 9 September 2026 that staff should be able to
-- sign in with a personal Google account, approved one address at a time and
-- revocable. With Google there is no tenant and no domain to rely on, so the
-- table below is the only thing standing between a stranger and a staff
-- session. Everything about it is shaped by that.
--
-- WHY APPROVALS ARE REVOKED AND NOT DELETED. Deleting the row would erase
-- the fact that somebody was once let in, which is exactly what an audit of
-- "who had access, and when" needs. revokedAt marks the end of access and
-- keeps the record.
--
-- WHY entraObjectId BECOMES NULLABLE. It was NOT NULL because every staff
-- member arrived through Entra. A Google account has no Entra object id, so
-- the column can no longer be required. MySQL permits many NULLs under a
-- UNIQUE index, so the constraint still does its job for Microsoft accounts.
-- Existing rows are untouched and keep their value: widening NOT NULL to
-- NULL cannot fail on data that already exists.
--
-- Each statement is separated by a statement-breakpoint marker. Without
-- them drizzle-kit sends the whole file as one query and mysql2 refuses it
-- without printing why, which is what cost migration 0009 a run.

CREATE TABLE IF NOT EXISTS `staff_approved_emails` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(320) NOT NULL,
  `approvedByStaffUserId` INT NOT NULL,
  `approvedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reason` VARCHAR(500) NOT NULL,
  `revokedAt` TIMESTAMP NULL DEFAULT NULL,
  `revokedByStaffUserId` INT NULL DEFAULT NULL,
  `revocationReason` VARCHAR(500) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_approved_emails_email_unique` (`email`)
);
--> statement-breakpoint
ALTER TABLE `staff_users` ADD COLUMN `authProvider` VARCHAR(20) NOT NULL DEFAULT 'microsoft';
--> statement-breakpoint
ALTER TABLE `staff_users` ADD COLUMN `googleSubjectId` VARCHAR(64) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `staff_users` ADD UNIQUE KEY `staff_users_googleSubjectId_unique` (`googleSubjectId`);
--> statement-breakpoint
ALTER TABLE `staff_users` MODIFY COLUMN `entraObjectId` VARCHAR(64) NULL DEFAULT NULL;
