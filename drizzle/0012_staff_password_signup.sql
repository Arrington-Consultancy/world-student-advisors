-- Staff Portal: self-service signup with a work email address and a password.
--
-- Tom Arrington asked for this on 9 September 2026. Staff sign themselves up
-- with their @worldstudentadvisors.com address and set their own password.
--
-- WHY PENDING SIGNUPS ARE NOT staff_users ROWS. Typing a work address is not
-- proof of holding it, so a signup is only real once a verification link sent
-- to that address has been followed. Until then it lives here. The same
-- reasoning as the Google approval gate in 0011: a half-finished stranger
-- sitting in staff_users would appear on the Staff access screen as somebody
-- to assign permissions to, and the point of verifying is that such a person
-- never gets that far.
--
-- WHY THE TOKEN IS STORED AS A HASH. The plain token goes in the email and
-- nowhere else. Anyone reading this table cannot mint a working link from it,
-- which matters because the link is the whole proof of address ownership.
-- Same treatment the student portal already gives its reset tokens.
--
-- WHY CONSUMED ROWS ARE KEPT. consumedAt makes a link single use, and the row
-- remains as the record of when an account was created and from which signup.
--
-- Each statement is separated by a statement-breakpoint marker. Without them
-- drizzle-kit sends the whole file as one query and mysql2 refuses it without
-- printing why, which is what cost migration 0009 a run.

CREATE TABLE IF NOT EXISTS `staff_signup_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  -- Already lowercased and trimmed by shared/staffSignIn.ts's normaliseEmail,
  -- the same function every other sign-in path uses.
  `email` VARCHAR(320) NOT NULL,
  -- bcrypt of the password the person chose, carried across to staff_users on
  -- verification. Never the password itself.
  `passwordHash` VARCHAR(255) NOT NULL,
  -- bcrypt of the verification token. The token itself exists only in the email.
  `verificationTokenHash` VARCHAR(255) NOT NULL,
  `expiresAt` TIMESTAMP NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Set when the link is followed. A spent link can never be replayed.
  `consumedAt` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  -- One pending signup per address: a second attempt replaces the first, so a
  -- person who mistypes their password and starts again does not end up with
  -- two live links.
  UNIQUE KEY `staff_signup_requests_email_unique` (`email`)
);
--> statement-breakpoint
-- Set only for authProvider 'password'. Null for Microsoft and Google
-- accounts, which hold no password here and never will.
ALTER TABLE `staff_users` ADD COLUMN `passwordHash` VARCHAR(255) NULL DEFAULT NULL;
