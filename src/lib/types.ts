export type UserRole = "admin" | "member";
export type ClientStatus = "active" | "paused" | "inactive" | "archived";
export type ProjectStatus = "planned" | "in_progress" | "review" | "completed" | "on_hold";
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ContactStatus = "active" | "inactive" | "prospect";
export type AlertType = "decision_review" | "task_overdue" | "client_health" | "system" | "info";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type NotificationType = "task_assigned" | "task_overdue" | "client_health" | "report_ready" | "system" | "info";
export type ReportType = "morning_brief" | "client_report" | "employee_report" | "team_performance" | "delegation_dashboard";
export type LifecycleStage = "prospect" | "onboarding" | "active" | "at_risk" | "churned" | "paused";
export type CredentialType = "api_key" | "password" | "oauth_token" | "ssh_key" | "certificate" | "other";
export type KnowledgeCategory = "general" | "technical" | "brand" | "process" | "credentials_ref" | "notes";
export type ClientEventType = "stage_change" | "health_change" | "note" | "meeting" | "milestone" | "issue" | "renewal";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  active_dev_kit_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  status: ClientStatus;
  health_score: number;
  notes: string | null;
  knowledge_base: Record<string, string>;
  lifecycle_stage: LifecycleStage;
  onboarded_at: string | null;
  churned_at: string | null;
  next_review_date: string | null;
  monthly_value: number;
  parent_client_id: string | null;
  parent_client?: Client;
  sub_clients?: Client[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectType = "deliverable" | "presentation" | "tool" | "report" | "brand_kit";

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  type: ProjectType;
  deliverable_url: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  client_id: string | null;
  project_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  company: string | null;
  email: string | null;
  status: ContactStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactTask {
  id: string;
  contact_id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string | null;
  severity: AlertSeverity;
  entity_type: string | null;
  entity_id: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DevKit {
  id: string;
  name: string;
  client_id: string | null;
  color_primary: string;
  color_accent: string;
  color_background: string;
  color_surface: string;
  color_text: string;
  font_heading: string;
  font_body: string;
  logo_url: string | null;
  tokens_json: Record<string, string>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  parameters: Record<string, unknown>;
  html_content: string | null;
  dev_kit_id: string | null;
  generated_by: string | null;
  vercel_url: string | null;
  created_at: string;
}

export interface Credential {
  id: string;
  client_id: string;
  label: string;
  credential_type: CredentialType;
  masked_value: string;
  username: string | null;
  url: string | null;
  notes: string | null;
  last_rotated_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDoc {
  id: string;
  client_id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  is_pinned: boolean;
  knowledge_attachments?: KnowledgeAttachment[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeAttachment {
  id: string;
  doc_id: string;
  client_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface ClientEvent {
  id: string;
  client_id: string;
  event_type: ClientEventType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  profiles?: { name: string } | null;
  created_at: string;
}
