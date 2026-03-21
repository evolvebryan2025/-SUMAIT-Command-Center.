/**
 * SUMAIT Command Center — Data Seeding Script
 *
 * Seeds the Supabase database with:
 * - 5 dev kits (SUMAIT AI, Madeea.ai, MadeEA, Prince.n, Disruptors MEDIA)
 * - 6 employees (Bryan as admin + 5 team members)
 * - 7 clients with projects
 *
 * Usage: npx tsx scripts/seed.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === "your-service-role-key-here") {
  console.error("ERROR: Set SUPABASE_SERVICE_ROLE_KEY in .env.local before running seed.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ═══════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════

const devKits = [
  {
    name: "SUMAIT AI",
    color_primary: "#ef4444",
    color_accent: "#f87171",
    color_background: "#0a0a0a",
    color_surface: "#111111",
    color_text: "#ffffff",
    font_heading: "Outfit",
    font_body: "Inter",
    is_default: true,
  },
  {
    name: "Madeea.ai",
    color_primary: "#3b82f6",
    color_accent: "#60a5fa",
    color_background: "#0a0a0f",
    color_surface: "#111111",
    color_text: "#ffffff",
    font_heading: "Space Grotesk",
    font_body: "Inter",
    is_default: false,
  },
  {
    name: "MadeEA",
    color_primary: "#FD5811",
    color_accent: "#FF7A3F",
    color_background: "#0a0a0a",
    color_surface: "#111111",
    color_text: "#ffffff",
    font_heading: "Inter",
    font_body: "Inter",
    is_default: false,
  },
  {
    name: "Prince.n",
    color_primary: "#a855f7",
    color_accent: "#c084fc",
    color_background: "#09090B",
    color_surface: "#0F0F15",
    color_text: "#ffffff",
    font_heading: "Syne",
    font_body: "Inter",
    is_default: false,
  },
  {
    name: "Disruptors MEDIA",
    color_primary: "#C9A84C",
    color_accent: "#D4B970",
    color_background: "#050505",
    color_surface: "#0C0C0C",
    color_text: "#F0EDE6",
    font_heading: "Instrument Serif",
    font_body: "Outfit",
    is_default: false,
  },
];

const employees = [
  { name: "Bryan Sumait", email: "bryansumait.automate@gmail.com", role: "admin" },
  { name: "Adam", email: "adam@sumait.ai", role: "member" },
  { name: "Jamil", email: "jamil@sumait.ai", role: "member" },
  { name: "John", email: "john@sumait.ai", role: "member" },
  { name: "Lee", email: "lee@sumait.ai", role: "member" },
  { name: "Vee", email: "vee@sumait.ai", role: "member" },
];

const clients = [
  {
    name: "Kyle Painter",
    company: "Disruptors Media",
    email: "kyle@disruptorsmedia.com",
    status: "active",
    health_score: 85,
    notes: "Runs Disruptors Media. Bryan builds automation systems for Kyle's clients. Retainer: $1,250/pay cycle.",
    projects: [
      { name: "Follow-Up System", status: "in_progress", description: "Generalized follow-up automation: GHL + n8n + Supabase + OpenAI" },
      { name: "Sales Infrastructure", status: "in_progress", description: "Skool-style interface v2.0 for client-facing workflow views" },
      { name: "Webinar Funnel", status: "planned", description: "Webinar launch targeting service businesses $35k+/month" },
    ],
  },
  {
    name: "Prince Acquah Andam",
    company: "MadeEA / meda.ai",
    email: "prince@madeea.com",
    status: "active",
    health_score: 90,
    notes: "CEO / Co-founder. Based in UK. Leading business development and strategic direction.",
    projects: [
      { name: "Dubai CRM", status: "in_progress", description: "CRM development for Dubai operations" },
      { name: "Personal Brand", status: "in_progress", description: "LinkedIn content strategy and personal branding" },
    ],
  },
  {
    name: "Sebastian Ionescu",
    company: "CandyPay",
    email: "sebastian@candypay.io",
    status: "active",
    health_score: 65,
    notes: "Romanian client. 10-day sprint delivery. Payment complete.",
    projects: [
      { name: "CandyPay Automation", status: "in_progress", description: "KB + GHL + WhatsApp System build" },
    ],
  },
  {
    name: "Danny & James",
    company: "MadeEA Client",
    email: null,
    status: "active",
    health_score: 70,
    notes: "First MadeEA.com client. Onboarded EA (Tessa). Two weeks in.",
    projects: [
      { name: "EA Onboarding", status: "in_progress", description: "Delegation hub + automation hub setup" },
    ],
  },
  {
    name: "Thomas Rummel",
    company: "Presto Cleaning",
    email: null,
    status: "active",
    health_score: 60,
    notes: "Email campaign setup Phases 1-2.",
    projects: [
      { name: "Email Campaign", status: "in_progress", description: "Presto Cleaning email campaign automation" },
    ],
  },
  {
    name: "Juan Martinez",
    company: null,
    email: null,
    status: "active",
    health_score: 55,
    notes: "GHL sub-account creation and AI agent deployment.",
    projects: [
      { name: "GHL Sub-Account", status: "in_progress", description: "Sub-account creation + AI agent deployment" },
    ],
  },
  {
    name: "CandyPay Brothers",
    company: "CandyPay",
    email: null,
    status: "paused",
    health_score: 40,
    notes: "Chatbot build project. BLOCKED waiting on intake form.",
    projects: [
      { name: "Chatbot Build", status: "on_hold", description: "Chatbot + automated invoicing. Waiting on intake form." },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function seedDevKits() {
  console.log("Seeding dev kits...");

  // Clear existing
  await supabase.from("dev_kits").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const { data, error } = await supabase.from("dev_kits").insert(devKits).select();
  if (error) {
    console.error("Failed to seed dev kits:", error.message);
    return [];
  }
  console.log(`  Inserted ${data.length} dev kits`);
  return data;
}

async function seedEmployees() {
  console.log("Seeding employees...");
  const profileIds: Record<string, string> = {};

  for (const emp of employees) {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === emp.email);

    let userId: string;

    if (existing) {
      console.log(`  User ${emp.email} already exists, skipping auth creation`);
      userId = existing.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: emp.email,
        email_confirm: true,
        password: `sumait-temp-${Date.now()}`,
        user_metadata: { name: emp.name, role: emp.role },
      });

      if (error) {
        console.error(`  Failed to create auth user ${emp.email}:`, error.message);
        continue;
      }
      userId = data.user.id;
      console.log(`  Created auth user: ${emp.email}`);
    }

    profileIds[emp.name] = userId;

    // Upsert profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      is_active: true,
    });

    if (profileError) {
      console.error(`  Failed to upsert profile for ${emp.name}:`, profileError.message);
    }
  }

  console.log(`  ${Object.keys(profileIds).length} employees ready`);
  return profileIds;
}

async function seedClients(profileIds: Record<string, string>, devKitData: Array<{ id: string; name: string }>) {
  console.log("Seeding clients...");

  // Clear existing clients (cascades to projects, tasks, contacts)
  await supabase.from("clients").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const bryanId = profileIds["Bryan Sumait"];

  // Map clients to dev kits where applicable
  const clientDevKitMap: Record<string, string> = {
    "Kyle Painter": "Disruptors MEDIA",
    "Prince Acquah Andam": "Prince.n",
  };

  for (const client of clients) {
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: client.name,
        company: client.company,
        email: client.email,
        status: client.status,
        health_score: client.health_score,
        notes: client.notes,
        knowledge_base: {},
        created_by: bryanId,
      })
      .select()
      .single();

    if (clientError) {
      console.error(`  Failed to insert client ${client.name}:`, clientError.message);
      continue;
    }

    console.log(`  Inserted client: ${client.name}`);

    // Link dev kit to client if applicable
    const devKitName = clientDevKitMap[client.name];
    if (devKitName) {
      const kit = devKitData.find((k) => k.name === devKitName);
      if (kit) {
        await supabase.from("dev_kits").update({ client_id: clientData.id }).eq("id", kit.id);
      }
    }

    // Insert projects
    for (const project of client.projects) {
      const { error: projError } = await supabase.from("projects").insert({
        client_id: clientData.id,
        name: project.name,
        status: project.status,
        description: project.description,
      });

      if (projError) {
        console.error(`    Failed to insert project ${project.name}:`, projError.message);
      }
    }

    // Add a sample task for each active client
    if (client.status === "active") {
      const assignees = Object.values(profileIds);
      const randomAssignee = assignees[Math.floor(Math.random() * assignees.length)];

      await supabase.from("tasks").insert({
        title: `Follow up with ${client.name}`,
        description: `Regular check-in and progress update for ${client.company || client.name}`,
        status: "pending",
        priority: client.health_score < 60 ? "high" : "medium",
        assigned_to: randomAssignee,
        client_id: clientData.id,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        created_by: bryanId,
      });
    }
  }

  console.log("  Clients seeded with projects and sample tasks");
}

async function seedActivityLog(profileIds: Record<string, string>) {
  console.log("Seeding activity log...");

  const bryanId = profileIds["Bryan Sumait"];
  if (!bryanId) return;

  const activities = [
    { action: "Created command center project", entity_type: "system", metadata: { detail: "Phase 1 initiated" } },
    { action: "Added Kyle Painter as client", entity_type: "client", metadata: { client: "Kyle Painter" } },
    { action: "Added Prince Andam as client", entity_type: "client", metadata: { client: "Prince Andam" } },
    { action: "Configured SUMAIT AI dev kit", entity_type: "dev_kit", metadata: { kit: "SUMAIT AI" } },
    { action: "Configured Disruptors MEDIA dev kit", entity_type: "dev_kit", metadata: { kit: "Disruptors MEDIA" } },
  ];

  for (const activity of activities) {
    await supabase.from("activity_log").insert({
      user_id: bryanId,
      ...activity,
    });
  }

  console.log(`  Inserted ${activities.length} activity entries`);
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("SUMAIT Command Center — Data Seeder");
  console.log("═══════════════════════════════════════════\n");

  const devKitData = await seedDevKits();
  const profileIds = await seedEmployees();
  await seedClients(profileIds, devKitData);
  await seedActivityLog(profileIds);

  console.log("\n═══════════════════════════════════════════");
  console.log("Seeding complete!");
  console.log("═══════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
