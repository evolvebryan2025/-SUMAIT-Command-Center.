-- ═══════════════════════════════════════════════════════════
-- SUMAIT Command Center — Client & Knowledge Base Seed
-- Run AFTER migration 005_subclient_support.sql
-- ═══════════════════════════════════════════════════════════
-- This script is IDEMPOTENT: uses ON CONFLICT DO UPDATE
-- so it can be re-run safely to refresh data.
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- TIER 1: DIRECT CLIENTS
-- ═══════════════════════════════════════════════════════════

-- 1. Prince Acquah Andam
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, notes)
VALUES (
  '11111111-1111-1111-1111-111111111001',
  'Prince Acquah Andam',
  'SUMAIT AI AGENTS / meda.ai',
  NULL,
  'active',
  85,
  'active',
  0,
  'Primary client & co-founder. UK-based. Companies: SUMAIT AI AGENTS + meda.ai (rebranding from mayda.ai). Two service pillars: Business Automations + Lead Infrastructure.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, updated_at = now();

-- 2. Kyle Painter
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, notes)
VALUES (
  '11111111-1111-1111-1111-111111111002',
  'Kyle Painter',
  'Disruptors Media',
  NULL,
  'active',
  90,
  'active',
  1250,
  'Runs Disruptors Media — AI systems + marketing agency. Retainer: $1,250/cycle. Partner: Tyler Gordon (CSM). Bryan handles technical builds for Kyle clients.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, monthly_value = EXCLUDED.monthly_value, updated_at = now();

-- 3. Juan Martinez
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, notes)
VALUES (
  '11111111-1111-1111-1111-111111111003',
  'Juan Martinez',
  'AI Tech Solutions / ClaudeXAG',
  'bryansumaitofficial@gmail.com',
  'active',
  75,
  'active',
  0,
  'Runs AI lead generation and cold outreach service. Platform: AI Acquisitions — SDR tool for cold email + outbound. Has 4 clients waiting on onboarding system.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, updated_at = now();

-- 4. Joshua Kokoumi
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, notes)
VALUES (
  '11111111-1111-1111-1111-111111111004',
  'Joshua Kokoumi',
  'Kokoume Consulting',
  'bryansumait.automate@gmail.com',
  'active',
  60,
  'active',
  0,
  'Runs Kokoume Consulting. Uses GCL, Stripe, Telegram, PandaDoc. Has setter + closer sales structure. 7 workflows built, 100% test success. BLOCKED on Joshua providing sheet configs and Telegram IDs.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, updated_at = now();

-- 5. Thomas Rummel
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, notes)
VALUES (
  '11111111-1111-1111-1111-111111111005',
  'Thomas Rummel',
  'Presto Cleaning',
  NULL,
  'active',
  70,
  'onboarding',
  1250,
  'Residential cleaning company in San Diego. Growth Engine Package: $1,250/month. Includes Voice AI Agent + Cold Email Outreach. 50% upfront + 50% at Day 30. Assigned: Jamil (primary) + John.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, monthly_value = EXCLUDED.monthly_value, updated_at = now();

-- 6. Blake (SpaScale AI)
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, notes)
VALUES (
  '11111111-1111-1111-1111-111111111006',
  'Blake',
  'SpaScale AI',
  NULL,
  'active',
  50,
  'prospect',
  0,
  'AI services company with 3 products: AI Search Optimization, Reputation Engineering, Growth Scaling Solutions. Website design scoped but NOT started. Colors: gold, teal blue, grey.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, updated_at = now();

-- 7. Kevin Brenner
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, notes)
VALUES (
  '11111111-1111-1111-1111-111111111007',
  'Kevin Brenner',
  NULL,
  NULL,
  'active',
  40,
  'prospect',
  0,
  'No project defined yet. Folders exist but have no content. May be connected to Kristen (pontoon rental project under Juan).'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, updated_at = now();

-- ═══════════════════════════════════════════════════════════
-- TIER 2: SUB-CLIENTS OF PRINCE ANDAM
-- ═══════════════════════════════════════════════════════════

-- 8. Sebastian Ionescu (sub-client of Prince)
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, parent_client_id, notes)
VALUES (
  '11111111-1111-1111-1111-111111111008',
  'Sebastian Ionescu',
  'Sebastian Mental Coach FZ-LLC',
  'contact@sebastian-mentalcoach.com',
  'active',
  80,
  'onboarding',
  400,
  '11111111-1111-1111-1111-111111111001',
  'Sub-client of Prince Andam. Former pro basketball player → mental coach for athletes (13 disciplines). Based in Dubai/Romania. EUR 1,200/quarter. 10-day sprint starting March 16. Website: sebastian-mentalcoach.com'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, email = EXCLUDED.email, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, parent_client_id = EXCLUDED.parent_client_id, monthly_value = EXCLUDED.monthly_value, updated_at = now();

-- 9. CandyPay (sub-client of Prince)
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, parent_client_id, notes)
VALUES (
  '11111111-1111-1111-1111-111111111009',
  'CandyPay (Daniel & James Candy)',
  'CandyPay / candy-pay.io',
  'Daniel@candy-pay.io',
  'active',
  65,
  'onboarding',
  0,
  '11111111-1111-1111-1111-111111111001',
  'Sub-client of Prince Andam. Fintech: payments, crypto, banking. Dubai-based. Daniel & James are brothers. Chatbot "Alex" built. BLOCKED on website access for live chat deployment.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, email = EXCLUDED.email, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, parent_client_id = EXCLUDED.parent_client_id, updated_at = now();

-- 10. Elom Ahlijah (sub-client of Prince)
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, parent_client_id, notes)
VALUES (
  '11111111-1111-1111-1111-111111111010',
  'Elom Ahlijah',
  'Online Fitness Coaching',
  NULL,
  'active',
  55,
  'onboarding',
  0,
  '11111111-1111-1111-1111-111111111001',
  'Sub-client of Prince Andam. Personal trainer building online coaching brand. VAPI voice sales bot (clone voice), Instagram ManyChat automation, PropFlow CRM for Jason. Pending: voice recording from Elom.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, parent_client_id = EXCLUDED.parent_client_id, updated_at = now();

-- ═══════════════════════════════════════════════════════════
-- TIER 3: SUB-CLIENTS OF KYLE PAINTER
-- ═══════════════════════════════════════════════════════════

-- 11. Art of Drawers / Colin Bagley (sub-client of Kyle)
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, parent_client_id, notes)
VALUES (
  '11111111-1111-1111-1111-111111111011',
  'Colin Bagley',
  'Art of Drawers',
  'cbagley@artofdrawers.com',
  'active',
  80,
  'onboarding',
  0,
  '11111111-1111-1111-1111-111111111002',
  'Sub-client of Kyle Painter. Custom cabinet/drawer organization in Salt Lake City, UT. Target: 55+ homeowners. 5-day build (Mar 18-22). n8n: artofdrawerssaltlake.app.n8n.cloud'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, email = EXCLUDED.email, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, parent_client_id = EXCLUDED.parent_client_id, updated_at = now();

-- 12. Softwash Pros (sub-client of Kyle)
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, parent_client_id, notes)
VALUES (
  '11111111-1111-1111-1111-111111111012',
  'Softwash Pros',
  'C&M Services',
  NULL,
  'active',
  70,
  'active',
  0,
  '11111111-1111-1111-1111-111111111002',
  'Sub-client of Kyle Painter. Exterior cleaning / softwash services. AI Receptionist "Katie" (Retell voice). Customer Factor CRM integration. Near complete — waiting client approval.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, parent_client_id = EXCLUDED.parent_client_id, updated_at = now();

-- 13. Wise Abatement (sub-client of Kyle)
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, parent_client_id, notes)
VALUES (
  '11111111-1111-1111-1111-111111111013',
  'Wise Abatement',
  'Wise Abatement',
  'info@wiseabatement.ca',
  'active',
  85,
  'active',
  0,
  '11111111-1111-1111-1111-111111111002',
  'Sub-client of Kyle Painter. Hazardous material removal in Calgary, AB. 5.0 stars, 102+ reviews. Tyler responsible for showing deliverables. Being treated as case study — new automation weekly.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, email = EXCLUDED.email, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, parent_client_id = EXCLUDED.parent_client_id, updated_at = now();

-- 14. Cenegenics (sub-client of Kyle)
INSERT INTO public.clients (id, name, company, email, status, health_score, lifecycle_stage, monthly_value, parent_client_id, notes)
VALUES (
  '11111111-1111-1111-1111-111111111014',
  'Cenegenics',
  'Cenegenics',
  NULL,
  'active',
  40,
  'prospect',
  0,
  '11111111-1111-1111-1111-111111111002',
  'Sub-client of Kyle Painter. Vercel config exists but no deliverables or notes. Status unknown.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, notes = EXCLUDED.notes,
  health_score = EXCLUDED.health_score, parent_client_id = EXCLUDED.parent_client_id, updated_at = now();


-- ═══════════════════════════════════════════════════════════
-- KNOWLEDGE DOCS — Comprehensive context per client
-- ═══════════════════════════════════════════════════════════
-- Uses a helper to avoid duplication: insert only if title doesn't exist for client

-- ─── PRINCE ANDAM ────────────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111001',
  'Client Overview',
  'Prince Acquah Andam — CEO / Co-founder of SUMAIT AI AGENTS and meda.ai (rebranding from mayda.ai).

**Location:** UK-based
**Companies:** SUMAIT AI AGENTS + meda.ai / meda.com (EA staffing business)
**Rebranding:** mayda.ai final name decision by 2026-03-21

**Two Service Pillars:**
1. Business Automations
2. Lead Infrastructure

**Aspirations:** Wants to be like Dan Martel + Liam Oatley. "Black UK founder" differentiator in AI/automation space. Wants "money-printing personal brand within six months."

**Manila Visit:** ~March 29-30 (with Bryan, Rowena, Angel)',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111001',
  'Active Projects',
  '1. **Personal Brand Content Strategy** — Strategy PDF (cloned vs real content split, Dan Martel + Liam Oatley analysis, KPIs, platforms). Long-form YouTube = real Prince; short-form TikTok/IG = AI clone (HeyGen). Carlo as video editor.

2. **Mayda.ai Rebrand** — Name decision by 2026-03-21. Website to reflect two service pillars.

3. **AIOS (AI Operating System)** — Replicating Liam Oatley AIOS for SUMAIT team. Currently PAUSED due to client workload.

4. **Cold Calling Agent** — Twilio/GHL/VAPI. Being tested team-wide. Bella providing feedback. Tonality improvement requested (woman voice).

5. **25 Automation Templates** — 25 business automations to be strategized first, then built as templates.

6. **Email Outreach Campaign** — Leads generated; campaign launching via Instantly.ai.

7. **RealCRM (Dubai CRM v2)** — ~85% complete. Assigned to Lee. React/Supabase. Needs: RBAC, WhatsApp/Callgear integration, portal auto-sync (Bayut/Property Finder), mobile responsive.

8. **Voice Agent (Elom clone)** — ElevenLabs clone. Pending new recording from Elom.

9. **MadeEA.ai Lead Infra** — Full SaaS (21-phase build). Supabase + React + n8n + GHL + Retell.',
  'general',
  false
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111001',
  'Tools & Platforms',
  'n8n, GHL (GoHighLevel), Supabase, OpenAI, ElevenLabs, HeyGen, Blotato (pending), VAPI, Twilio, ManyChat, Instantly.ai, Retell AI, Calendly, Asana

**n8n Instance:** https://madeeas.app.n8n.cloud',
  'technical',
  false
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111001',
  'Key Decisions',
  '- CandyPay prioritized over Sebastian (2026-03-18)
- SUMAIT absorbs tool costs for Sebastian ($27+/mo WhatsApp API)
- Product name for Sebastian solution: leaning LeadPulse (Bryan preference, Prince has final say)
- Two rounds of revisions included in first month for MadeEA clients
- Content strategy: strategize before executing, PDF plan first
- Manila meetup selected (2026-03-16)',
  'process',
  false
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111001',
  'Sub-Clients',
  'Prince has the following sub-clients (his clients):

1. **Sebastian Ionescu** — Mental coaching for athletes (Dubai/Romania). EUR 1,200/quarter.
2. **CandyPay (Daniel & James Candy)** — Fintech/payments/crypto (Dubai).
3. **Elom Ahlijah** — Online fitness coaching. Introduced Sebastian to Prince.
4. **UK Website Brothers** — Prospective, pending Prince confirmation (OVERDUE since 2026-03-16).',
  'general',
  true
) ON CONFLICT DO NOTHING;

-- ─── KYLE PAINTER ────────────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111002',
  'Client Overview',
  'Kyle Painter — Disruptors Media
**Retainer:** $1,250 per pay cycle (increased 2026-03-17)
**Partner:** Tyler Gordon (handles CSM/client relationships)
**Bryan Role:** Technical builds for Kyle''s clients

**Business Model:** AI systems + marketing agency. 5-tier pricing: $1,500 / $3,500 / $5,000 / $7,500 / $12,000/month + $3K one-time setup. ~$1K/month of each tier allocated to Bryan''s AI system management.

**Key Principles:**
- All client-facing workflow displays: simple flowcharts only (not raw n8n)
- Two rounds of revisions in first month
- Weekly CSM calls mandatory first month (Tyler as CSM)
- Error handling/notifications required on ALL client workflows before handoff
- Two-phase model: 30 days AI setup, then monthly MRR marketing retainer',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111002',
  'Active Projects',
  '1. **Sales Infra (LAS Platform)** — Disruptors Infra fork → "Sales Infrastructure." Redesigned to Skool interface (v2.0). Vite + React + TS + Supabase + shadcn/ui. n8n: n8n.disruptormedia.dev (not yet configured). Outstanding: wire n8n workflows, wire Retell Voice AI, wire GHL, add tests.

2. **Webinar (2026-03-24)** — Three displays: AI Sales Infra, Marketing Services Hub, Client Journey Timeline. Kyle making slides, Bryan building templates.

3. **Client Workflow Display System** — Every workflow needs: flowchart, video walkthrough, feedback/comments section.

4. **Audit Tools** — Lee assigned corrections.
5. **Subwatch Pro** — Lee assigned build.
6. **HeyGen SOP Videos** — 8 videos across 7 setups. Hiro editing.
7. **Client Feedback System** — Frame.io + in-app comments.
8. **Pricing Calculator** — v7 built. 5-tier model.',
  'general',
  false
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111002',
  'Sub-Clients',
  'Kyle has the following sub-clients (Disruptors Media clients):

1. **Colin Bagley / Art of Drawers** — Custom cabinets, Salt Lake City. 5-day build (Mar 18-22).
2. **Softwash Pros (C&M Services)** — Exterior cleaning. AI Receptionist "Katie" near complete.
3. **Wise Abatement** — Hazardous material removal, Calgary. Case study — new automation weekly. Tyler shows on Wednesdays.
4. **Cenegenics** — Status unknown, Vercel config exists.',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111002',
  'Tools & Platforms',
  'GHL (GoHighLevel), n8n (n8n.disruptormedia.dev), Supabase, OpenAI, Retell AI, Frame.io (Adobe subscription), HeyGen, Zapier, Customer Factor, Twilio, VAPI, Instantly.ai, Skool (interface redesign)

**Key:** Carl Vicente removed from team (unauthorized software use). Raul is replacement. Perdia/Rio back on retainer.',
  'technical',
  false
) ON CONFLICT DO NOTHING;

-- ─── JUAN MARTINEZ ───────────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111003',
  'Client Overview',
  'Juan Martinez — AI Tech Solutions / ClaudeXAG
**Platform:** AI Acquisitions — SDR tool for cold email + outbound
**Pipeline:** 4 clients waiting on onboarding system
**Also:** Connected to PrestoCleaning (Thomas Rummel) for B2C lead data
**Teaching Bryan:** LeadGenJ school access, lead scraping tools (Apollo, Arian''s Labs)

**Fathom Recordings:** March 10 (88 min), March 19 (86 min)',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111003',
  'Active Projects',
  '1. **AI Onboarding Agent** — Voice agent that onboards new clients via phone call. Collects: ICP, niche, offer. Fixes needed (2026-03-19): 1-sec response delay, split multi-question prompts, remove service-type re-ask, add ICP qualifiers (income, net worth, household type), add EIN/A2P explainer. Retest with Juan 2026-03-20.

2. **NNAN Workflow — Conversation AI Training** — Add OpenAI prompt generator to auto-create scripts from ICP + offer data.

3. **Campaign Email Automation** — 10 email variations per client. CSV upload to Cloud Code.

4. **GHL Sub-Account Creation** — Adam assigned (CRITICAL).

5. **AI Agent Deployment** — Adam assigned (CRITICAL).

6. **Pontoon Rental (Kristen)** — BLOCKED: No credentials from Kristen.

7. **Mobile App (A0.Dev)** — Deferred to after onboarding done.

8. **GHL Snapshot** — Create once onboarding finalized.',
  'general',
  false
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111003',
  'Key Decisions',
  '- Generalize onboarding script with ICP qualifier questions instead of per-industry knowledge bases
- Finish onboarding system by 2026-03-20 — 4 clients waiting
- PrestoCleaning B2C leads download — $200 budget, San Diego, 14 ZIP codes
- Conversation AI training auto-generated via OpenAI (not manual)
- Campaign setup is manual and one-time per client
- Keep onboarding questions simple: Offer, ICP, Niche (3 things only)
- Agreement first + payment simultaneously → then onboarding call booking',
  'process',
  false
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111003',
  'Tools & Platforms',
  'GHL (GoHighLevel), n8n, Instantly.ai, AI Acquisitions, Airtable, Hunter, Gemini, Apify, Google Drive, Twilio, Retell AI (voice onboarding agent), A0.Dev, Apollo, Arian''s Labs, Cloud Code',
  'technical',
  false
) ON CONFLICT DO NOTHING;

-- ─── JOSHUA KOKOUMI ─────────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111004',
  'Client Overview',
  'Joshua Kokoumi — Kokoume Consulting
**Contact:** bryansumait.automate@gmail.com
**Payment:** Wise
**Fathom:** March 12 (23 min) — https://fathom.video/share/vQREpUN7FCHv6Tw_-_szpzo7U-JzEgkM

Has "setter" + "closer" sales team structure. Uses GCL for sales tracking, Stripe, Telegram, PandaDoc for contracts.',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111004',
  'Workflows Built (7 total, 100% test success)',
  '1. **Setting Workflow** — GCL webhook → detect discovery call → extract setter name → write to Lead Journey Map → notify Telegram
2. **Closing Workflow** — GCL webhook → detect sales call → resolve clipper → update journey map → notify Telegram
3. **KC Wins Workflow** — Contract signature trigger → full attribution → win announcement with deal size
4. **Hustle Call Remaster** — Daily reminder at 16:00 buyer time with duplicate prevention
5. **Stripe Invoice Workflow** — PDF download → Google Drive → finance log (BLOCKED: no invoices in Stripe yet)
6. **Stripe Backfill Workflow** — Manual trigger, paginated API, rate limiting
7. **Shared Error Handler** — Retry logic, failed events sheet',
  'technical',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111004',
  'Blockers (Waiting on Joshua)',
  '- Create ContentHub Log Google Sheet (12 columns) — blocks workflows 2-4
- Create Lead Journey Map Google Sheet (7 columns) — blocks workflows 2-4
- Get Telegram group chat_id + 3 thread_ids (Setting, Closing, KC-Wins)
- Configure GHL/Digiscale webhooks for setting + closing calendars
- Register PandaDoc webhook
- Fill out Stripe Invoice Intake Form (sent 2026-03-13)
- Create first Stripe invoice (for live testing)
- Send message templates (setting, closing, winning notifications) to fix encoding issues',
  'process',
  true
) ON CONFLICT DO NOTHING;

-- ─── THOMAS RUMMEL ───────────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111005',
  'Client Overview',
  'Thomas Rummel — Presto Cleaning (San Diego, CA)
**Revenue:** $1,250/month (Growth Engine Package)
**Payment:** 50% upfront ($625) + 50% at Day 30, then $1,250/month recurring
**Assigned:** Jamil (primary) + John (check in)
**Split:** 3-way profit split with 2 team members

**Package Includes:** Voice AI Agent (inbound lead qualification) + Cold Email Outreach System',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111005',
  'Campaign Strategy',
  '**5 Campaigns:** Pet Owner, Luxury, Neighborhood (hyper-local), Eco-Friendly, Seasonal/Spring
**Zip Codes:** 92101-92117 (14 San Diego neighborhoods)
**Target:** 3,800-11,000 leads total
**Sending Capacity at Full Ramp:** 500 emails/day (17 inboxes × 30/inbox)
**B2C Leads:** $200 budget via Arian''s Labs (homeowners $100K+, pets, 14 ZIP codes)
**Lead Sources:** Apify (Google Maps, competitor reviews, Yelp, real estate), AvocaData ($60 for 500 leads), PhantomBuster

**Email Setup:** 3-4 sending domains, 17 inboxes, 2-3 week warmup, start 10/day → 30/day
**Voice AI:** Answers inbound calls, qualifies leads (home size, pets, frequency), creates lead brief. Cost: ~$35-55/month.',
  'technical',
  false
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111005',
  'Setup Status (All NOT DONE)',
  '1. Purchase 3-4 sending domains
2. Email authentication (SPF, DKIM, DMARC)
3. Create 4-5 inboxes per domain in Instantly (17 total)
4. Turn on warmup (2-3 weeks, 10→30/day)
5. Prepare lead CSV
6. Reply forwarding to Tom''s email
7. Campaign 1 (Pet Owner) — launch after warmup
8. Campaign 3 (Neighborhood) — Week 5-6
9. Campaigns 2 & 5 (Luxury, Eco) — Week 7+
10. Lead sourcing via Apify

**Monthly Cost:** ~$83-178/month. Monthly profit: ~$1,072-1,167. Per person: ~$357-389.',
  'process',
  false
) ON CONFLICT DO NOTHING;

-- ─── BLAKE (SpaScale AI) ────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111006',
  'Client Overview & Brand',
  'Blake — SpaScale AI
**Products:** AI Search Optimization, Reputation Engineering, Growth Scaling Solutions

**Website Design Instructions:**
- Colors: gold, teal blue, grey (from logo)
- Clean, concise, not a lot of copy
- Use logo icon as bullet points
- Same font as logo for section headings
- Source file: SpaScal website content (2).pdf

**Status:** Project scoped but deliverables NOT DONE. Website not started. Meeting-Notes and Reports folders empty.',
  'brand',
  true
) ON CONFLICT DO NOTHING;

-- ─── SEBASTIAN IONESCU ──────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111008',
  'Client Overview',
  'Sebastian Ionescu — Sebastian Mental Coach FZ-LLC
**Parent Client:** Prince Andam (sub-client)
**Industry:** Mental Coaching for Performance Athletes
**Location:** Romania (Bucharest) / UAE (Dubai)
**Website:** https://www.sebastian-mentalcoach.com
**Email:** contact@sebastian-mentalcoach.com
**Phone:** +971552836779 | WhatsApp: +971502836779
**Deal:** EUR 1,200/quarter (closed March 13, 2026). Sprint: 10 days from March 16.
**Assigned:** John (Days 1-2 critical), Bryan (overall delivery)
**Support Model:** Sebastian → Prince or Elom → Bryan for technical fixes

Former professional basketball player. Works with athletes (ages 10-35), parents, sports teams/clubs. 20 active clients. Hosts weekly Sunday webinar.',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111008',
  'Services & Pricing',
  '1. **1:1 Coaching** — €400/month or €100/session
2. **Curs de Auto-Coaching** (Self-Coaching Course for Athletes) — €200 / 8 weeks
3. **Curs destinat Părinților de Sportivi** (Course for Parents) — €150

**Lead Sources:** Instagram, TikTok, Facebook/Meta Ads, website, referrals, webinar sign-ups
**Current Tools:** Zapier, WhatsApp Business, Mailchimp, Calendly, Systeme.io, Wix.com, ManyChat',
  'general',
  false
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111008',
  'What We Are Building (10-Day Sprint)',
  '**3 WhatsApp Agents (Claude 3.5 Sonnet, Romanian + English):**
1. Lead Qualification Agent — qualifies inbound leads, routes to GHL pipeline
2. Engagement/Nurturing Agent — proactively initiates conversations, checks in on practices/games, nurtures in Sebastian casual texting style
3. Appointment Setter — schedules audio calls (no Calendly; calls via WhatsApp audio + VPN)

**Email Systems:**
- Webinar registration → pre-webinar reminder → day-of → post-webinar feedback → next week reminder
- Follow-up + lead magnet (PDF: "Zona de confort e bună!" — mental training manual)

**Key Technical Requirements:**
- Romanian primary language (natural phrasing, not literal translations)
- WhatsApp Business API via Meta Business Manager
- No prices shown before closing phone call
- Under-18 athletes: parent-first protocol
- Proactive outreach (agent starts conversations)

**Sprint Status (2026-03-19):**
- Done: Knowledge base, Romanian chatbot prompt, Voiceflow + Claude prompt tuned, architecture design, email templates
- In Progress: GHL sub-account, email sequences
- Blocked: WhatsApp API setup (needs screen share + Meta Business Manager access), Wix/Systeme.io access, ManyChat access, lead magnet PDF',
  'technical',
  true
) ON CONFLICT DO NOTHING;

-- ─── CANDYPAY ───────────────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111009',
  'Client Overview',
  'CandyPay — Daniel & James Candy (brothers)
**Parent Client:** Prince Andam (sub-client)
**Company:** CandyPay / candy-pay.io
**Contact:** Daniel@candy-pay.io
**Industry:** Fintech — Payments, Crypto, Banking
**Location:** Dubai
**Bot Name:** Alex
**Assigned:** John (primary), Bryan (oversight), Carlo (live chat widget)

**Services:** International bank transfers, crypto payments (BTC, USDT, ETH, USDC), corporate account opening ($5K per account — half upfront, half on opening, 48hrs), FX, payment processing, banking as a service, card issuance, crypto processing, open banking

**Daily Users:** Tessa, James, Danny, Matt, George
**Minimum Deal Size:** $100K monthly volume
**Payments:** Bank transfer + crypto (no Stripe). Own card processor.',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111009',
  'What We Are Building',
  '**Chatbot "Alex" (AI-powered):**
- Answers FAQs: banking, corporate account opening, pricing
- Qualifies leads by monthly volume, service needs, urgency
- Professional & formal tone
- Brand color: Pink
- Qualified lead actions: schedule call, collect contact details, redirect to WhatsApp, email notification to sales

**Invoicing Automation:**
- Currently manual (bank transfer + crypto wallet addresses)
- Need automated invoice generation

**Live Chat Widget:**
- Knowledge base done; widget ready to deploy
- BLOCKED: Missing website access credentials
- Bryan + Carlo assigned (2026-03-19 target)

**GHL Sub-Account:** Being created for CRM monitoring

**Key Notes from March 13 Meeting:**
- Onboarded Tessa (EA from MadeEA) — handles WhatsApp trading profit calculations
- Using delegation hub + automation hub
- Want chatbot to filter by deal size ($10M = good lead, $10K = not interesting)
- Tessa using 70-bot GPT library (Nora/finance bot for invoices)',
  'technical',
  true
) ON CONFLICT DO NOTHING;

-- ─── ELOM AHLIJAH ───────────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111010',
  'Client Overview',
  'Elom Ahlijah — Online Fitness Coaching
**Parent Client:** Prince Andam (sub-client)
**Role:** Personal trainer building online coaching brand. Also introduced Sebastian to Prince.
**Meeting:** February 27, 2026 (60 min)

Has Instagram with AI audit funnel automation. Uses GHL. Wants to scale sales using AI.
**Personality:** Charismatic, confident, sometimes flirtatious.',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111010',
  'What We Are Building',
  '1. **VAPI Voice Sales Bot (Elom Voice Clone):**
   - Clone via ElevenLabs (Creator plan, $22/mo)
   - VAPI bot sells fitness coaching in Elom''s voice
   - Call flow: Greeting → Discovery → Pitch → Objection handling → Close/book
   - Both inbound AND outbound
   - Retell for real calls; VAPI for demos + content
   - Stage viral content: Elom eating/playing PS5 while AI bot runs sales call
   - Jordan Belfort AI clone sent as reference

2. **Instagram Automation (ManyChat):**
   - Capture email + phone before AI audit access
   - ManyChat Pro ($15/mo) approved
   - A/B test ManyChat vs current GHL automation
   - Follow-before-link feature

3. **PropFlow CRM (for Jason):**
   - MVP built from transcript
   - Monday call with Jason for feedback
   - Don''t replicate Pixie CRM (copyright risk)

4. **Entrepreneurs Club App (concept):**
   - Tinder-style matching for entrepreneurs
   - Vet users by industry + revenue before access

**Status:** VAPI bot pending — needs 2-min audio recording from Elom (Bryan following up).',
  'technical',
  false
) ON CONFLICT DO NOTHING;

-- ─── COLIN BAGLEY / ART OF DRAWERS ─────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111011',
  'Client Overview',
  'Colin Bagley — Art of Drawers
**Parent Client:** Kyle Painter / Disruptors Media (sub-client)
**Industry:** Custom cabinet/drawer organization (residential)
**Location:** Salt Lake City, UT
**Contact:** cbagley@artofdrawers.com / (801) 899-0239
**Website:** https://artofdrawers.com
**Assigned:** Lee + John (co-assigned), Bryan (oversight)
**Build Deadline:** Saturday, 2026-03-22 (5-day build)

**Target Demographic:** 55+ homeowners
**Lead Acquisition:** Trade show QR code opt-ins
**Existing Tools:** GHL, ChatGPT, n8n
**Needs to Purchase:** Supabase',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111011',
  'System Architecture',
  '**n8n:** https://artofdrawerssaltlake.app.n8n.cloud
**Supabase:** https://wfdkkdevzmxphyghgvfi.supabase.co

**5 n8n Workflows:**
1. New Lead Processing
2. Follow-Up Sequence (10-step over 14 days, SMS primary, email supporting)
3. Inbound Message Processing (AI)
4. Booking Flow (15-min intro call OR 2-hour in-home design consultation)
5. Human Transfer

**4 Supabase Tables:** contacts, conversations, agent_memory, follow_up_status

**Qualification Questions:** Which room? Biggest frustration? Looked into solutions before? Prefer quick call or in-home?

**Business Hours:** 10AM-6PM MST Mon-Fri
**A2P/10DLC:** Submit Day 1 (Twilio for SMS, Sendblue noted)
**Voice AI:** Retell AI (Phase 2 — after text system live)',
  'technical',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111011',
  'Content Needed From Colin',
  '- 60-90 second video for follow-up sequence
- Before/after project photos (3-5 sets)
- 2-3 customer testimonials
- Brand assets (logo, hex colors)

**Status (2026-03-19):** n8n password now available — Bryan can finish build.',
  'process',
  false
) ON CONFLICT DO NOTHING;

-- ─── SOFTWASH PROS ──────────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111012',
  'Client Overview & Status',
  'Softwash Pros — C&M Services
**Parent Client:** Kyle Painter / Disruptors Media (sub-client)
**Industry:** Exterior cleaning / softwash services
**Assigned:** Lee

**AI Receptionist "Katie"** (Retell voice AI):
- Customer Factor CRM integration
- Bugs fixed (March 13): phone field home→cell, birthday removed, "customers" → "prospects"
- Kyle emailing client for approval → then switch to client GHL phone number

**Status:** Near complete — waiting client approval.',
  'general',
  true
) ON CONFLICT DO NOTHING;

-- ─── WISE ABATEMENT ─────────────────────────────────────

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111013',
  'Client Overview',
  'Wise Abatement — Calgary, Alberta
**Parent Client:** Kyle Painter / Disruptors Media (sub-client)
**Industry:** Hazardous material removal (asbestos, mould, lead, vermiculite, demolition)
**Website:** https://wiseabatement.ca
**Phone:** (587) 997-6500 | Email: info@wiseabatement.ca
**Google Rating:** 5.0 stars, 102+ reviews
**Tyler''s client** — shows deliverables on Wednesdays
**Strategy:** Case study — new automation added every week',
  'general',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_docs (client_id, title, content, category, is_pinned)
VALUES (
  '11111111-1111-1111-1111-111111111013',
  'What Has Been Built',
  '- GHL + n8n setup complete (2026-03-13)
- Chat agent with full knowledge base
- Voice agent with complete call flow, objection handling, lead capture
- Database reactivation campaigns (3 segments): unconverted leads, past customers, contractor reactivation

**7 Services:** Asbestos removal/testing, mould removal, attic mould, lead paint, vermiculite, demolition
**4 Customer Segments:** Homeowners, property managers, commercial, contractors

**Still Needed:**
- Client''s OpenAI API key (Tyler to get)
- Full end-to-end testing + error handling
- Walkthrough video for client
- Quote follow-up automation (in progress)',
  'technical',
  true
) ON CONFLICT DO NOTHING;
