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
 *   3. Tim Hunt's edits of 24 September 2026, "Tom_Juliet_LP_edits_24_
 *      September_2026.docx", forwarded by Tom Arrington: a larger flag, a
 *      caption under Juliet's photograph, Glenice moved above How this
 *      works with a larger photograph, and his Pipedrive form embedded in
 *      place of the website form. The podcast he supplied that day he
 *      withdrew the same morning; its replacement arrived from Tom on 25
 *      September. See JULIET_PODCAST.
 *   4. The controlled repository, where it is newer or more specific.
 * All three documents live in 16_WEBSITE_Ai/05 Landing Pages/Juliet. Where
 * Tim's master and the implementation brief disagreed, the implementation
 * brief was followed and the difference is recorded in BRIEF_CONFLICTS
 * below, with how each one was later settled.
 *
 * THE COPY IS NO LONGER PROVISIONAL. Tim revised the page on 24 September
 * 2026 and supplied the form he had said was coming. What remains here is
 * his wording or Tom's, and any further change is a content edit to this
 * file, never a rebuild of the page. The podcast slot was filled on 25
 * September 2026 with the third recording.
 *
 * WHAT THIS PAGE DOES NOT DO. It creates no lead through this codebase. The
 * enquiry form on the page is Tim Hunt's own Pipedrive web form, embedded by
 * the loader Pipedrive supplies, so a submission goes from the visitor's
 * browser to Pipedrive and never touches this server. The page writes
 * nothing to Pipedrive itself, widens no scope, and creates no second
 * student record. The same form will sit behind the QR code in Juliet's
 * podcast, so there is one form and one CRM workflow for both.
 */
import type { CampaignSlug } from "@shared/campaignEnquiry";

/**
 * How a website enquiry from this page WAS identified while the page
 * carried its own form, 19 to 24 September 2026. The signup procedure still
 * accepts the value and still routes such an enquiry to this campaign's own
 * recipient list, so any /contact?campaign=speak-to-juliet link already in
 * circulation keeps working. The page itself no longer sends anyone there:
 * its form is Pipedrive's. Retiring the server route is a separate decision
 * for Tom Arrington once the Pipedrive form has been seen to work live.
 */
export const CAMPAIGN_SLUG: CampaignSlug = "speak-to-juliet";

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
   * Tim Hunt, 19 September 2026, repeated on 24 September: Glenice's
   * telephone, WhatsApp and email must not appear on this page, because
   * Juliet contacts the lead and Glenice does not, until the student becomes
   * a Deal. Leaving the values out of the data is stronger than leaving them
   * in and choosing not to render them: there is nothing for a later edit to
   * expose by accident.
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
 * The organisation line in the caption under Juliet's photograph. Tim Hunt's
 * edit of 24 September 2026 gives the caption as four lines, name, role,
 * WorldStudentAdvisors, Lagos, Nigeria, and this is his spelling of the
 * brand, as it is in his hero line.
 */
export const JULIET_ORGANISATION = "WorldStudentAdvisors";

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
 * off this page, and said so again on 24 September: "all contact through
 * Juliet". They are absent from the record below rather than merely
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
export const WHATSAPP_FIRST_MESSAGE =
  "Hello Juliet, I saw the WSA page and I would like to ask about studying abroad.";

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
  secondaryCta: "Would rather not message? Send your details instead.",
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
 * September 2026: "The service is free."
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
    title: "Degrees abroad",
    body: "PhD and Master's degrees, undergraduate degrees, top-up degrees and International Foundation Programmes.",
  },
  {
    title: "School and sixth form",
    body: "UK boarding schools for GCSE, A Level and foundation courses.",
  },
  {
    title: "Sport and summer",
    body: "UK boarding schools with football academies, and UK summer camps with football and other sports in July and August.",
  },
  {
    title: "Online study",
    body: "Online courses and flexible study options you can take from home in Nigeria.",
  },
]);

/**
 * What WSA does alongside the student, from Tim Hunt's master draft of 19
 * September 2026, where it sits under the heading "Free Service from WSA".
 */
export const SUPPORT_STEPS: ReadonlyArray<string> = Object.freeze([
  "Course and university selection",
  "Applications and offers",
  "Payment guidance",
  "Visa preparation",
  "Interview and mock interview preparation",
  "Pre-departure support",
  "Support throughout your studies",
]);

/** Tim Hunt's own heading. */
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
    name: "United Kingdom",
    body: "WSA's main destination, and where most WSA students go.",
  },
  {
    name: "United States",
    body: "A large choice of undergraduate and postgraduate programmes.",
  },
  {
    name: "Canada",
    body: "A major international study destination, with a wide choice of universities, colleges and programmes.",
  },
  {
    name: "Germany",
    body: "Worth considering for postgraduate study, with Master's programmes taught in English and many competitively priced options.",
  },
  {
    name: "Elsewhere in Europe",
    body: "Including Cyprus, Hungary, France and the Netherlands. Each one is considered on its own merits.",
  },
]);

/**
 * Tim Hunt's own closing line, supplied verbatim in his master draft and
 * already approved as the equivalent line on the Nigeria postgraduate page.
 */
export const DESTINATIONS_LINE =
  "Your WSA counsellor will help you compare countries, universities, courses and costs to find the options that best fit your ambitions and budget.";

/** Availability, stated once so no family reads as a standing guarantee. */
export const AVAILABILITY_NOTE =
  "What is available depends on your qualifications, the intake and the school or university. Juliet will tell you what fits your situation.";

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
/* Juliet's podcast                                                    */
/* ------------------------------------------------------------------ */

/**
 * JULIET'S PODCAST, third recording. Tom Arrington supplied the link
 * https://youtu.be/p4OX6muHnZM on 25 September 2026 as the replacement Tim
 * Hunt had promised.
 *
 * Two earlier recordings were withdrawn by Tim and neither may be used. WSA
 * 036 (SZjjr2T3qTU) he withdrew on 19 September 2026 as out of date. Its
 * replacement, https://youtu.be/fR4j72Jbk5Y, which he supplied on 24
 * September, he withdrew the same morning by WhatsApp to Tom Arrington:
 * "DO NOT USE JULIET'S PODCAST, a new one required as tel number errors, the
 * new link will be different." Both ids stay in WITHDRAWN_PODCAST_IDS and
 * the guard test checks the live id against that list.
 *
 * The page renders Juliet's photograph as the poster and creates the
 * YouTube frame only when a visitor presses play, so nothing autoplays and
 * no third-party request is made before then. The weekly library link check
 * (scripts/check-library-links.mjs) also watches this id, so a deleted or
 * private recording is reported rather than shown as "Video unavailable".
 *
 * TO REPLACE IT AGAIN: move the current id into WITHDRAWN_PODCAST_IDS and
 * set `youtubeId` to the new one. Setting it to "" holds the slot open with
 * `awaitingLine` and makes no request to YouTube.
 */
export const JULIET_PODCAST = Object.freeze({
  /** Supplied by Tom Arrington on 25 September 2026. Never a withdrawn id. */
  youtubeId: "p4OX6muHnZM",
  title: "Meet Juliet",
  blurb: "Juliet introduces herself and how she works with students and families in Nigeria.",
  duration: "",
  /** Shown in the podcast's place only if `youtubeId` is ever emptied again. */
  awaitingLine:
    "Juliet is recording a short introduction for this page. It will appear here once it is ready.",
});

/**
 * Recordings Tim Hunt has withdrawn. Kept as data rather than only as a
 * comment so the guard test can check the live id against the list, and so
 * a later edit cannot reinstate one by mistake.
 */
export const WITHDRAWN_PODCAST_IDS: ReadonlyArray<string> = Object.freeze([
  "SZjjr2T3qTU",
  "fR4j72Jbk5Y",
]);

/* ------------------------------------------------------------------ */
/* The enquiry form: Tim Hunt's Pipedrive web form                     */
/* ------------------------------------------------------------------ */

/**
 * The form is Pipedrive's, built and tested by Tim Hunt, and supplied as
 * embed code on 23 September 2026 with the instruction "do not recreate the
 * form" and "please don't change the form itself". Both values below are
 * exactly as he sent them. The loader script finds every element carrying
 * the data attribute and replaces it with the form in an iframe; nothing on
 * this site sees the submission.
 *
 * WHAT THE FORM DOES IN PIPEDRIVE, from the read-only inventory of 22
 * September and Tim's own note of 24 September: it creates a Lead owned by
 * Glenice Owino, titled with Juliet's name and carrying the note that Juliet
 * qualifies the student before Glenice makes contact, and Pipedrive's own
 * automation distributes it to Tim, Eldah, Juliet and Glenice. It has
 * reCAPTCHA. It asks first name, family name, email, telephone or WhatsApp,
 * what the person wants to study and their preferred destination.
 */
export const PIPEDRIVE_FORM = Object.freeze({
  embedUrl: "https://webforms.pipedrive.com/f/6q9NP6Qklnnpo5qbQ9NZiyPUfxG86g8tN4BJztkTp80lcM8G8dExsiKe6jTWJCzYwr",
  loaderSrc: "https://webforms.pipedrive.com/f/loader",
  heading: "Would rather not message?",
  supporting: "Leave your details and Juliet will come back to you.",
  /** Shown only if the loader has not replaced the placeholder, and for visitors without scripts. */
  fallbackLine: "If the form does not appear here, open it in a new tab.",
  fallbackCta: "Open the form",
});

/**
 * No response time is promised anywhere on this page. A promise of that kind
 * needs a service standard WSA is willing to be held to, and it sits on the
 * register of claims the Nigeria page removed for the same reason.
 */
export const NO_RESPONSE_TIME_PROMISE = true;

/* ------------------------------------------------------------------ */
/* Where Tim's master and the implementation brief disagreed           */
/* ------------------------------------------------------------------ */

/**
 * Every point on which "Draft Landing Page Juliet 19 September 2026.docx"
 * and Tom Arrington's implementation brief of the same date said different
 * things, with what the page did about it and how the point was settled.
 *
 * The implementation brief is the approval authority, so it won each time
 * until Tim and Tom settled the point between them. None of these is a
 * judgement about who was right: they are recorded so nobody later reads the
 * page as a silent decision that one document beat the other.
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
      "Settled by Tim Hunt on 19 September 2026. She is \"Juliet's dedicated Student Counsellor\", and the page says she is LINKED TO WSA UK Head Office rather than based there. He explained the basis himself: she works remotely but is part of that operation and has a +44 number. The Personal Assistant wording is not used on the page, because it contradicts her controlled role and his own body copy. It does appear in the artwork of his podcast thumbnail, which is his asset and is reported to Tom rather than altered. Her telephone, WhatsApp and email are off the page at his instruction, and are absent from the record rather than merely unrendered.",
  },
  {
    master: "Copies of the lead to Juliet, Tim, Glenice and Eldah, excluding Manet, Tom and Claudia.",
    built:
      "Settled twice. Tom Arrington ruled on 19 September 2026 in favour of Tim's list, authorising his own exclusion, and the website route was built to notify exactly those four. From 24 September the page's form is Tim's Pipedrive form, so the notification is Pipedrive's own automation, which Tim confirms distributes to Tim, Eldah, Juliet and Glenice: the same four. The website route in server/_core/env.ts still exists for any circulated /contact?campaign= link and is unchanged. The general staff list is unchanged for every other enquiry.",
  },
  {
    master: "\"Free Service from WSA\" as a heading, and \"The service is free\" as a key message.",
    built:
      "Adopted. Tim Hunt confirmed the charging rule in writing on 19 September 2026, in the words \"The service is free.\" That was the condition the implementation brief set, so the earlier scoped hedge is gone and both his heading and his key message are used as written.",
  },
  {
    master: "Source Owner = Juliet Nnajiofor-Uyi, Lead Owner = Glenice Owino, set in the CRM.",
    built:
      "Settled by Tim Hunt's form. Pipedrive has no source owner field and Juliet is not a Pipedrive user, so the website could not set either. His Pipedrive form sets Glenice as Lead Owner and records Juliet as the source by convention: the lead title carries her name and a note states that she qualifies the student first. That is his configuration inside Pipedrive, outside this codebase.",
  },
  {
    master: "The form carries a family name field.",
    built:
      "Settled by Tim Hunt's form, which asks for family name. The website form omitted it on the implementation brief's instruction; that form is gone from the page as of 24 September 2026.",
  },
  {
    master: "The destination list ends with \"Other\".",
    built:
      "Moot since 24 September 2026. The dropdown is now inside Tim Hunt's Pipedrive form and its options are his own. The website form had offered \"Help me decide\" against the controlled value the signup records; that form is gone from the page.",
  },
  {
    master: "The study list offers UK Summer School and UK Sports Camp as choices.",
    built:
      "Named in the page copy under Sport and summer. Whether they are offered as dropdown choices is now a property of Tim Hunt's Pipedrive form, which is his to configure; the inventory of 22 September 2026 recorded his study options as his own wording rather than the controlled enquiry vocabulary, and that difference is reported to Tom rather than mapped.",
  },
  {
    master: "The United Kingdom is \"supported by WSA's strong network of UK universities and education partners\", Europe has \"strong links\", and the United States has \"world-leading universities\".",
    built:
      "The countries and programme types are kept and the relationship and ranking claims are not. The implementation brief rules out unsupported claims about university relationships and rankings.",
  },
  {
    master: "The form is to be built in Pipedrive as a prototype for other Spokes and LSGs, with an automatic reply from Juliet set up by Tim in Pipedrive.",
    built:
      "Adopted on 24 September 2026, on Tom Arrington's authority, once Tim Hunt had supplied the finished form. His Pipedrive form is embedded exactly as he sent it and the website's own form is removed, so there is one form and one CRM workflow, shared with the QR code in his podcast. The automatic reply is his Pipedrive configuration and is outside the website. What the swap gives up on the website side is recorded in the change record: Google Ads click capture and conversion reporting, the Student Portal account and the acknowledgement email, none of which a Pipedrive-hosted form can trigger unless he sets a post-submit redirect to a WSA page.",
  },
]);
