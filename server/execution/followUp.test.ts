import { describe, expect, it } from "vitest";
import {
  claimsPriorCompletion,
  extractOffers,
  frameFollowUp,
  looksLikeAcknowledgement,
  polarityOf,
  priorCompletionClaimIsUnfounded,
  readFollowUp,
} from "./followUp";
import { evidenceSourceText } from "./evidence";

/**
 * The production exchange of 18 September 2026, as Tom Arrington reported
 * it: the worker offered a handover note, the staff member wrote "yes", and
 * the worker asked what they meant and said the note already existed.
 */
const FIRST_QUESTION = "Where is Vivian Onuh in the admissions process?";
const WORKER_REPLY =
  "Vivian is at Offer Received. Her counsellor is Glenice, and the last update on her record was 10 September 2026. " +
  "The next step is for the university to confirm the conditions on her offer. " +
  "If you want, I can pull together a clean picture of her admissions history, the offer conditions and what is outstanding, as a handover note.";
const HISTORY = [
  { role: "staff" as const, content: FIRST_QUESTION },
  { role: "worker" as const, content: WORKER_REPLY },
];

describe("extractOffers", () => {
  it("finds the offer sentence at the end of the worker's reply and nothing else", () => {
    expect(extractOffers(WORKER_REPLY)).toEqual([
      "If you want, I can pull together a clean picture of her admissions history, the offer conditions and what is outstanding, as a handover note.",
    ]);
  });
  it("finds questions and several offers, in order", () => {
    const offers = extractOffers("Her record is up to date. Would you like the offer conditions listed? I can also draft the CAS request checklist.");
    expect(offers).toHaveLength(2);
    expect(offers[0]).toContain("Would you like");
    expect(offers[1]).toContain("I can also draft");
  });
  it("finds nothing in a reply that offers nothing", () => {
    expect(extractOffers("Vivian is at Offer Received. Her counsellor is Glenice.")).toEqual([]);
  });
});

describe("polarityOf", () => {
  it.each(["yes", "Yes.", "yes please", "do that", "go ahead", "ok go ahead", "please do", "sure, thanks", "yep", "sounds good", "crack on"])(
    "reads %j as accepting",
    text => expect(polarityOf(text)).toBe("accepts"),
  );
  it.each(["no thanks", "no", "not now", "no thank you", "leave it", "don't bother", "not needed thanks"])(
    "reads %j as declining",
    text => expect(polarityOf(text)).toBe("declines"),
  );
  it.each(["hmm", "later maybe", "what about the visa"])("reads %j as unclear", text => expect(polarityOf(text)).toBe("unclear"));
});

describe("looksLikeAcknowledgement", () => {
  it("accepts short replies that name nobody", () => {
    for (const t of ["yes", "yes please", "go ahead", "no thanks", "ok do that"]) expect(looksLikeAcknowledgement(t)).toBe(true);
  });
  it("rejects a new question, a message naming a student, an identifier, or a long message", () => {
    expect(looksLikeAcknowledgement("What stage is Grace Okoro at?")).toBe(false);
    expect(looksLikeAcknowledgement("yes, and check Grace Okoro too")).toBe(false);
    expect(looksLikeAcknowledgement("yes grace@example.com")).toBe(false);
    expect(looksLikeAcknowledgement("yes please, and could you also tell me what the visa timeline looks like for her intake in January")).toBe(false);
    expect(looksLikeAcknowledgement("who is managing this lead?")).toBe(false);
  });
});

describe("readFollowUp: the exchange of 18 September 2026 and its natural variants", () => {
  it.each(["yes", "yes please", "do that", "go ahead"])("reads %j against the worker's offer as an acceptance", text => {
    const fu = readFollowUp(text, HISTORY);
    expect(fu).not.toBeNull();
    expect(fu!.polarity).toBe("accepts");
    expect(fu!.referent).toContain("handover note");
    const framed = frameFollowUp(fu!);
    expect(framed.startsWith(text)).toBe(true);
    expect(framed).toContain("ACCEPTS");
    expect(framed).toContain("Do the offered work now, in full");
    expect(framed).toContain("Nothing you offered has been produced yet");
    expect(framed).toContain("as a handover note.");
  });
  it("reads \"no thanks\" as a decline of the same offer", () => {
    const fu = readFollowUp("no thanks", HISTORY);
    expect(fu!.polarity).toBe("declines");
    expect(frameFollowUp(fu!)).toContain("DECLINES");
    expect(frameFollowUp(fu!)).toContain("do not produce the offered work");
  });
  it("an unclear reply asks one question about the offer rather than producing or inventing", () => {
    const fu = readFollowUp("hmm", HISTORY);
    expect(fu!.polarity).toBe("unclear");
    expect(frameFollowUp(fu!)).toContain("Ask one focused question");
  });
  it("several offers: the reading is to ask which, never to choose", () => {
    const history = [
      HISTORY[0],
      { role: "worker" as const, content: "Her record is up to date. Would you like the offer conditions listed? I can also draft the CAS request checklist." },
    ];
    const fu = readFollowUp("yes", history);
    expect(fu!.referent).toBeNull();
    expect(fu!.offers).toHaveLength(2);
    expect(frameFollowUp(fu!)).toContain("Ask which, naming them briefly; do not choose");
  });
  it("is not a follow-up when the worker offered nothing, when there is no history, or when the message is a request of its own", () => {
    expect(readFollowUp("yes", [HISTORY[0], { role: "worker", content: "Vivian is at Offer Received. Her counsellor is Glenice." }])).toBeNull();
    expect(readFollowUp("yes", [])).toBeNull();
    expect(readFollowUp("Where is Vivian Onuh in the admissions process?", HISTORY)).toBeNull();
  });
  it("does not depend on any particular name or on the word yes", () => {
    const history = [
      { role: "staff" as const, content: "How is Chidi Okafor getting on?" },
      { role: "worker" as const, content: "Chidi is at Application Preparation with Manet. Shall I set out what documents are still missing?" },
    ];
    expect(readFollowUp("go on then", history)?.polarity).toBe("accepts");
    expect(readFollowUp("not right now", history)?.polarity).toBe("declines");
  });
});

describe("evidence carries the student forward to a short follow-up", () => {
  it("reads the student from the most recent earlier message that names one", () => {
    expect(evidenceSourceText("yes", [FIRST_QUESTION])).toBe(FIRST_QUESTION);
    expect(evidenceSourceText("go ahead", ["thanks", FIRST_QUESTION, "How is Chidi Okafor getting on?"])).toBe(FIRST_QUESTION);
  });
  it("uses the current message when it names somebody itself", () => {
    expect(evidenceSourceText("What about Grace Okoro?", [FIRST_QUESTION])).toBe("What about Grace Okoro?");
  });
  it("falls back to the current text when nothing earlier names anybody", () => {
    expect(evidenceSourceText("yes", ["hello", "thanks"])).toBe("yes");
  });
});

describe("claims of prior completion", () => {
  it("finds the claim the worker made on 18 September 2026 and its natural variants", () => {
    for (const t of [
      "I have already produced the handover note above. Which part would you like me to expand?",
      "As I mentioned earlier, the handover note has been prepared.",
      "The summary I sent earlier covers this.",
      "I have already done that and shared it with you.",
      "The handover note is in my previous message.",
      "That handover note has already been prepared.",
    ]) expect(claimsPriorCompletion(t)).not.toBeNull();
  });
  it("does not fire on ordinary statements about the record or on doing the work now", () => {
    for (const t of [
      "Here is the handover note. Vivian is at Offer Received with Glenice as her counsellor.",
      "Her offer was already made on 3 September 2026 and the conditions are outstanding.",
      "I can produce that now if you want.",
      "The university has already sent the CAS.",
      "Her CAS request has been done by the university and the visa application was submitted on 12 September.",
      "The offer was sent to her on 3 September and the deposit has been paid.",
      "Vivian's documents were provided to the university last week.",
    ]) expect(claimsPriorCompletion(t)).toBeNull();
  });
  it("is unfounded when it answers an accepted offer, or when no worker has spoken before", () => {
    const fu = readFollowUp("yes", HISTORY)!;
    expect(priorCompletionClaimIsUnfounded("I have already produced the handover note above.", fu, HISTORY)).not.toBeNull();
    expect(priorCompletionClaimIsUnfounded("As I mentioned earlier, it is done.", null, [])).not.toBeNull();
  });
  it("stands when a worker has spoken before and the message is not an accepted offer", () => {
    expect(priorCompletionClaimIsUnfounded("As I mentioned earlier, Vivian is at Offer Received.", null, HISTORY)).toBeNull();
    expect(priorCompletionClaimIsUnfounded("Here is the note.", readFollowUp("yes", HISTORY), HISTORY)).toBeNull();
  });
});
