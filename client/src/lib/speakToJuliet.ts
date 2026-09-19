/**
 * Speak to Juliet: the Nigeria landing page content, kept out of the
 * component so it can be tested without React, as the Nigeria postgraduate
 * page does.
 *
 * AUTHORITY. Tim Hunt's Juliet landing page brief of 18 September 2026, the
 * WSA pre-build review of 19 September 2026, and Tom Arrington's
 * implementation brief of 19 September 2026.
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
      "Undergraduate degrees, top-up degrees, international foundation programmes, taught Master's, MPhil, MRes and PhD.",
    ),
  },
  {
    title: PROVISIONAL("School and sixth form"),
    body: PROVISIONAL("UK boarding schools for GCSE, A Level and foundation routes."),
  },
  {
    title: PROVISIONAL("Sport and summer"),
    body: PROVISIONAL("Boarding schools with football academies, and summer and sports programmes."),
  },
  {
    title: PROVISIONAL("Online study"),
    body: PROVISIONAL("Courses you can study from home in Nigeria."),
  },
]);

/**
 * Destinations, in education wording only. No country is described in terms
 * of work, migration, settlement or professional opportunity, and no claim is
 * made about universities, rankings, visa prospects or outcomes.
 */
export const DESTINATIONS_LINE = PROVISIONAL(
  "The United Kingdom, the United States, Canada, Germany and elsewhere in Europe. Juliet will help you compare countries, universities, courses and costs.",
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
