-- Google Ads Qualified Lead conversion uploads (WSA-owned replacement for
-- the Zapier automation).
--
-- Tom Arrington's brief of 16 September 2026: send the Qualified Lead
-- conversion to Google directly from the WSA backend when a Pipedrive Lead
-- becomes a Deal, with idempotency and an audit record that carries no
-- student personal data.
--
-- ADDITIVE ONLY. One CREATE TABLE. No existing table, column or row is
-- touched. Rollback would be DROP TABLE, which is destructive and is not
-- provided.

CREATE TABLE `google_ads_conversion_uploads` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `dealId` INT NOT NULL,
  `personId` INT,
  `conversionActionId` VARCHAR(32) NOT NULL,
  `transactionId` VARCHAR(80) NOT NULL,
  `eventTimestamp` TIMESTAMP NULL,
  `status` ENUM('uploaded','skipped','failed') NOT NULL,
  `identifiers` VARCHAR(120) NOT NULL,
  `requestId` VARCHAR(120),
  `googleStatus` VARCHAR(40),
  `googleDetail` VARCHAR(400),
  `reason` VARCHAR(400),
  `attempts` INT NOT NULL DEFAULT 1,
  `createdAt` TIMESTAMP NOT NULL DEFAULT (now()),
  `updatedAt` TIMESTAMP NOT NULL DEFAULT (now()),
  CONSTRAINT `google_ads_conversion_uploads_id` PRIMARY KEY(`id`),
  CONSTRAINT `google_ads_conversion_uploads_deal_action` UNIQUE(`dealId`,`conversionActionId`)
);
