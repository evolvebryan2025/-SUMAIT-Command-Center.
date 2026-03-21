import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { html, title } = await request.json();

  if (!html || !title) {
    return NextResponse.json({ error: "Missing html or title" }, { status: 400 });
  }

  const projectName = title
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const vercelToken = process.env.VERCEL_DEPLOY_TOKEN;

  if (!vercelToken) {
    return NextResponse.json({
      error: "VERCEL_DEPLOY_TOKEN not configured.",
      fallback: true,
    }, { status: 400 });
  }

  const h = headers(vercelToken);

  try {
    // Step 1: Ensure project exists and has protection disabled BEFORE deploying
    let projectId: string | null = null;

    // Try to get existing project
    const getRes = await fetch(`https://api.vercel.com/v9/projects/${projectName}`, {
      headers: h,
    });

    if (getRes.ok) {
      const proj = await getRes.json();
      projectId = proj.id;
    } else {
      // Create new project
      const createRes = await fetch("https://api.vercel.com/v10/projects", {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          name: projectName,
          framework: null,
        }),
      });
      if (createRes.ok) {
        const proj = await createRes.json();
        projectId = proj.id;
      }
    }

    // Disable Deployment Protection on the project before deploying
    if (projectId) {
      await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
        method: "PATCH",
        headers: h,
        body: JSON.stringify({
          ssoProtection: null,
          passwordProtection: null,
          vercelAuthentication: { deploymentType: "none" },
        }),
      });
    }

    // Step 2: Deploy files to the project
    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        name: projectName,
        files: [
          {
            file: "index.html",
            data: Buffer.from(html).toString("base64"),
            encoding: "base64",
          },
        ],
        target: "production",
        projectSettings: {
          framework: null,
        },
      }),
    });

    const deployData = await deployRes.json();

    if (!deployRes.ok) {
      return NextResponse.json(
        { error: deployData.error?.message || "Vercel deployment failed" },
        { status: 500 }
      );
    }

    // Use the production alias (project-name.vercel.app) instead of unique deployment URL
    const url = `https://${projectName}.vercel.app`;

    logActivity(supabase, "report_deployed", "generated_report", deployData.id, { url }).catch(console.error);

    return NextResponse.json({ url, id: deployData.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Deploy failed" },
      { status: 500 }
    );
  }
}
