export const CLIENT_STATUSES = ["active", "paused", "inactive", "archived"] as const;
export const PROJECT_STATUSES = ["planned", "in_progress", "review", "completed", "on_hold"] as const;
export const TASK_STATUSES = ["pending", "in_progress", "completed", "blocked"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const CONTACT_STATUSES = ["active", "inactive", "prospect"] as const;
export const REPORT_TYPES = ["morning_brief", "client_report", "employee_report", "team_performance", "delegation_dashboard"] as const;

export const REPORT_TYPE_LABELS: Record<string, string> = {
  morning_brief: "Morning Brief",
  client_report: "Client Report",
  employee_report: "Employee Report",
  team_performance: "Team Performance",
  delegation_dashboard: "Delegation Dashboard",
};

export const STATUS_VARIANTS: Record<string, "active" | "warning" | "danger" | "info" | "neutral"> = {
  active: "active",
  paused: "warning",
  inactive: "neutral",
  archived: "neutral",
  planned: "info",
  in_progress: "active",
  review: "warning",
  completed: "active",
  on_hold: "neutral",
  pending: "info",
  blocked: "danger",
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "danger",
  prospect: "info",
};

export const PROJECT_TYPES = ["deliverable", "presentation", "tool", "report", "brand_kit"] as const;

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  deliverable: "Deliverable",
  presentation: "Presentation",
  tool: "Tool",
  report: "Report",
  brand_kit: "Brand Kit",
};

export const PROJECT_TYPE_VARIANTS: Record<string, "active" | "warning" | "danger" | "info" | "neutral"> = {
  deliverable: "active",
  presentation: "info",
  tool: "warning",
  report: "neutral",
  brand_kit: "info",
};

export const WORKLOAD_THRESHOLDS = { green: 3, yellow: 6 } as const;

export const COMMENT_TYPES = ["comment", "question", "blocker"] as const;
export const COMMENT_TYPE_LABELS: Record<string, string> = {
  comment: "Comment",
  question: "Question",
  blocker: "Blocker",
};
export const REPORT_ITEM_TYPES = ["completed", "pending", "blocker"] as const;
export const REPORT_STATUSES = ["draft", "approved", "deployed"] as const;
