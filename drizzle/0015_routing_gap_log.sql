-- Routing Gap Log.
--
-- Tom Arrington's instruction of 11 September 2026: do not silently discard
-- failed Reception requests. Record every request the router could not
-- confidently route, every request it routed only to find no approved
-- worker owns the outcome, and every staff correction of a route.
--
-- ADDITIVE ONLY. One CREATE TABLE. No existing table, column or row is
-- touched. Rollback would be DROP TABLE, which is destructive and is not
-- provided.
--
-- The table is evidence for human review. Nothing reads it back into
-- routing: a recurring gap becomes a router defect fixed in code, a
-- worker/tool/access defect, a confirmed out-of-scope request, or a
-- governance proposal for Tom. routerVersion joins each row to the model
-- that made the decision so a fixed defect is distinguishable from a live
-- one.
--
-- Data minimisation: requestText is the exact staff wording, which is the
-- evidence; caseReference is an identifier only. No student record is
-- duplicated here.

CREATE TABLE `routing_gap_log` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `requestText` TEXT NOT NULL,
  `staffUserId` INT,
  `authMethod` ENUM('entra_sso','shared_password','shared_executive') NOT NULL,
  `caseReference` VARCHAR(60),
  `interpretedIntent` VARCHAR(60),
  `candidateWorkerIds` VARCHAR(255) NOT NULL,
  `confidence` ENUM('high','medium','low','none') NOT NULL,
  `failureType` ENUM('no_recognised_intent','subject_without_approved_remit','remit_but_worker_inactive','remit_but_capability_closed','permission_failure','connector_failure','ambiguity_needs_clarification','router_misclassification_corrected') NOT NULL,
  `failureReason` TEXT NOT NULL,
  `originalWorkerId` VARCHAR(40),
  `correctedWorkerId` VARCHAR(40),
  `staffNextAction` VARCHAR(40),
  `routerVersion` VARCHAR(40) NOT NULL,
  `reviewOutcome` VARCHAR(40),
  `reviewedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT (now()),
  CONSTRAINT `routing_gap_log_id` PRIMARY KEY(`id`)
);
