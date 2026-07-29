# WSA Technical Integration Plan (Approved Direction)

**Status:** Approved direction. No implementation until all pre-requisites are confirmed.  
**Last Updated:** 9 July 2026  
**Source of Truth:** This document governs all CRM, SEO, and analytics implementation.

---

## Pre-Implementation Requirements

The following must be confirmed before any implementation begins:

- [ ] 1. Real Pipedrive access details (API token + company domain)
- [ ] 2. Confirmation of actual pipeline names and stages
- [ ] 3. Confirmation of required custom fields in Pipedrive
- [ ] 4. A dedicated test pipeline created in Pipedrive
- [ ] 5. Consent/cookie approach agreed (banner design, consent categories)
- [ ] 6. SEO redirect map from current Squarespace site (full URL list)
- [ ] 7. Final approval before any API connection, tracking, publishing, or DNS change

**Until all 7 items are confirmed, the following actions are prohibited:**
- Upgrading to full-stack
- Connecting to Pipedrive API
- Creating Pipedrive fields or pipelines
- Installing analytics scripts
- Publishing the site
- Switching DNS from Squarespace
- Storing real student data

---

## Integration Method

**Approved:** Direct Pipedrive API via backend server (requires full-stack upgrade when approved).

---

## Form Fields (Apply Now)

| # | Field | Type | Required |
|---|-------|------|----------|
| 1 | First Name | Text | Yes |
| 2 | Last Name | Text | Yes |
| 3 | Email Address | Email | Yes |
| 4 | Phone / WhatsApp | Tel | Yes |
| 5 | Country of Residence | Dropdown | Yes |
| 6 | I am a... (Student / Parent / Other) | Select | Yes |
| 7 | What are you interested in? | Select | Yes |
| 8 | Preferred study destination | Select | No |
| 9 | Preferred start date | Select | No |
| 10 | How did you hear about WSA? | Select | No |
| 11 | Tell us about your goals | Textarea | No |

---

## Pipeline Stages

| # | Stage | Owner |
|---|-------|-------|
| 1 | New Enquiry | System (unassigned) |
| 2 | Awaiting Assignment | Office manager |
| 3 | Assigned to Counsellor | Named counsellor |
| 4 | First Contact Made | Named counsellor |
| 5 | Options Presented | Named counsellor |
| 6 | Application In Progress | Named counsellor |
| 7 | Offer Received | Named counsellor |
| 8 | Enrolled | Named counsellor |
| 9 | Lost / Not Proceeding | Named counsellor |

---

## Lead Source Attribution

Google Organic | Google Ads | YouTube | Instagram | Facebook | LinkedIn | WhatsApp | Friend or Family | School | University | Event | QR Code | Direct | Other

---

## Lead Routing

Configurable rules engine (JSON-based). Routing factors:
- Country of residence
- Study interest
- Destination of interest
- Office
- Counsellor availability
- Priority level
- Manual override (always takes precedence)

---

## SEO Architecture

- Unique page titles and meta descriptions per page
- Open Graph and Twitter/X card tags per page
- Canonical URLs on all pages
- XML sitemap (auto-generated)
- robots.txt
- Organisation schema (JSON-LD)
- Breadcrumb schema (all pages)
- Video schema (Learning Hub, any embedded YouTube)
- Article schema (when articles are added)
- FAQ schema (where relevant)
- Image alt text on all images
- Redirect map from Squarespace (required before DNS switch)

---

## Analytics & Tracking

All managed via Google Tag Manager:
- Google Analytics 4
- Google Search Console
- Google Ads conversion tracking
- Meta Pixel
- LinkedIn Insight Tag
- Form events (submit, start, abandon)
- CTA click tracking
- YouTube/video engagement (play, 25/50/75/100%)
- Scroll depth (25/50/75/90%)
- UTM parameter capture (passed to Pipedrive)
- Cookie consent gating for non-essential tracking

---

## Spam Protection

1. Honeypot field (hidden)
2. Time-based check (reject < 3 seconds)
3. Rate limiting (3 per IP per hour)
4. Email validation (format + disposable domain check)
5. Phone validation (basic format)
6. Optional: reCAPTCHA v3 (only if needed)

---

## Post-Submission Flow

1. Client-side validation
2. Server-side validation + spam checks
3. UTM capture from session
4. Create/update Person in Pipedrive
5. Create Deal in "New Enquiry" stage
6. Apply routing rules → move to "Awaiting Assignment"
7. Send confirmation email to applicant
8. Send notification to relevant office
9. Fire analytics events
10. Log for reporting

---

*Full detailed plan: see `/home/ubuntu/WSA_Pipedrive_Technical_Plan.md`*
