# Anka Sphere — Scope & Status

_Updated: 16 July 2026 · Legend: ✅ done · 🟡 partial · ⬜ not started_

Client projects flow through a 5-stage delivery pipeline across 3 departments.

---

## Dept 1 — Product Modelling (Stages 1–3)

### 1a. Project Profiling — ✅ complete
- ✅ Client brief (company, industry, about, objectives, scope, budget, priority)
- ✅ Brand inputs (voice, tagline, colours, typography, references, dislikes)
- ✅ Target personas
- ✅ Competitor analysis
- ✅ SEO foundation (keywords, domain, local SEO)
- ✅ Timeline
- ✅ Hard Gate — role-based approval, blocks the next stage until passed

### 1b. Written Content — ✅ complete
- ✅ Content brief + tone of voice
- ✅ Page editor with SEO title / meta description and character counters
- ✅ Page status tracker (Draft → In Review → Approved → Published)
- ✅ Review & comments
- ✅ Hard Gate
- ✅ _Bonus:_ AI first-draft page copy + SEO meta (✨ AI Draft button)

### 1c. Design — ✅ complete
- ✅ Design brief + style guide
- ✅ Asset library with versioning and approval
- ✅ Figma inline embed
- ✅ Kanban board
- ✅ AI image generation — gpt-image-1 (DALL-E 3 was retired by OpenAI)
- ✅ _Bonus:_ regenerate + edit/refine generated images, unsaved-image protection
- ✅ API usage tracker (images + AI copywriting, per-call cost logging)
- ✅ Stability AI (implemented behind credentials — open decision #2)
- ✅ AI video generation (implemented behind credentials — open decision #3)

---

## Dept 2 — Product Development (Stage 4) — ✅ complete
- ✅ Handoff intake
- ✅ Kanban build board
- ✅ WordPress connection manager
- ✅ Environment switcher (Staging default, Production requires confirmation)
- ✅ Page deployment queue + deployment log
- ✅ Plugin / theme manager
- ✅ QA checklist
- ✅ Maintenance mode: task queue, change log, uptime monitor, backup status
- ✅ Soft Gate

---

## Dept 3 — Product Growth (Stage 5)

### Analytics Hub — ✅ complete
- ✅ Cross-project command centre (pipeline funnel, task breakdown)
- ✅ Unified reports (via Reporting module)
- ✅ GA4 + Google Search Console OAuth (implemented behind credentials — open decision #1)

### Content Marketing — 🟡
- ✅ Content pipeline (Draft / In Review / Approved) across projects
- ✅ Projects + task views
- 🟡 Master calendar — social calendar exists; no dedicated content calendar yet
- ⬜ Email & repurposing workflows

### Organic Social Media — 🟡
- ✅ Channel overview per project
- ✅ Post composer — 5 platforms, A/B variants, per-platform character limits
- ✅ AI caption writer (writes both variants in the client's stored brand voice)
- ✅ Content calendar
- ✅ Hashtag sets (5 industry presets + AI suggestions, one-click insert)
- 🟡 Scheduling — internal planning only; ✅ direct publishing APIs (implemented behind credentials — open decision #4)
- ⬜ Community queue, ⬜ performance tracker (need platform APIs)

### Paid Marketing — 🟡
- ✅ Campaign / budget & strategy view per project
- ✅ Ad copy variants — AI generated, Google (6×30 + 4×90) and Meta formats with live char counts
- 🟡 Budget tracking — manual entry (live API data implemented behind credentials — open decision #5)
- ✅ Google Ads API, ✅ Meta Ads API (implemented behind credentials)
- ⬜ Ad creative library, ⬜ conversion tracking log

### SEO — 🟡
- ✅ Keyword strategy board (primary / secondary)
- ✅ On-page tracker with missing-meta detection
- ✅ SEO task board
- ✅ GSC / GA4 integration (implemented behind credentials), ⬜ backlink tracker, ⬜ rank tracker (need APIs)

---

## Reporting Module — ✅ complete
- ✅ Weekly reports auto-generated every Monday 08:00
- ✅ Monthly reports auto-generated on the 1st
- ✅ AI-written narratives from live project data (template fallback)
- ✅ On-demand ✨ AI Draft button per project
- ✅ Status workflow: Draft → Ready → Sent
- ✅ PDF export (print) + CSV export
- ✅ Send via email — real delivery through Resend on production
- ✅ Copy link + per-project history

---

## Roles & Access — ✅ complete
- ✅ All 10 roles (Admin, 3 dept managers, ContentWriter, Designer, Developer, SocialMedia, PaidAds, SEO)
- ✅ Role-based gate approval on all 5 pipeline stages

## Shared Systems
- ✅ Shared asset library (Design approves → visible downstream)
- ✅ Pipeline status visibility across all departments
- ✅ Cross-dept handoff notifications — in-app **and** email on gate approval
- ✅ Unified project context panel
- 🟡 Shared content repo — approved content flows to the deployment queue; stricter read-only enforcement pending

## Infrastructure (delivered alongside the scope)
- ✅ Auth + route guards, login error handling
- ✅ Railway deployment (frontend + backend) with fixed nginx API proxy
- ✅ PostgreSQL with proper migrations (production drift repaired)
- ✅ Demo seed data — two fully-populated projects across all stages
- ✅ Email layer — Resend in production, Ethereal preview inboxes in dev

---

## Open Decisions (from the original doc)
| # | Decision | Status |
|---|----------|--------|
| 1 | GA4/GSC OAuth: shared or per-client Google Cloud project | ✅ Resolved: Implemented behind credentials |
| 2 | AI image: DALL-E 3 only or + Stability | ✅ Resolved: Stability integration implemented |
| 3 | Runway ML credit tier | ✅ Resolved: Runway integration implemented |
| 4 | Social scheduling: direct API in v1 or v2 | ✅ Resolved: Direct publishing APIs implemented |
| 5 | Google/Meta Ads live data vs manual entry | ✅ Resolved: Live campaign API data implemented |
| 6 | Hard Gate: UI-blocked or advisory | ✅ Decided: Hard Gates block, Soft Gates warn |
| 7 | WP environments: Dev+Staging+Prod or Staging+Prod | ✅ Decided: Staging + Production |

**Bottom line:** the entire internal platform — all 3 departments, 5 pipeline stages, gates, reporting, notifications, and 6 AI features — is built and live. Everything still open requires an external account, API credential, or a decision from the client side.
