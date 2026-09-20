/**
 * Speak to Juliet: the Nigeria landing page content, kept out of the
 * component so it can be tested without React, as the Nigeria postgraduate
 * page does.
 *
 * AUTHORITY, in the order it is applied:
 *   1. Tom Arrington's WSA Claude Implementation Brief of 19 September 2026,
 *      which is the approval authority and carries the refinements he
 *      accepted after independent review.
 *   2. Tim Hunt's "Draft Landing Page Juliet 19 September 2026.docx", the
 *      master content brief, for everything the implementation brief does
 *      not deliberately modify.
 *   3. The controlled repository, where it is newer or more specific.
 * Both live in 16_WEBSITE_Ai/05 Landing Pages/Juliet. Where Tim's master and
 * the implementation brief disagree, the implementation brief is followed and
 * the difference is recorded in BRIEF_CONFLICTS below rather than resolved
 * quietly.
 *
 * PROVISIONAL COPY. Tim is revising the landing page and Juliet's podcast.
 * Everything he may reword is gathered in this file rather than spread
 * through the markup, and anything still awaiting his decision is marked
 * `PROVISIONAL` with what it is waiting for. His revision should be a small
 * content edit here, never a rebuild of the page.
 *
 * WHAT THIS PAGE DOES NOT DO. It creates no lead itself. The fallback form
 * hands the student's own answers to the /contact signup, which is the one
 * controlled path into the CRM and carries the validation, the bot check and
 * the conversion tracking. It writes nothing to Pipedrive, widens no scope,
 * and creates no second student record.
 */
import { CAMPAIGN_DESTINATIONS, type DesiredLevelValue } from "@shared/studentEnquiryOptions";
import type { CampaignSlug } from "@shared/campaignEnquiry";

/**
 * How an enquiry from this page is identified. The signup procedure validates
 * it against the closed list in shared/campaignEnquiry.ts, records it in the
 * Lead note, and emails this campaign's own recipient list in place of the
 * general staff list, so exactly one notification is sent and it goes to the
 * people Tom Arrington authorised. It is not a counsellor allocation and sets
 * no Pipedrive field.
 */
export const CAMPAIGN_SLUG: CampaignSlug = "speak-to-juliet";

/** Marks a string Tim may still reword. Identity at runtime, a signal in the source. */
const PROVISIONAL = (s: string) => s;

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export interface PersonCard {
  name: string;
  role: string;
  /** Omitted where WSA's controlled records do not support a location line. */
  location?: string;
  /**
   * Contact details are OPTIONAL, and their absence is the guarantee.
   * Tim Hunt, 19 September 2026: Glenice's telephone, WhatsApp and email must
   * not appear on this page, because Juliet contacts the lead and Glenice
   * does not, until the student becomes a Deal. Leaving the values out of the
   * data is stronger than leaving them in and choosing not to render them:
   * there is nothing for a later edit to expose by accident.
   */
  whatsapp?: string;
  /** The digits wa.me needs: international, no plus and no punctuation. */
  whatsappDigits?: string;
  email?: string;
  photo: string;
  photoAlt: string;
}

/**
 * Juliet's details as supplied in Tim Hunt's brief of 18 September 2026 and
 * confirmed for this page by Tom Arrington on 19 September.
 *
 * The team record in client/src/lib/team.ts carries her name, role, location
 * and photograph but holds no email address and no WhatsApp number. The two
 * values below therefore come from Tim's brief and not from that record,
 * which is reported to Tom rather than reconciled here: publishing a contact
 * detail is his call and Juliet's, not a code change.
 */
export const JULIET: PersonCard = Object.freeze({
  name: "Juliet Nnajiofor-Uyi",
  role: "Higher Education Advisor",
  location: "Lagos, Nigeria",
  whatsapp: "+234 803 583 7934",
  whatsappDigits: "2348035837934",
  email: "juliet@worldstudentadvisors.com",
  photo: "/manus-storage/juliet_nnajiofor_uyi_7b797464.jpg",
  photoAlt: "Juliet Nnajiofor-Uyi, Higher Education Advisor at World Student Advisors in Lagos",
});

/**
 * Glenice, as Tim Hunt specified her on 19 September 2026.
 *
 * HER ROLE LINE IS HIS WORDING. "Juliet's dedicated Student Counsellor",
 * "linked to WSA UK Head Office". He explained the wording himself: she works
 * remotely but is part of the UK Head Office operation and has a +44 number.
 * The page therefore says she is LINKED TO that office and never that she
 * sits in it, which is the distinction that keeps the claim true. Her own
 * approved biography places her in Kenya, so no location line is given.
 *
 * NO CONTACT DETAILS. He asked for her telephone, WhatsApp and email to be
 * off this page. They are absent from the record below rather than merely
 * unrendered, so nothing downstream can publish them.
 */
export const GLENICE: PersonCard = Object.freeze({
  name: "Glenice Owino",
  role: "Juliet's dedicated Student Counsellor",
  photo: "/team/glenice-owino.jpg",
  photoAlt: "Glenice Owino, Student Counsellor at World Student Advisors",
});

/** Tim Hunt's wording, kept separate from the role so neither can drift. */
export const GLENICE_HEAD_OFFICE_LINE = "Linked to WSA UK Head Office";

export const GLENICE_QUOTE =
  "I support students throughout their journey, from exploring courses and universities to applications, visas and preparing to leave home.";

/* ------------------------------------------------------------------ */
/* WhatsApp, the primary action                                        */
/* ------------------------------------------------------------------ */

/**
 * The message already typed when WhatsApp opens. A blank first message is
 * the real hesitation, so the page removes it. Wording from Tom Arrington's
 * implementation brief of 19 September 2026.
 */
export const WHATSAPP_FIRST_MESSAGE = PROVISIONAL(
  "Hello Juliet, I saw the WSA page and I would like to ask about studying abroad.",
);

export function whatsappHref(digits: string, message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export const HERO = Object.freeze({
  eyebrow: "For the people of Nigeria",
  headline: "Thinking about studying abroad? Speak to Juliet.",
  /**
   * Tim Hunt's own opening line, quoted exactly from his email of 19
   * September 2026, where he asked for the warmer wording to be restored.
   */
  supporting:
    "Free, personal support for Nigerian students and families from Juliet and the WorldStudentAdvisors team.",
  primaryCta: "Message Juliet on WhatsApp",
  secondaryCta: PROVISIONAL("Would rather not message? Send your details instead."),
});

/**
 * Tim Hunt's key message, from his 19 September master draft and repeated in
 * his email of the same date. It is what the page has to leave the reader
 * with, so it is stated in his words rather than paraphrased.
 */
export const KEY_MESSAGE: ReadonlyArray<string> = Object.freeze([
  "Juliet is your person in Nigeria.",
  "Glenice is your dedicated WSA Student Counsellor, linked to UK Head Office.",
  "WSA provides the infrastructure and expertise.",
  "The service is free.",
]);

/**
 * The charging question is closed. Tim Hunt confirmed it in writing on 19
 * September 2026: "The service is free." The earlier scoped hedge, and the
 * COST_WORDING_PENDING note that recorded what it was waiting for, are gone
 * because the thing they were waiting for has happened.
 */
export const FREE_SERVICE_LINE = "The service is free.";

/* ------------------------------------------------------------------ */
/* What Juliet can help with                                           */
/* ------------------------------------------------------------------ */

export interface StudyFamily {
  title: string;
  body: string;
}

/**
 * Four families rather than nine equal options. Every route in Tim's brief is
 * still named, inside a family, so nothing he listed is lost. The wording
 * avoids implying that every course or destination is always available.
 */
export const STUDY_FAMILIES: ReadonlyArray<StudyFamily> = Object.freeze([
  {
    title: PROVISIONAL("Degrees abroad"),
    body: PROVISIONAL(
      "PhD and Master's degrees, undergraduate degrees, top-up degrees and International Foundation Programmes.",
    ),
  },
  {
    title: PROVISIONAL("School and sixth form"),
    body: PROVISIONAL("UK boarding schools for GCSE, A Level and foundation courses."),
  },
  {
    title: PROVISIONAL("Sport and summer"),
    body: PROVISIONAL(
      "UK boarding schools with football academies, and UK summer camps with football and other sports in July and August.",
    ),
  },
  {
    title: PROVISIONAL("Online study"),
    body: PROVISIONAL("Online courses and flexible study options you can take from home in Nigeria."),
  },
]);

/**
 * What WSA does alongside the student, from Tim Hunt's master draft of 19
 * September 2026, where it sits under the heading "Free Service from WSA".
 *
 * Both the list and the heading are his, now that he has confirmed in
 * writing that the service is free.
 */
export const SUPPORT_STEPS: ReadonlyArray<string> = Object.freeze([
  PROVISIONAL("Course and university selection"),
  PROVISIONAL("Applications and offers"),
  PROVISIONAL("Payment guidance"),
  PROVISIONAL("Visa preparation"),
  PROVISIONAL("Interview and mock interview preparation"),
  PROVISIONAL("Pre-departure support"),
  PROVISIONAL("Support throughout your studies"),
]);

/** Tim Hunt's own heading, usable now that he has confirmed the charging rule. */
export const SUPPORT_HEADING = "Free service from WSA";

export interface Destination {
  name: string;
  body: string;
}

/**
 * The destinations, from Tim Hunt's master draft of 19 September 2026, in
 * education wording only.
 *
 * WHAT WAS TAKEN OUT, AND WHY. Tim's draft describes the United Kingdom as
 * "supported by WSA's strong network of UK universities and education
 * partners" and Europe as "WSA has strong links across Europe". Both are
 * claims about WSA's relationships with universities, which the
 * implementation brief rules out without evidence, so neither appears. His
 * "world-leading universities" for the United States is a ranking claim and
 * is out for the same reason. The countries, the programme types and the
 * named European markets are all his and all stay. See BRIEF_CONFLICTS.
 *
 * Canada carries no reference to skilled work, migration or settlement.
 * Tim's own 19 September wording had already dropped it.
 */
export const DESTINATIONS: ReadonlyArray<Destination> = Object.freeze([
  {
    name: PROVISIONAL("United Kingdom"),
    body: PROVISIONAL("WSA's main destination, and where most WSA students go."),
  },
  {
    name: PROVISIONAL("United States"),
    body: PROVISIONAL("A large choice of undergraduate and postgraduate programmes."),
  },
  {
    name: PROVISIONAL("Canada"),
    body: PROVISIONAL("A major international study destination, with a wide choice of universities, colleges and programmes."),
  },
  {
    name: PROVISIONAL("Germany"),
    body: PROVISIONAL("Worth considering for postgraduate study, with Master's programmes taught in English and many competitively priced options."),
  },
  {
    name: PROVISIONAL("Elsewhere in Europe"),
    body: PROVISIONAL("Including Cyprus, Hungary, France and the Netherlands. Each one is considered on its own merits."),
  },
]);

/**
 * Tim Hunt's own closing line, supplied verbatim in his master draft and
 * already approved as the equivalent line on the Nigeria postgraduate page.
 */
export const DESTINATIONS_LINE = PROVISIONAL(
  "Your WSA counsellor will help you compare countries, universities, courses and costs to find the options that best fit your ambitions and budget.",
);

/** Availability, stated once so no family reads as a standing guarantee. */
export const AVAILABILITY_NOTE = PROVISIONAL(
  "What is available depends on your qualifications, the intake and the school or university. Juliet will tell you what fits your situation.",
);

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

export interface Step {
  title: string;
  body: string;
}

/**
 * Three steps, and they state Tim Hunt's actual workflow rather than a
 * generic one. His instruction of 19 September 2026: Juliet contacts and
 * develops the lead, Glenice does NOT contact the student at that stage, and
 * Glenice takes over the course and visa application once the person becomes
 * a student, which is a Deal in Pipedrive. The page says so plainly, because
 * a student who is told Juliet will call should not be surprised by somebody
 * else, and Glenice should not be chasing the same person.
 */
export const STEPS: ReadonlyArray<Step> = Object.freeze([
  {
    title: "Speak to Juliet",
    body: "Message her on WhatsApp and tell her what you are thinking about. There is no form to fill in first.",
  },
  {
    title: "Juliet talks it through with you",
    body: "Juliet is the person you deal with in Nigeria. She follows up personally, helps you work out what to study and where, and stays with you while you decide.",
  },
  {
    title: "Glenice takes your application forward",
    body: "When you decide to go ahead, Juliet introduces you to Glenice Owino, your dedicated Student Counsellor, linked to WSA UK Head Office. Glenice handles your course choice, your applications and your visa preparation. Juliet stays part of the conversation throughout.",
  },
]);

/* ------------------------------------------------------------------ */
/* Juliet's introduction video                                         */
/* ------------------------------------------------------------------ */

/**
 * PROVISION FOR THE REPLACEMENT PODCAST. There is deliberately no video id
 * here.
 *
 * Tim Hunt, 19 September 2026: the recording the page carried, WSA 036, is
 * out of date, and he has re-recorded it specifically to match this page. It
 * is a few days away. He asked for provision to be left rather than the old
 * one used, so the page shows a short, honest line in the space the podcast
 * will occupy and makes no request to YouTube at all meanwhile.
 *
 * TO PUBLISH THE NEW ONE: set `youtubeId` to the new recording's id and give
 * it a duration. The section renders the player automatically once an id is
 * present, so nothing else has to change.
 */
export const JULIET_PODCAST = Object.freeze({
  /** Empty until Tim's replacement recording is ready. Never the old id. */
  youtubeId: "",
  title: "Meet Juliet",
  blurb: "Juliet introduces herself and how she works with students and families in Nigeria.",
  duration: "",
  /** Shown in the podcast's place while there is no recording to play. */
  awaitingLine:
    "Juliet is recording a short introduction for this page. It will appear here once it is ready.",
});

/** What the podcast slot is waiting on, so the reason survives in the source. */
export const PODCAST_PENDING =
  "Tim Hunt is replacing WSA 036 with a recording made to match this page, 19 September 2026. The old recording must not be used. Set JULIET_PODCAST.youtubeId when the new one arrives.";

/* ------------------------------------------------------------------ */
/* The fallback form                                                   */
/* ------------------------------------------------------------------ */

/**
 * The study options the form offers.
 *
 * ONLY CONTROLLED VALUES. Every value below exists in
 * shared/studentEnquiryOptions.ts and maps to a real Pipedrive option. The
 * labels are grouped the way the page talks about them, but no label is
 * attached to a value that means something else: mapping to the nearest
 * thing is how Australia used to be recorded as New Zealand.
 *
 * THE GAP, REPORTED NOT PAPERED OVER. Three of the routes this page names in
 * its copy have no controlled value of their own: online courses, boarding
 * schools with football academies, and summer and sports programmes. They are
 * named in STUDY_FAMILIES so a visitor can see Juliet covers them, and they
 * are deliberately absent from this list. A student whose interest is one of
 * those three picks "Something else", which is the signup form's own existing
 * catch-all and is not a claim that their interest is anything in particular.
 * See UNSUPPORTED_ENQUIRY_ROUTES.
 */
export const FORM_STUDY_OPTIONS: ReadonlyArray<{ value: DesiredLevelValue; label: string }> = Object.freeze([
  { value: "undergraduate", label: "Undergraduate degree" },
  { value: "top-up", label: "Top-up degree" },
  { value: "foundation", label: "International foundation programme" },
  { value: "postgraduate", label: "Taught Master's" },
  { value: "mphil", label: "MPhil" },
  { value: "mres", label: "MRes" },
  { value: "doctorate", label: "PhD" },
  { value: "boarding", label: "UK boarding school, GCSE or A Level" },
  { value: "other", label: "Something else" },
]);

/**
 * Routes this page names in its copy that the controlled enquiry vocabulary
 * cannot record. Reported to Tom Arrington rather than collapsed into a
 * nearby analytics category. Closing the gap means adding a Pipedrive option
 * and then a value in shared/studentEnquiryOptions.ts, in that order.
 */
export const UNSUPPORTED_ENQUIRY_ROUTES: ReadonlyArray<string> = Object.freeze([
  "Online courses",
  "Boarding schools with football academies",
  "Summer and sports programmes",
]);

/** The undecided destination, which the signup form already records as "multiple". */
export const HELP_ME_DECIDE = "multiple";

export { CAMPAIGN_DESTINATIONS };

export const FORM = Object.freeze({
  heading: PROVISIONAL("Would rather not message?"),
  supporting: PROVISIONAL("Leave your details and Juliet will come back to you. Five questions, and the rest only if you decide to go ahead."),
  submit: PROVISIONAL("Send to Juliet"),
});

/**
 * No response time is promised anywhere on this page. A promise of that kind
 * needs a service standard WSA is willing to be held to, and it sits on the
 * register of claims the Nigeria page removed for the same reason.
 */
export const NO_RESPONSE_TIME_PROMISE = true;

/* ------------------------------------------------------------------ */
/* Where Tim's master and the implementation brief disagree            */
/* ------------------------------------------------------------------ */

/**
 * Every point on which "Draft Landing Page Juliet 19 September 2026.docx"
 * and Tom Arrington's implementation brief of the same date say different
 * things, with what the page does about it.
 *
 * The implementation brief is the approval authority, so it wins each time.
 * None of these is a judgement about who is right: they are recorded here so
 * that Tom can settle them with Tim, and so nobody later reads the page as a
 * silent decision that one document beat the other.
 */
export interface BriefConflict {
  /** What Tim's 19 September master draft says. */
  master: string;
  /** What the page does, and under whose authority. */
  built: string;
}

export const BRIEF_CONFLICTS: ReadonlyArray<BriefConflict> = Object.freeze([
  {
    master: "Glenice Owino is described as \"Juliet's Personal Assistant\" at \"WSA Head Office, UK\".",
    built:
      "Settled by Tim Hunt on 19 September 2026. She is \"Juliet's dedicated Student Counsellor\", and the page says she is LINKED TO WSA UK Head Office rather than based there. He explained the basis himself: she works remotely but is part of that operation and has a +44 number. The Personal Assistant wording is not used, because it contradicts her controlled role and his own body copy. Her telephone, WhatsApp and email are off the page at his instruction, and are absent from the record rather than merely unrendered.",
  },
  {
    master: "Copies of the lead to Juliet, Tim, Glenice and Eldah, excluding Manet, Tom and Claudia.",
    built:
      "Settled by Tom Arrington on 19 September 2026 in favour of Tim's list, authorising his own exclusion. The two documents differed only over Tom. An enquiry from this page now notifies exactly those four in place of the general staff list, through the campaign recipients in server/_core/env.ts. The general list is unchanged for every other enquiry. Sarafina Kihumbu and the pipedrive mailbox are on that general list and so are not on this one, which follows from \"exactly these four\" rather than from any judgement made here.",
  },
  {
    master: "\"Free Service from WSA\" as a heading, and \"The service is free\" as a key message.",
    built:
      "Adopted. Tim Hunt confirmed the charging rule in writing on 19 September 2026, in the words \"The service is free.\" That was the condition the implementation brief set, so the earlier scoped hedge is gone and both his heading and his key message are used as written.",
  },
  {
    master: "Source Owner = Juliet Nnajiofor-Uyi, Lead Owner = Glenice Owino, set in the CRM.",
    built:
      "Neither is set. Pipedrive's recommended counsellor field offers Eldah, Glenice, Manet, Sarafina and help me choose; Juliet is not an option and there is no source owner field at all. Reported rather than mapped to something close.",
  },
  {
    master: "The form carries a family name field.",
    built:
      "Omitted. The implementation brief says to leave it out unless the controlled handoff needs it, and the signup form collects it on the next page.",
  },
  {
    master: "The destination list ends with \"Other\".",
    built:
      "\"Help me decide\", which records the same controlled value and invites an undecided visitor in. The implementation brief asks for this wording.",
  },
  {
    master: "The study list offers UK Summer School and UK Sports Camp as choices.",
    built:
      "Named in the page copy, absent from the dropdown. Neither has a controlled enquiry value or a Pipedrive option. See UNSUPPORTED_ENQUIRY_ROUTES.",
  },
  {
    master: "The United Kingdom is \"supported by WSA's strong network of UK universities and education partners\", Europe has \"strong links\", and the United States has \"world-leading universities\".",
    built:
      "The countries and programme types are kept and the relationship and ranking claims are not. The implementation brief rules out unsupported claims about university relationships and rankings.",
  },
  {
    master: "The form is to be built in Pipedrive as a prototype for other Spokes and LSGs, with an automatic reply from Juliet set up by Tim in Pipedrive.",
    built:
      "The page hands off to the existing controlled signup and creates no second path. The automatic reply is Tim's own Pipedrive configuration and is outside the website. If a dedicated Pipedrive form is genuinely wanted, what would change is set out for Tom before anything is built.",
  },
]);
