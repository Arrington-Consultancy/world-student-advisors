-- Management-information resolutions.
--
-- Tom Arrington's direction of 11 September 2026: the Staff Portal resolves
-- management-information questions first, checking the authorised WSA
-- sources before saying anything is unavailable, and records every
-- resolution with its coverage and the kind of gap it exposed, routed to a
-- named human owner.
--
-- ADDITIVE ONLY. One CREATE TABLE. No existing table, column or row is
-- touched. Rollback would be DROP TABLE, which is destructive and is not
-- provided.

CREATE TABLE `information_resolutions` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `requestText` TEXT NOT NULL,
  `staffUserId` INT,
  `authMethod` ENUM('entra_sso','shared_password','shared_executive') NOT NULL,
  `measure` VARCHAR(20),
  `subject` VARCHAR(20),
  `outcome` ENUM('answered','partial','unavailable','permission_denied','connector_unavailable','not_information') NOT NULL,
  `gapType` ENUM('none','router_defect','workforce_remit_gap','connector_gap','data_quality_gap','reporting_gap','permission_gap','out_of_scope') NOT NULL,
  `coverageFrom` TIMESTAMP NULL,
  `coverageTo` TIMESTAMP NULL,
  `reliableFrom` TIMESTAMP NULL,
  `sourcesChecked` VARCHAR(255) NOT NULL,
  `humanOwner` VARCHAR(80),
  `answerText` TEXT NOT NULL,
  `routerVersion` VARCHAR(40) NOT NULL,
  `reviewOutcome` VARCHAR(40),
  `reviewedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT (now()),
  CONSTRAINT `information_resolutions_id` PRIMARY KEY(`id`)
);
