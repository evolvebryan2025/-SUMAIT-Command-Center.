-- ============================================================
-- Seed: Client Projects & Presentations
-- Maps all deliverables, tools, presentations, and reports
-- to clients using fixed UUIDs from 006_client_knowledge_base_seed.sql
-- ============================================================
-- Client UUID reference:
--   Prince Andam        = 11111111-1111-1111-1111-111111111001
--   Kyle Painter        = 11111111-1111-1111-1111-111111111002
--   Juan Martinez       = 11111111-1111-1111-1111-111111111003
--   Joshua Kokoumi      = 11111111-1111-1111-1111-111111111004
--   Thomas Rummel       = 11111111-1111-1111-1111-111111111005
--   Blake               = 11111111-1111-1111-1111-111111111006
--   Kevin Brenner       = 11111111-1111-1111-1111-111111111007
--   Sebastian Ionescu   = 11111111-1111-1111-1111-111111111008
--   CandyPay            = 11111111-1111-1111-1111-111111111009
--   Elom                = 11111111-1111-1111-1111-111111111010
--   Colin/Art of Drawers= 11111111-1111-1111-1111-111111111011
--   SoftwashPros        = 11111111-1111-1111-1111-111111111012
--   WiseAbatement       = 11111111-1111-1111-1111-111111111013
--   Cenegenics          = 11111111-1111-1111-1111-111111111014
-- ============================================================

-- Use fixed project UUIDs so seed is idempotent
-- Format: 22222222-2222-2222-2222-2222222220XX

-- ============================================================
-- PRINCE ANDAM — Projects & Presentations
-- ============================================================

INSERT INTO public.projects (id, client_id, name, description, type, status, deliverable_url)
VALUES
  -- Deliverables / Tools
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001',
   'Bryan Meeting Report System', 'Meeting-to-HTML skill with action items tracking, Fathom integration, and metrics dashboard',
   'tool', 'completed', 'https://bryan-meeting-mar10-2026.vercel.app'),

  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111001',
   'Bryan Meetings Dashboard', 'Meeting reports dashboard with filtering and analytics across all meetings',
   'tool', 'completed', 'https://bryan-meetings-dashboard.vercel.app'),

  ('22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111001',
   'Personal Brand Growth Strategy 2026', '10-section strategic plan — Dan Martel + Liam Ottley competitor analysis, platform strategy, clone vs real matrix, 90-day roadmap, team roles, tool stack',
   'deliverable', 'completed', 'https://prince-brand-strategy.vercel.app'),

  ('22222222-2222-2222-2222-222222222004', '11111111-1111-1111-1111-111111111001',
   'Madeea.ai Infra', 'Lead Automation System rebranded to Madeea.ai — Ion Blue dark premium theme, Space Grotesk + Inter fonts, glass morphism cards, Supabase + React + Vite',
   'deliverable', 'completed', 'https://madeea-ai-infra.vercel.app'),

  ('22222222-2222-2222-2222-222222222005', '11111111-1111-1111-1111-111111111001',
   'Prince Meeting Report (Mar 18)', 'Meeting summary report — 15 action items, 14 verbatim quotes, 10 topics, interactive checklists with localStorage persistence',
   'report', 'completed', 'https://vercel-deploy-temp-six.vercel.app'),

  -- Presentations
  ('22222222-2222-2222-2222-222222222006', '11111111-1111-1111-1111-111111111001',
   'CloserOS Discovery Call Presentation', 'Sales presentation for CloserOS product — discovery call flow and value proposition',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222007', '11111111-1111-1111-1111-111111111001',
   'Contractors Presentation', 'Presentation deck for contractor outreach and partnership',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222008', '11111111-1111-1111-1111-111111111001',
   'Contractors Webinar', 'Webinar presentation targeting contractors for AI automation services',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222009', '11111111-1111-1111-1111-111111111001',
   'Tinder for Business Presentation', 'Concept presentation for business-matching platform idea',
   'presentation', 'completed', NULL),

-- ============================================================
-- KYLE PAINTER / DISRUPTORS MEDIA — Projects & Presentations
-- ============================================================

  -- Deliverables / Tools
  ('22222222-2222-2222-2222-222222222010', '11111111-1111-1111-1111-111111111002',
   'Follow-Up System Intake Form', 'Generalized intake form for follow-up system clients (GHL + n8n + Supabase + OpenAI credentials setup)',
   'deliverable', 'completed', 'https://deploy-followup-intake.vercel.app'),

  ('22222222-2222-2222-2222-222222222011', '11111111-1111-1111-1111-111111111002',
   'Follow-Up System Intake Form v2', 'Updated intake form with A2P messaging registration + business registration + website access sections',
   'deliverable', 'completed', 'https://vercel-intake-form-v2.vercel.app'),

  ('22222222-2222-2222-2222-222222222012', '11111111-1111-1111-1111-111111111002',
   'Sales Infrastructure Calculator v7', '5-tier pricing calculator ($1.5K-$12K) with $3K setup fee and B2B/B2C toggle',
   'tool', 'completed', 'https://disruptors-calculator.vercel.app'),

  ('22222222-2222-2222-2222-222222222013', '11111111-1111-1111-1111-111111111002',
   'Workflow Flowcharts (8 systems)', 'Interactive flowcharts for all 8 automation workflows (lead follow-up through prompt playground)',
   'deliverable', 'completed', 'https://vercel-workflow-flowcharts.vercel.app'),

  ('22222222-2222-2222-2222-222222222014', '11111111-1111-1111-1111-111111111002',
   'Disruptors Templates Hub (11 genericized)', 'Genericized templates: 5 onboarding pieces + 4 build guides + 2 sales/pricing docs',
   'deliverable', 'completed', 'https://vercel-templates-wine.vercel.app'),

  ('22222222-2222-2222-2222-222222222015', '11111111-1111-1111-1111-111111111002',
   'Client Setup Form (8-step)', '8-step credential setup guide with A2P/10DLC registration + Supabase/OpenAI/GHL/Twilio/Retell/N8N/Webhooks',
   'tool', 'completed', 'https://disruptors-credential-form.vercel.app'),

  ('22222222-2222-2222-2222-222222222016', '11111111-1111-1111-1111-111111111002',
   'Client Feedback Portal', '8-workflow client portal with editable message templates, per-message confirm buttons, general feedback form — webhook backend on Prince n8n',
   'tool', 'completed', 'https://disruptors-client-portal.vercel.app'),

  ('22222222-2222-2222-2222-222222222017', '11111111-1111-1111-1111-111111111002',
   'Client Journey Timeline', '6-step overview + detailed day-by-day V2 breakdown (Day 1-10, Week 2-3, Month 1+, Ongoing) with version toggle',
   'deliverable', 'completed', 'https://disruptors-client-journey.vercel.app'),

  ('22222222-2222-2222-2222-222222222018', '11111111-1111-1111-1111-111111111002',
   'Marketing Services Hub', 'Card-based hub for 6 marketing services (SEO/GEO, Meta Ads, Google Ads, Cold Email/LinkedIn, Social Media, Website Design) with modal detail views',
   'deliverable', 'completed', 'https://disruptors-marketing-hub.vercel.app'),

  ('22222222-2222-2222-2222-222222222019', '11111111-1111-1111-1111-111111111002',
   'Simplified Workflow Flowcharts', '8 clean visual flowcharts for business owners — simplified versions of all automation workflows',
   'deliverable', 'completed', 'https://disruptors-workflow-simplified.vercel.app'),

  ('22222222-2222-2222-2222-222222222020', '11111111-1111-1111-1111-111111111002',
   'Disruptors Outreach Agent v2', 'AI-powered personalized outreach agent — Claude API + web search, cold email + LinkedIn DM generator. QA-hardened: 4096 tokens, 90s timeout',
   'tool', 'completed', 'https://outreach-agent-iota.vercel.app'),

  ('22222222-2222-2222-2222-222222222021', '11111111-1111-1111-1111-111111111002',
   'InfraScripts Hub', 'Consolidated hub — 10 video scripts, HeyGen copy-paste tool, auto-submit script, B-roll shot list, delegation doc (5 tabs)',
   'deliverable', 'completed', 'https://infra-scripts.vercel.app'),

  -- Reports
  ('22222222-2222-2222-2222-222222222022', '11111111-1111-1111-1111-111111111002',
   'Kyle Daily Report (Mar 17)', 'Daily deliverables report — 13 items: calculator v7, intake form v2, 8 flowcharts, templates hub, setup form, Art of Drawers, webinars, Perdia, audit tool, Softwash Pros',
   'report', 'completed', 'https://kyle-reporting-0317.vercel.app'),

  ('22222222-2222-2222-2222-222222222023', '11111111-1111-1111-1111-111111111002',
   'Kyle Meeting Report (Mar 18)', 'Transcript analyzer report — Kyle x Bryan x Tyler meeting March 18, interactive checklists',
   'report', 'completed', 'https://deploy-kyle-mar18.vercel.app'),

  ('22222222-2222-2222-2222-222222222024', '11111111-1111-1111-1111-111111111002',
   'Kyle Meeting Report (Mar 19)', 'Transcript analyzer report — Bryan x Tyler x Kyle meeting March 19, interactive checklists',
   'report', 'completed', 'https://deploy-kyle-mar19.vercel.app'),

  ('22222222-2222-2222-2222-222222222025', '11111111-1111-1111-1111-111111111002',
   'Kyle Meeting Report (Mar 20)', '134-min meeting summary — 25 action items, 14 verbatim quotes, 10 topics. School Infra walkthrough, Art of Drawers/Wise Abatement updates',
   'report', 'completed', 'https://kyle-meeting-mar20.vercel.app'),

  -- Presentations
  ('22222222-2222-2222-2222-222222222026', '11111111-1111-1111-1111-111111111002',
   'Disruptors Media Webinar (22 slides)', '22-slide webinar presentation using Allan Miles 7-Step VSL framework — targeting service businesses $35K+/mo with 5-tier pricing',
   'presentation', 'completed', 'https://disruptors-webinar.vercel.app'),

  ('22222222-2222-2222-2222-222222222027', '11111111-1111-1111-1111-111111111002',
   'Disruptors Media Webinar v2 (Full Package)', '24-slide webinar combining AI Sales Infrastructure + Full-Service Marketing — 5-tier pricing with comparison table',
   'presentation', 'completed', 'https://disruptors-webinar-v2.vercel.app'),

  ('22222222-2222-2222-2222-222222222028', '11111111-1111-1111-1111-111111111002',
   'Disruptors Webinar Full (81 slides)', 'Full webinar — 77 Canva slides + 4 custom HTML risk reversal slides (What You Get / $17K->$3K Offer / 30-Day Guarantee / You Own Everything)',
   'presentation', 'completed', 'https://disruptors-webinar-full.vercel.app'),

  ('22222222-2222-2222-2222-222222222029', '11111111-1111-1111-1111-111111111002',
   'Disruptors Infra Presentation v3', 'Sales infrastructure presentation deck — AI automation services overview for Disruptors Media clients',
   'presentation', 'completed', NULL),

-- ============================================================
-- JUAN MARTINEZ — Projects & Presentations
-- ============================================================

  ('22222222-2222-2222-2222-222222222030', '11111111-1111-1111-1111-111111111003',
   'Document Signer App', 'Next.js document signing application for contract management — built with ClaudeXAG',
   'tool', 'in_progress', NULL),

  ('22222222-2222-2222-2222-222222222031', '11111111-1111-1111-1111-111111111003',
   'Juan Meeting Report (Mar 19)', '86-min meeting summary — 15 action items, 10 verbatim quotes, 7 topics. Onboarding agent fixes, NNAN workflow, PrestoCleaning leads, A0.Dev discussion',
   'report', 'completed', 'https://juan-meeting-mar19.vercel.app'),

  ('22222222-2222-2222-2222-222222222032', '11111111-1111-1111-1111-111111111003',
   'Juan Martinez Status Report (Mar 18)', 'Client status report with task breakdown and deliverables summary',
   'report', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222033', '11111111-1111-1111-1111-111111111003',
   'Brand Guidelines Collection', 'Complete brand guideline documents for all SUMAIT/MadeEA brands — Disruptors Media, MadeEA, Prince, SUMAIT AI dev kits',
   'brand_kit', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222034', '11111111-1111-1111-1111-111111111003',
   'GHL Sub-Account Setup', 'GoHighLevel sub-account creation and AI agent deployment for Juan operations',
   'deliverable', 'in_progress', NULL),

-- ============================================================
-- JOSHUA KOKOUMI — Projects & Presentations
-- ============================================================

  ('22222222-2222-2222-2222-222222222035', '11111111-1111-1111-1111-111111111004',
   'KC Stripe Invoice Intake Form', 'Intake form for Stripe Invoice implementation project — KC-Project',
   'tool', 'completed', 'https://kc-intake-form.vercel.app'),

  ('22222222-2222-2222-2222-222222222036', '11111111-1111-1111-1111-111111111004',
   'KC Project Presentation', 'Project presentation for KC Stripe Invoice implementation — scope, timeline, deliverables',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222037', '11111111-1111-1111-1111-111111111004',
   'Brand Guidelines Collection', 'Complete brand guideline documents — Disruptors Media, Kyle Painter, Madeea.ai, Prince, SUMAIT AI dev kits',
   'brand_kit', 'completed', NULL),

-- ============================================================
-- THOMAS RUMMEL / PRESTO CLEANING — Projects
-- ============================================================

  ('22222222-2222-2222-2222-222222222038', '11111111-1111-1111-1111-111111111005',
   'Presto Cleaning Delegation Page', 'Delegation page for Presto Cleaning project tasks — managed by Jamil',
   'deliverable', 'completed', 'https://presto-cleaning-delegation.vercel.app'),

  ('22222222-2222-2222-2222-222222222039', '11111111-1111-1111-1111-111111111005',
   'Email Campaign Setup (Phases 1-2)', 'Email campaign setup for Presto Cleaning — lead nurturing sequences and follow-up automation',
   'deliverable', 'in_progress', NULL),

  ('22222222-2222-2222-2222-222222222040', '11111111-1111-1111-1111-111111111005',
   'Campaign Plan', 'Strategic campaign plan for Presto Cleaning email and outreach automation',
   'deliverable', 'completed', NULL),

-- ============================================================
-- BLAKE — Projects
-- ============================================================

  ('22222222-2222-2222-2222-222222222041', '11111111-1111-1111-1111-111111111006',
   'Website Build', 'Website project for Blake — HTML site build',
   'deliverable', 'in_progress', NULL),

-- ============================================================
-- SEBASTIAN IONESCU (sub-client of Prince) — Projects & Presentations
-- ============================================================

  ('22222222-2222-2222-2222-222222222042', '11111111-1111-1111-1111-111111111008',
   'Sebastian Project Status Update', 'Build status presentation — intake form received, backend in progress, 5 blockers (WhatsApp API, Wix, Systeme.io, Zapier/Manychat, book PDF)',
   'presentation', 'completed', 'https://sebastian-status.vercel.app'),

  ('22222222-2222-2222-2222-222222222043', '11111111-1111-1111-1111-111111111008',
   'Delegate to Carlo — Sebastian Project', 'Delegation brief for Carlo — 8 tasks covering WhatsApp agents (qualification + nurturing + appointment), email sequences, knowledge base, GHL setup, E2E testing',
   'deliverable', 'completed', 'https://delegate-to-carlo.vercel.app'),

  ('22222222-2222-2222-2222-222222222044', '11111111-1111-1111-1111-111111111008',
   'Sebastian 12-Month Proposal', 'Long-term service proposal for Sebastian — 12-month roadmap and pricing',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222045', '11111111-1111-1111-1111-111111111008',
   'Sebastian Pricing Strategy', 'Pricing model and strategy document for Sebastian automation services',
   'deliverable', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222046', '11111111-1111-1111-1111-111111111008',
   'Sebastian Systems Architecture', 'Technical architecture document for WhatsApp + email + booking automation stack',
   'deliverable', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222047', '11111111-1111-1111-1111-111111111008',
   'Sebastian Tools Access Presentation', 'Presentation showing all tools and access points for Sebastian project',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222048', '11111111-1111-1111-1111-111111111008',
   'Sebastian Chatbot Demo', 'Demo chatbot for Sebastian — lead qualification and booking flow',
   'tool', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222049', '11111111-1111-1111-1111-111111111008',
   'Romanian AI Language Research', 'Research document on Romanian language AI capabilities for chatbot localization',
   'deliverable', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222050', '11111111-1111-1111-1111-111111111008',
   'WhatsApp Agents Build (3 systems)', 'WhatsApp qualification agent + nurturing agent + appointment agent — GHL + n8n backend',
   'deliverable', 'in_progress', NULL),

-- ============================================================
-- CANDYPAY / CANDY BROTHERS (sub-client of Prince) — Projects & Presentations
-- ============================================================

  ('22222222-2222-2222-2222-222222222051', '11111111-1111-1111-1111-111111111009',
   'CandyPay Alex Chatbot', 'AI lead qualification chatbot — 7-step flow, A/B/C scoring, 12 FAQs, Claude API, pink branding, contact capture, webhook-ready for GHL/n8n',
   'tool', 'completed', 'https://candypay-alex.vercel.app'),

  ('22222222-2222-2222-2222-222222222052', '11111111-1111-1111-1111-111111111009',
   'CandyPay Invoice Generator', 'Invoice automation app — matches CandyPay template (JUNO PAY LTD bank details + USDT wallets), split payment tracking, dashboard, print/PDF export',
   'tool', 'completed', 'https://candypay-invoices.vercel.app'),

  ('22222222-2222-2222-2222-222222222053', '11111111-1111-1111-1111-111111111009',
   'CandyPay Project Update (MadeEA branded)', '7-slide MadeEA DevKit-branded project update — 3-color system, glassmorphism, pill nav',
   'presentation', 'completed', 'https://candypay-madeea.vercel.app'),

  ('22222222-2222-2222-2222-222222222054', '11111111-1111-1111-1111-111111111009',
   'CandyPay Project Update (Day 2)', '8-slide Day 2 update — 8 deliverables complete, 2 live Vercel apps, 12 remaining blockers, sprint ahead of schedule',
   'presentation', 'completed', 'https://candypay-update-day2.vercel.app'),

  ('22222222-2222-2222-2222-222222222055', '11111111-1111-1111-1111-111111111009',
   'Knowledge Base + Glossary', 'CandyPay knowledge base and glossary for chatbot training and team reference',
   'deliverable', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222056', '11111111-1111-1111-1111-111111111009',
   'Brand Assets Package', 'CandyPay brand assets — colors, fonts, logo usage, templates',
   'brand_kit', 'completed', NULL),

-- ============================================================
-- ELOM (sub-client of Prince) — Projects
-- ============================================================

  ('22222222-2222-2222-2222-222222222057', '11111111-1111-1111-1111-111111111010',
   'Elom Web Application', 'Web application build for Elom — React/Vite with dist deployment',
   'deliverable', 'in_progress', NULL),

-- ============================================================
-- COLIN / ART OF DRAWERS (sub-client of Kyle) — Projects
-- ============================================================

  ('22222222-2222-2222-2222-222222222058', '11111111-1111-1111-1111-111111111011',
   'Follow-Up Automation System', 'GHL form → email+text → video → AI agent follow-up → booking (15-min call or 2-hr in-home estimate). 5 n8n workflows + 4 Supabase tables',
   'deliverable', 'in_progress', NULL),

  ('22222222-2222-2222-2222-222222222059', '11111111-1111-1111-1111-111111111011',
   'FAQs Document (30+ across 7 categories)', 'Generated FAQs covering products, pricing, process, materials, warranty, installation, and maintenance for Art of Drawers',
   'deliverable', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222060', '11111111-1111-1111-1111-111111111011',
   'Automation Build Plan', 'Detailed 5-day build schedule (Mar 18-22) for complete automation stack deployment',
   'deliverable', 'completed', NULL),

-- ============================================================
-- SOFTWASH PROS (sub-client of Kyle) — Projects
-- ============================================================

  ('22222222-2222-2222-2222-222222222061', '11111111-1111-1111-1111-111111111012',
   'Overflow Routing System', 'Lead overflow routing and delegation automation for Softwash Pros',
   'deliverable', 'in_progress', NULL),

  ('22222222-2222-2222-2222-222222222062', '11111111-1111-1111-1111-111111111012',
   'AI Receptionist', 'AI-powered receptionist system for Softwash Pros — call handling and lead qualification',
   'tool', 'in_progress', NULL),

-- ============================================================
-- WISE ABATEMENT (sub-client of Kyle) — Projects & Presentations
-- ============================================================

  ('22222222-2222-2222-2222-222222222063', '11111111-1111-1111-1111-111111111013',
   'Wise Abatement Presentation', 'Service presentation for Wise Abatement — AI automation capabilities overview',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222064', '11111111-1111-1111-1111-111111111013',
   'Wise Abatement Presentation v2', 'Updated service presentation with refined messaging and case studies',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222065', '11111111-1111-1111-1111-111111111013',
   'Disruptors Media Presentation (Wise Abatement)', 'Disruptors Media branded presentation for Wise Abatement partnership',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222066', '11111111-1111-1111-1111-111111111013',
   'Onboarding SOP Scripts', 'Standard operating procedure scripts for Wise Abatement client onboarding',
   'deliverable', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222067', '11111111-1111-1111-1111-111111111013',
   'Contractors Webinar', 'Webinar presentation targeting contractors in the abatement space',
   'presentation', 'completed', NULL),

-- ============================================================
-- CENEGENICS (sub-client of Kyle) — Projects & Presentations
-- ============================================================

  ('22222222-2222-2222-2222-222222222068', '11111111-1111-1111-1111-111111111014',
   'Cenegenics Proposal', 'AI automation proposal for Cenegenics — service scope and pricing',
   'presentation', 'completed', NULL),

  ('22222222-2222-2222-2222-222222222069', '11111111-1111-1111-1111-111111111014',
   'Cenegenics Landing Page', 'Landing page for Cenegenics AI automation services',
   'deliverable', 'completed', NULL)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  deliverable_url = EXCLUDED.deliverable_url,
  updated_at = now();
