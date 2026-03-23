import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Vercel deployments to seed as resources
const DEPLOYMENTS = [
  { url: "https://deploy-followup-intake.vercel.app", title: "Follow-Up System Intake Form", client: "Kyle Painter", description: "Generalized intake form for follow-up system clients (GHL + n8n + Supabase + OpenAI credentials setup)", type: "tool", date: "2026-03-16", source: "Clients/Kyle Painter/Kyle 101/Deliverables/Follow-Up-System-Intake-Form.html" },
  { url: "https://presto-cleaning-delegation.vercel.app", title: "Presto Cleaning Delegation Page", client: "Thomas Rummel", description: "Delegation page for Presto Cleaning project (managed by Jamil)", type: "deliverable", date: "2026-03-16", source: "Employees/JAMIL/Presto Cleaning - Task Assignment.md" },
  { url: "https://bryan-meeting-mar10.vercel.app", title: "Bryan Meeting Report (Mar 10)", client: "Prince Andam", description: "Demo deployment of Bryan Meetings-to-HTML skill with action items tracking", type: "meeting_note", date: "2026-03-10", source: "Clients/Prince Andam/Skills/README.md" },
  { url: "https://bryan-meeting-mar10-2026.vercel.app", title: "Bryan Meeting Report v2 (Mar 10)", client: "Prince Andam", description: "Updated meeting report with Sumait AI branding and metrics dashboard and Fathom integration", type: "meeting_note", date: "2026-03-10", source: "Clients/Prince Andam/Skills/demo-output/DEPLOY.md" },
  { url: "https://bryan-meetings-dashboard.vercel.app", title: "Bryan Meetings Dashboard", client: "Prince Andam", description: "Meeting reports dashboard with filtering and analytics", type: "tool", date: "2026-03-10", source: "Clients/Prince Andam/Skills/demo-dashboard/README.md" },
  { url: "https://kc-intake-form.vercel.app", title: "KC Stripe Invoice Intake Form", client: "Joshua Kokoumi", description: "Intake form for Stripe Invoice implementation project", type: "tool", date: "2026-03-15", source: "Clients/Joshua Kokoumi/Joshua X AG/KC-Project/KC_Stripe_Invoice_Implementation_Blueprint.md" },
  { url: "https://disruptors-calculator.vercel.app", title: "Sales Infrastructure Calculator v7", client: "Kyle Painter", description: "5-tier pricing calculator ($1.5K-$12K) with $3K setup fee and B2B/B2C toggle", type: "tool", date: "2026-03-17", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-17/sales-infrastructure-calculator-v7.html" },
  { url: "https://vercel-intake-form-v2.vercel.app", title: "Follow-Up System Intake Form v2", client: "Kyle Painter", description: "Updated intake form with A2P messaging registration + business registration + website access sections", type: "tool", date: "2026-03-17", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-17/Follow-Up-System-Intake-Form-v2.html" },
  { url: "https://vercel-workflow-flowcharts.vercel.app", title: "Workflow Flowcharts (8 systems)", client: "Kyle Painter", description: "Interactive flowcharts for all 8 automation workflows (lead follow-up through prompt playground)", type: "deliverable", date: "2026-03-17", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-17/workflow-flowcharts/index.html" },
  { url: "https://vercel-templates-wine.vercel.app", title: "Disruptors Templates Hub (11 genericized)", client: "Kyle Painter", description: "Genericized templates: 5 onboarding pieces + 4 build guides + 2 sales/pricing docs", type: "deliverable", date: "2026-03-17", source: "Clients/Kyle Painter/Kyle 101/Projects/vercel-templates/index.html" },
  { url: "https://disruptors-credential-form.vercel.app", title: "Client Setup Form (8-step)", client: "Kyle Painter", description: "8-step credential setup guide with A2P/10DLC registration", type: "tool", date: "2026-03-17", source: "Clients/Kyle Painter/Kyle 101/Projects/vercel-setup-form/index.html" },
  { url: "https://sumait-task-delegation.vercel.app", title: "Task Delegation Dashboard", client: "Internal", description: "CSM/PM dashboard showing all employee tasks with priorities, subtasks, progress tracking", type: "tool", date: "2026-03-17", source: "Employees/dashboard/index.html" },
  { url: "https://sumait-reports.vercel.app", title: "Team Status Reports", client: "Internal", description: "SUMAIT-branded daily team status report with executive summary, task breakdown, client matrix", type: "report", date: "2026-03-17", source: "Employees/reports/2026-03-17-report.html" },
  { url: "https://disruptors-webinar.vercel.app", title: "Disruptors Media Webinar", client: "Kyle Painter", description: "22-slide webinar presentation using Allan Miles 7-Step VSL framework", type: "presentation", date: "2026-03-17", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-17/disruptors-media-webinar.html" },
  { url: "https://disruptors-webinar-v2.vercel.app", title: "Disruptors Media Webinar v2 (Full Package)", client: "Kyle Painter", description: "24-slide webinar combining AI Sales Infrastructure + Full-Service Marketing", type: "presentation", date: "2026-03-17", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-17/disruptors-media-webinar-v2.html" },
  { url: "https://sumait-thumbnail-pipeline.vercel.app", title: "Thumbnail Pipeline Flowchart", client: "Internal", description: "Workflow flowchart showing thumbnail generation pipeline across all 14 teams", type: "deliverable", date: "2026-03-17", source: "SUPER AI AGENTS TEAM/thumbnail-pipeline-flowchart.html" },
  { url: "https://kyle-reporting-0317.vercel.app", title: "Kyle Daily Report (Mar 17)", client: "Kyle Painter", description: "Daily deliverables report — 13 items including calculator, intake form, flowcharts, templates", type: "report", date: "2026-03-18", source: "Clients/Kyle Painter/Kyle 101/Reports/kyle-reporting-0317/index.html" },
  { url: "https://disruptors-client-journey.vercel.app", title: "Client Journey Timeline", client: "Kyle Painter", description: "6-step overview + detailed day-by-day breakdown for March 24 webinar", type: "presentation", date: "2026-03-18", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-18/client-journey-timeline.html" },
  { url: "https://disruptors-marketing-hub.vercel.app", title: "Marketing Services Hub", client: "Kyle Painter", description: "Card-based hub for 6 marketing services with modal detail views", type: "deliverable", date: "2026-03-18", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-18/marketing-services-hub.html" },
  { url: "https://disruptors-workflow-simplified.vercel.app", title: "Simplified Workflow Flowcharts", client: "Kyle Painter", description: "8 clean visual flowcharts for business owners — simplified versions of all automation workflows", type: "deliverable", date: "2026-03-18", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-18/simplified-workflow-flowcharts.html" },
  { url: "https://disruptors-client-portal.vercel.app", title: "Client Feedback Portal", client: "Kyle Painter", description: "8-workflow client portal with editable message templates and feedback form", type: "tool", date: "2026-03-18", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-18/client-feedback-portal.html" },
  { url: "https://vercel-deploy-temp-six.vercel.app", title: "Prince Meeting Report (Mar 18)", client: "Prince Andam", description: "Meeting summary — 15 action items, 14 verbatim quotes, 10 topics", type: "meeting_note", date: "2026-03-18", source: "Clients/Prince Andam/Meeting-Notes/Prince MEETING MARCH 18.html" },
  { url: "https://prince-brand-strategy.vercel.app", title: "Personal Brand Growth Strategy 2026", client: "Prince Andam", description: "10-section strategic plan with competitor analysis, platform strategy, 90-day roadmap", type: "deliverable", date: "2026-03-18", source: "Clients/Prince Andam/Content-Strategy/Prince-Personal-Brand-Strategy-2026.html" },
  { url: "https://reports-roan-nine.vercel.app", title: "Morning Brief (Mar 19)", client: "Internal", description: "Morning brief — client dashboard, alerts, recommended actions, task delegation draft", type: "report", date: "2026-03-19", source: "BRYAN SUMAIT/14-csm-team/reports/morning-brief-2026-03-19.html" },
  { url: "https://sumait-command-center.vercel.app", title: "SUMAIT Command Center", client: "Internal", description: "Dashboard + auth + clients + team + reports + dev kits + alerts + tasks + notifications + calendar + campaigns", type: "tool", date: "2026-03-19", source: "sumait-command-center/" },
  { url: "https://outreach-agent-iota.vercel.app", title: "Disruptors Outreach Agent v2", client: "Kyle Painter", description: "AI-powered personalized outreach agent — Claude API + web search, cold email + LinkedIn DM generator", type: "tool", date: "2026-03-19", source: "Clients/Kyle Painter/outreach-agent/index.html" },
  { url: "https://sebastian-status.vercel.app", title: "Sebastian Project Status Update", client: "Prince Andam", description: "Build status presentation — intake form received, backend in progress, 5 blockers", type: "presentation", date: "2026-03-19", source: "Clients/Prince Andam/Clients/Sebastian/Sebastian-Progress-Update-2026-03-19.html" },
  { url: "https://infra-scripts.vercel.app", title: "InfraScripts", client: "Kyle Painter", description: "Consolidated hub — 10 video scripts, HeyGen copy-paste tool, auto-submit script, B-roll shot list", type: "deliverable", date: "2026-03-19", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-19/infra-scripts/index.html" },
  { url: "https://delegate-to-carlo.vercel.app", title: "Delegate to Carlo — Sebastian Project", client: "Prince Andam", description: "Delegation brief for Carlo — 8 tasks covering WhatsApp agents, email sequences, knowledge base", type: "deliverable", date: "2026-03-19", source: "Clients/Prince Andam/Clients/Sebastian/delegate-to-carlo.html" },
  { url: "https://juan-meeting-mar19.vercel.app", title: "Juan Meeting Report (Mar 19)", client: "Juan Martinez", description: "86-min meeting summary — 15 action items, onboarding agent fixes, NNAN workflow", type: "meeting_note", date: "2026-03-19", source: "Clients/Juan Martinez/Meeting-Notes/Juan MEETING MARCH 19.html" },
  { url: "https://candypay-madeea.vercel.app", title: "CandyPay Project Update (MadeEA)", client: "Prince Andam", description: "MadeEA DevKit-branded project update — 3-color system, glassmorphism, pill nav", type: "presentation", date: "2026-03-20", source: "Clients/Prince Andam/Meeting-Notes/Client-CandyPay/Presentations/project-update-2026-03-19.html" },
  { url: "https://kyle-meeting-mar20.vercel.app", title: "Kyle Meeting Report (Mar 20)", client: "Kyle Painter", description: "134-min meeting summary — 25 action items, School Infra walkthrough, Outreach Agent demo", type: "meeting_note", date: "2026-03-20", source: "Clients/Kyle Painter/Meeting-Notes/Notes/Kyle MEETING MARCH 20.html" },
  { url: "https://disruptors-webinar-full.vercel.app", title: "Disruptors Webinar Full (81 slides)", client: "Kyle Painter", description: "Full webinar — 77 Canva slides + 4 custom HTML risk reversal slides", type: "presentation", date: "2026-03-20", source: "Clients/Kyle Painter/Kyle 101/Deliverables/2026-03-20/deploy/index.html" },
  { url: "https://deploy-kyle-mar18.vercel.app", title: "Kyle Meeting Report (Mar 18)", client: "Kyle Painter", description: "Transcript analyzer report — Kyle x Bryan x Tyler meeting March 18", type: "meeting_note", date: "2026-03-20", source: "Clients/Kyle Painter/Meeting-Notes/Reports/KYLE X BRYAN X TYLER MEETING MARCH 18.html" },
  { url: "https://deploy-kyle-mar19.vercel.app", title: "Kyle Meeting Report (Mar 19)", client: "Kyle Painter", description: "Transcript analyzer report — Bryan x Tyler x Kyle meeting March 19", type: "meeting_note", date: "2026-03-20", source: "Clients/Kyle Painter/Meeting-Notes/Reports/Bryan X Tyler X Kyle MEETING MARCH 19.html" },
  { url: "https://candypay-alex.vercel.app", title: "CandyPay Alex Chatbot", client: "Prince Andam", description: "AI lead qualification chatbot — 7-step flow, A/B/C scoring, 12 FAQs, Claude API", type: "tool", date: "2026-03-20", source: "Clients/Prince Andam/Clients/Candy-Brothers/chatbot-alex/index.html" },
  { url: "https://candypay-invoices.vercel.app", title: "CandyPay Invoice Generator", client: "Prince Andam", description: "Invoice automation app — split payment tracking, dashboard, print/PDF export", type: "tool", date: "2026-03-20", source: "Clients/Prince Andam/Clients/Candy-Brothers/invoice-app/index.html" },
  { url: "https://madeea-ai-infra.vercel.app", title: "Madeea.ai Infra", client: "Prince Andam", description: "Lead Automation System rebranded to Madeea.ai — Ion Blue dark premium theme", type: "tool", date: "2026-03-20", source: "Clients/Prince Andam/Madeea.ai Infra/" },
  { url: "https://candypay-update-day2.vercel.app", title: "CandyPay Project Update (Day 2)", client: "Prince Andam", description: "Day 2 update — 8 deliverables complete, 2 live Vercel apps, 12 remaining blockers", type: "presentation", date: "2026-03-20", source: "Clients/Prince Andam/Meeting-Notes/Client-CandyPay/Presentations/project-update-2026-03-20.html" },
  { url: "https://joel-qa-tool-stack.vercel.app/madeea-full-tool-stack-2026-03-20.html", title: "MadeEA Full Tool Stack (QA Review)", client: "Internal", description: "Complete tool stack document — 15 teams, 47 agents, 1100+ skills, 70+ integrations", type: "document", date: "2026-03-20", source: "Employees/Joel Nicser/QA-Review/madeea-full-tool-stack-2026-03-20.html" },
  { url: "https://carlo-claude-code-day1.vercel.app", title: "Claude Code Day 1 Training", client: "Internal", description: "Day 1 of 7-day Claude Code Mastery program — foundations, core tools, hands-on exercises", type: "document", date: "2026-03-21", source: "Employees/CARLO/Claude-Code-Training/day-1-foundations.html" },
  { url: "https://disruptors-infra-skool.vercel.app", title: "Disruptors Infra Skool", client: "Kyle Painter", description: "Skool-style client onboarding platform — 13 modules, progressive unlock, visual flowcharts", type: "tool", date: "2026-03-21", source: "Clients/Kyle Painter/Disruptors Infra Skool/" },
  { url: "https://vercel-templates-wine.vercel.app/marketing-services/", title: "Marketing Services Hub (9 services)", client: "Kyle Painter", description: "9 marketing services with real pricing from Kyle's Loom — SEO, Meta Ads, Google Ads, Cold Email, LinkedIn", type: "deliverable", date: "2026-03-21", source: "Clients/Kyle Painter/Kyle 101/Projects/vercel-templates/marketing-services/index.html" },
  { url: "https://vercel-templates-wine.vercel.app/heygen-classroom-scripts.html", title: "HeyGen Classroom Scripts Copy-Paste", client: "Kyle Painter", description: "20 classroom video scripts for HeyGen generation — color-coded, copy-to-clipboard", type: "deliverable", date: "2026-03-21", source: "Clients/Kyle Painter/Kyle 101/Projects/vercel-templates/heygen-classroom-scripts.html" },
  { url: "https://deploy-two-roan.vercel.app", title: "SUMAIT Finance Report (March 2026)", client: "Internal", description: "Finance dashboard — income, expenses, net profit, cash flow projection, revenue concentration", type: "report", date: "2026-03-21", source: "SUPER AI AGENTS TEAM/17-finance-team/reports/finance-report-2026-03-21.html" },
];

export async function POST() {
  // Verify caller is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Get all clients to map names to IDs
  const { data: clients } = await admin.from("clients").select("id, name");
  const clientMap: Record<string, string> = {};
  for (const c of clients ?? []) {
    clientMap[c.name.toLowerCase()] = c.id;
  }

  // Check existing resources to avoid duplicates
  const { data: existing } = await admin.from("client_resources").select("url");
  const existingUrls = new Set((existing ?? []).map((r: { url: string }) => r.url));

  const toInsert = DEPLOYMENTS
    .filter((d) => !existingUrls.has(d.url))
    .map((d) => {
      const clientName = d.client.toLowerCase();
      // Try exact match first, then partial
      const clientId = clientMap[clientName]
        ?? Object.entries(clientMap).find(([k]) => clientName.includes(k.toLowerCase()))?.[1]
        ?? null;

      return {
        client_id: clientId,
        title: d.title,
        description: d.description,
        url: d.url,
        resource_type: d.type as string,
        status: "live",
        deploy_date: d.date,
        source_file: d.source,
        created_by: user.id,
      };
    });

  if (toInsert.length === 0) {
    return NextResponse.json({ message: "No new resources to seed", inserted: 0 });
  }

  const { error } = await admin.from("client_resources").insert(toInsert);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Seeded ${toInsert.length} resources`,
    inserted: toInsert.length,
    skipped: DEPLOYMENTS.length - toInsert.length,
  });
}
