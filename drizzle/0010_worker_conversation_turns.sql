-- A worker conversation that survives past one message.
--
-- Until now executeWorker took a single requestText and sent exactly two
-- messages to the model: the system prompt and that one line. Every Send
-- was therefore a first message. A staff member who answered a worker's
-- own follow-up question got told the message contained no clear request,
-- because from the worker's side it genuinely did not.
--
-- WHY THE TRANSCRIPT LIVES HERE AND NOT IN THE BROWSER.
-- The obvious cheap fix is to keep the turns in React state and post them
-- back each time. That would mean the server accepting, as fact, a claim
-- about what a worker previously said. Anyone able to call the endpoint
-- could forge a plausible prior answer and use it to steer the worker
-- somewhere its brief does not allow, and the forgery would be
-- indistinguishable from real history. So the client is given an opaque
-- conversation id and nothing else, and the server rebuilds the
-- conversation from turns it wrote itself.
--
-- WHAT IS DELIBERATELY NOT STORED.
-- Only turns from an answered exchange are recorded. A refused or
-- withheld answer never becomes history, which matters most for Priya:
-- text blocked for making a determination about a person must not be
-- replayed into the next prompt as something she already said, because
-- that would launder blocked content back into her context one turn
-- later.
--
-- ISOLATION.
-- A row carries both staffUserId and workerId, and both are checked on
-- resume. A conversation cannot be continued by a different staff member,
-- and Nia's thread can never be read into Priya's context. This is the
-- same boundary the context isolation layer draws, extended over time.

CREATE TABLE `worker_conversation_turns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` varchar(64) NOT NULL,
	`staffUserId` int,
	`workerId` varchar(40) NOT NULL,
	`role` enum('staff','worker') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `worker_conversation_turns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `worker_conversation_turns_conversation_idx` ON `worker_conversation_turns` (`conversationId`,`id`);
--> statement-breakpoint
CREATE INDEX `worker_conversation_turns_owner_idx` ON `worker_conversation_turns` (`staffUserId`,`workerId`);
