-- Break-glass executive access needs its own audit auth method.
--
-- A shared credential identifies nobody, so its audit rows must say that
-- rather than borrowing "entra_sso", which would imply a named person was
-- established when none was. "shared_password" would be equally wrong: the
-- legacy shared password grants no access at all, and conflating the two
-- would make the trail unreadable.
--
-- Widening an enum is additive and backward compatible. Every existing row
-- keeps its value and any code still writing only the two original values
-- keeps working, so this migration is safe to apply before the code that
-- uses the new value is deployed. That order is deliberate: applying it
-- first removes the window in which the new code could try to write a
-- value the column does not accept.

ALTER TABLE `workforce_audit_events`
  MODIFY COLUMN `authMethod` ENUM('entra_sso', 'shared_executive', 'shared_password') NOT NULL;

ALTER TABLE `staff_enquiries`
  MODIFY COLUMN `authMethod` ENUM('entra_sso', 'shared_executive', 'shared_password') NOT NULL;
