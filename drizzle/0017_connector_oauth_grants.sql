-- Connector OAuth grants (WSA Pipedrive OAuth application).
--
-- Tom Arrington's direction of 11 September 2026: read-only CRM access for the
-- AI workforce through a dedicated WSA OAuth application authorised by an
-- existing WSA account, not a paid service user. Tokens are stored sealed.
--
-- ADDITIVE ONLY. One CREATE TABLE. No existing table, column or row is
-- touched. Rollback would be DROP TABLE, which is destructive and is not
-- provided.

CREATE TABLE `connector_oauth_grants` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `connector` VARCHAR(20) NOT NULL,
  `apiDomain` VARCHAR(120) NOT NULL,
  `scopes` VARCHAR(255) NOT NULL,
  `authorisedByStaffUserId` INT NOT NULL,
  `authorisedAt` TIMESTAMP NOT NULL,
  `sealedAccessToken` TEXT NOT NULL,
  `accessTokenExpiresAt` TIMESTAMP NOT NULL,
  `sealedRefreshToken` TEXT NOT NULL,
  `status` ENUM('active','reauthorisation_required','revoked') NOT NULL,
  `lastRefreshedAt` TIMESTAMP NULL,
  `lastRefreshError` VARCHAR(200),
  `revokedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT (now()),
  CONSTRAINT `connector_oauth_grants_id` PRIMARY KEY(`id`)
);
