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
  whatsapp: string;
  /** The digits wa.me needs: international, no plus and no punctuation. */
  whatsappDigits: string;
  email: string;
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
 * Glenice's details are taken from the controlled team record, not from the
 * brief, because that record already carries them and they are already
 * published on the site.
 *
 * NO LOCATION LINE. Her own approved biography describes her as based in
 * Kenya, so the "WSA Head Office, UK" wording of the draft is wrong. Rather
 * than correct it to Kenya on a page about Nigeria, the line is left out:
 * what matters to the reader is that she is the counsellor who takes the
 * application forward.
 */
export const GLENICE: PersonCard = Object.freeze({
  name: "Glenice Owino",
  role: "Senior Student Counsellor",
  whatsapp: "+44 7459 720 726",
  whatsappDigits: "447459720726",
  email: "glenice@worldstudentadvisors.com",
  photo: "/team/glenice-owino.jpg",
  photoAlt: "Glenice Owino, Senior Student Counsellor at World Student Advisors",
});

/**
 * Glenice's own words, lifted verbatim from her approved biography in
 * client/src/lib/team.ts. Quoted rather than paraphrased so the page needs no
 * fresh sign off from her.
 */
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
  eyebrow: PROVISIONAL("For the people of Nigeria"),
  headline: PROVISIONAL("Thinking about studying abroad? Speak to Juliet."),
  /**
   * PROVISIONAL, cost wording. Tom Arrington is checking the final rule with
   * Tim Hunt: the expected position is that WSA services are free to WSA
   * applicants, with charging only for visa help to people who are not WSA
   * applicants. Until that is confirmed this line makes no cost claim at all
   * beyond the one WSA already publishes elsewhere, which is scoped to
   * students working with WSA. Replace this single string when Tim confirms.
   */
  supporting: PROVISIONAL(
    "Juliet is a WSA Higher Education Advisor in Lagos. Tell her what you are considering and she will talk you through the options, at no cost to students working with WSA.",
  ),
  primaryCta: PROVISIONAL("Message Juliet on WhatsApp"),
  secondaryCta: PROVISIONAL("Would rather not message? Send your details instead."),
});

/**
 * What the cost line is waiting on, reported to Tom rather than guessed.
 * Nothing in this file states that every WSA service is free to everybody.
 */
export const COST_WORDING_PENDING =
  "Final charging wording is not confirmed. HERO.supporting scopes the no cost statement to students working with WSA, which matches the wording already published on the Nigeria postgraduate page. Tim Hunt to confirm whether WSA services are free to all WSA applicants with charging only for visa help to people who are not WSA applicants.";

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
 * The list is his. The heading is not: the cost wording is unconfirmed (see
 * COST_WORDING_PENDING), so the page states what WSA does and leaves what it
 * costs to the one scoped sentence in the hero.
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

export const SUPPORT_HEADING = PROVISIONAL("What WSA helps you with");

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
 * Three steps. This is where the Juliet to Glenice routing is stated, as
 * something the student gets rather than as an internal process, and it is
 * the only place the wider organisation appears on the page.
 */
export const STEPS: ReadonlyArray<Step> = Object.freeze([
  {
    title: PROVISIONAL("Speak to Juliet"),
    body: PROVISIONAL("Message her on WhatsApp and tell her what you are thinking about. There is no form to fill in first."),
  },
  {
    title: PROVISIONAL("Talk it through"),
    body: PROVISIONAL("Juliet helps you work out what to study, where, and what it is likely to involve."),
  },
  {
    title: PROVISIONAL("Your counsellor takes it forward"),
    body: PROVISIONAL(
      "When you are ready to apply, Glenice Owino, a WSA Senior Student Counsellor, handles your applications, your offers and your visa preparation. Juliet stays part of the conversation.",
    ),
  },
]);

/* ------------------------------------------------------------------ */
/* Juliet's introduction video                                         */
/* ------------------------------------------------------------------ */

/**
 * WSA 036 in the Student Support Library, "Juliet Nnajiofor-Uyi, Lagos,
 * Nigeria". Tim is revising this podcast to match the landing page, so the id
 * and the label are one constant each: a new recording is a two line change.
 *
 * Never autoplayed. The page shows a poster and a play control, and the
 * YouTube iframe is only created once a visitor asks for it, so nobody on a
 * metered connection pays for a video they did not start.
 */
export const JULIET_VIDEO = Object.freeze({
  youtubeId: "SZjjr2T3qTU",
  title: PROVISIONAL("Meet Juliet"),
  blurb: PROVISIONAL("Juliet introduces herself and how she works with students and families in Nigeria."),
  duration: "2:17",
});

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
      "Senior Student Counsellor, with no location line. Her controlled team record and her own approved biography both give that role, the biography places her in Kenya rather than the UK, and the implementation brief rules out the head office wording. Tim's own body copy two lines later calls her \"your dedicated Student Counsellor\", so his draft disagrees with itself here.",
  },
  {
    master: "Copies of the lead to Juliet, Tim, Glenice and Eldah, excluding Manet, Tom and Claudia.",
    built:
      "Nothing changed. The implementation brief names the same list but keeps Tom in it and says not to remove him. The two documents differ only over Tom. In any case the notification list is site-wide, not per page, so neither version can be applied to this page alone without a mechanism that does not exist.",
  },
  {
    master: "\"Free Service from WSA\" as a heading, and \"The service is free\" as a key message.",
    built:
      "One scoped sentence in the hero, at no cost to students working with WSA. The implementation brief forbids an absolute free claim until Tim confirms the charging rule. See COST_WORDING_PENDING.",
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
