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
--
-- The new value is APPENDED to the end of the list rather than slotted in
-- alphabetically, and that ordering is load bearing. MySQL stores an enum
-- as the ordinal position of its value. Appending leaves every existing
-- ordinal untouched, so the change is metadata only and needs no table
-- copy. Inserting in the middle would shift shared_password from 2 to 3
-- and force a full rebuild of both tables, remapping every row. That
-- rebuild does preserve values, but it is a far larger operation to run
-- against a live audit trail for no gain. Do not reorder this list.

ALTER TABLE `workforce_audit_events`
  MODIFY COLUMN `authMethod` ENUM('entra_sso', 'shared_password', 'shared_executive') NOT NULL;

ALTER TABLE `staff_enquiries`
  MODIFY COLUMN `authMethod` ENUM('entra_sso', 'shared_password', 'shared_executive') NOT NULL;
