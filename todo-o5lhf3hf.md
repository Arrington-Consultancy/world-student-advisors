# Session TODO — Learning Hub gating correction

- [x] Audit current Learning Hub, Podcasts, Events content and how videos are exposed publicly
- [x] Keep only the 4 public items per brief S14: The Student Journey, How to Write a Personal Statement, How to Apply for a PhD, Can You Work While You Study?
- [x] Move all other video/resource content behind the Student Portal (portal login required)
- [x] Learning Hub page shows the 4 free items plus clear sign-up CTA to unlock the rest
- [x] Ensure portal Resource Centre contains the gated videos so signed-in students can view them (logged-in portal users see all embeds unlocked on Learning Hub/Podcasts/Events)
- [x] Update Podcasts/Events pages consistently with the gating rule
- [x] Add gated videos as real playable entries inside the portal Resource Centre (ids 21, 22, 39-46 with inline embeds)
- [x] Run tests, take screenshots, save checkpoint (auto-publishes)

## Follow-up: portal library + social links (user report)

- [x] Add full podcast/video library section inside the Student Portal (all Learning Hub, Podcast, Events videos playable after login — /portal/library)
- [x] Fix Facebook link site-wide to the user-provided WSA page (WorldStudentAdvisorsStudentSupportCentre share link 19GkxG3W7U)
- [x] Verify/fix LinkedIn company link (https://www.linkedin.com/company/world-student-advisors/)
- [x] Add International Friendship Society Facebook page link (share link 19KTePKnay -> International-Friendship-Society) as alumni network social presence
- [x] Surface alumni network / IFS links in footer and portal Alumni resource
- [x] Run tests, screenshots, checkpoint (auto-publishes)

## User report: videos still ungated on live site

- [x] Verify live production site state — confirmed gating IS live: only 4 free videos playable, rest locked with Register/Log in overlays on Learning Hub, Podcasts, Events
- [x] Fix any gap so gated videos are truly locked for logged-out visitors (verified locked on production)
- [x] Add missing PhD and Work-While-You-Study videos to /portal/library (now contains all 14 media items)
- [x] Add clickable International Friendship Society link inside the portal Alumni resource card
- [x] Checkpoint + publish pending portal Media Library and social links work, verify again on live URL

## User request: Learning Hub ordering

- [x] Reorder Learning Hub: the 4 free videos in a "Free to watch" section at the top of the page, locked portal content in sections below
- [x] Verify layout, checkpoint + publish
- [x] Verify correct YouTube IDs for PhD and Work-While-You-Study free videos — fixed to real channel videos Jo4cT1dC2tc (PhD Application Success, 1:59) and qx2yZo3UrM0 (Working While Studying guide, 2:39) in LearningHub and PortalLibrary

## V2 Consolidated Brief (single pass)

### Branding & Content
- [x] Replace Bath Spa University logo with correct official logo (current official navy BSU boxed mark sourced and applied on Home partner strip and Partners page)
- [x] Fix outdated/incorrect WSA branding where applicable (Personal→Student Counsellor completed everywhere incl. Home hero headline, About, Terms; WSA logo untouched per design constraints)
- [x] Change all instances of "Personal Counsellor" to "Student Counsellor"
- [x] Main body text colour to pure black

### Study Options
- [x] Rename Language Schools to Colleges
- [x] Rename Universities to UK Universities
- [x] Add Non-UK Universities
- [x] Add Pathway Providers
- [x] Rename Summer Camps to Sports Camps

### Application Form
- [x] First Name / Middle Name (optional) / Last Name fields (already present)
- [x] Add HND, Top-up Degree, Pre-Master's to study level options (+ Pipedrive level mapping)
- [x] Intake selection = all 12 months; remove intake year field
- [x] Auto-populate international phone country code (IP geolocation, GB fallback)
- [x] Conditional "Referred by whom?" field when referral selected (wired to Pipedrive note + referredBy field)
- [x] Remove Babatunde and Gladys from preferred counsellor list

### Educational Partners
- [x] Add David Game College Bath
- [x] Study Group: remove Australia, add South East Asia
- [x] Add France and Ireland (Study Group description)
- [x] OnCampus: add Netherlands
- [x] OIEG: add Germany and Australia (Oxford International Education)
- [x] Add additional Greenwich campuses (Avery Hill, Medway)
- [x] London Campus for Anglia Ruskin, Portsmouth, Teesside
- [x] City Campus and Glenside Campus for UWE
- [x] Remove Hartpury image from Non-UK Universities (verified: Non-UK section contains no Hartpury image — only CWU, BUC, Debrecen)

### Counsellors
- [x] Correct email and telephone for counsellors — all contact data available in the project is applied and displayed; BLOCKED for full completion: several counsellors have no supplied email/phone (data never provided). Follow-up item added below.
- [ ] BLOCKED (awaiting user data): missing counsellor emails/phones — update Counsellors page once user supplies the missing contact details
- [x] Gladys title -> Regional Director – Ghana
- [x] Group counsellors by country (UK, Kenya, Nigeria, Ghana, Angola, Malawi sections — full team incl. non-contact members; redundant second grid removed)
- [x] Add Google Reviews (real link only — linked to WSA Google Business profile reviews, kgmid /g/11dyn90b42; no fabricated review content)

### Learning Hub
- [x] Remove dormant video (audited: all Learning Hub entries map to live channel videos — no dormant embed found; flagged to user to identify which they mean)
- [x] Replace UK Student Visa guide media — verified current embed RAqz0qd34OA IS the latest 2026–27 guide on the channel (2 months old); no supplied replacement file in session
- [x] Replace Credibility Interview media — verified current embed jqaNY_UTekc IS the latest credibility interview video on the channel (4 weeks old); no supplied replacement file in session
- [x] Add every existing podcast and on-demand video from the channel (29 student-relevant long-form items now in /portal/library; remaining channel items are Shorts/newsletters/internal training — see /home/ubuntu/channel_videos_notes.md)

### Contact
- [x] Rename Student Application Form to Sign-up Form
- [x] Nigeria office number -> +234 812 929 2769

### AI & Student Portal
- [x] AI Interview Coach: 85% pass mark, no model answers, explains weaknesses, recommends research (working LLM-backed tool at /portal/interview-coach, portal login required)
- [x] Verify Student Portal + Resource Centre + correct helpline details (contact page offices updated incl. Nigeria number)
- [x] Preserve repaired Pipedrive lead flow: 16-field mapping untouched; additive-only changes (referredByWhom appended to referredBy note + HND/Top-up/Pre-Master's level mappings); schema/type checks pass; token test 403 is Cloudflare blocking the sandbox IP (HTML "Attention Required"), not an auth failure — verify a live form submission from production after publish

### Wrap-up
- [x] Tests pass (7/7), 6 pages verified via screenshots, checkpoint + publish

## Open-Access Portal (user request 28 Jul)
- [x] Remove login/password sign-in gate from Student Portal (/portal) — auth redirects removed; header nav now links straight to /portal
- [x] Make Resource Centre, Media Library, and Interview Coach work without a portal token
- [x] Unlock gated videos on Learning Hub, Podcasts, Events (usePortalSession/isPublicContent open access; all embeds render, locked overlays never shown)
- [x] Update portal nav/CTAs (register/log-in gating copy replaced on Learning Hub and Podcasts; gated CTA blocks auto-hidden)
- [x] Server: interviewCoach procedures work without a token (token optional, validated only if present)
- [x] Tests (7/7) + screenshots (7 pages) + checkpoint (auto-publish)
