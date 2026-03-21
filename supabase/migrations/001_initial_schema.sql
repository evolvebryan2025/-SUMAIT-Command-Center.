-- ═══════════════════════════════════════════════════════════
-- SUMAIT Command Center — Initial Schema
-- ═══════════════════════════════════════════════════════════

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  active_dev_kit_id uuid,
  updated_at timestamptz default now()
);

-- Auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  status text not null default 'active' check (status in ('active', 'paused', 'inactive', 'archived')),
  health_score integer default 100 check (health_score between 0 and 100),
  notes text,
  knowledge_base jsonb default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  description text,
  status text not null default 'in_progress' check (status in ('planned', 'in_progress', 'review', 'completed', 'on_hold')),
  deliverable_url text,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'blocked')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references public.profiles(id),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Client Contacts (client's clients)
create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  company text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive', 'prospect')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contact Tasks
create table public.contact_tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.client_contacts(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'blocked')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references public.profiles(id),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Alerts
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('decision_review', 'task_overdue', 'client_health', 'system', 'info')),
  title text not null,
  message text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  entity_type text,
  entity_id uuid,
  is_resolved boolean default false,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Activity Log
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Dev Kits
create table public.dev_kits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.clients(id) on delete set null,
  color_primary text not null default '#ef4444',
  color_accent text not null default '#f87171',
  color_background text not null default '#0a0a0a',
  color_surface text not null default '#141414',
  color_text text not null default '#ffffff',
  font_heading text not null default 'Outfit',
  font_body text not null default 'Inter',
  logo_url text,
  tokens_json jsonb default '{}',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Generated Reports
create table public.generated_reports (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('morning_brief', 'client_report', 'employee_report', 'team_performance', 'delegation_dashboard')),
  title text not null,
  parameters jsonb not null default '{}',
  html_content text,
  dev_kit_id uuid references public.dev_kits(id),
  generated_by uuid references public.profiles(id),
  vercel_url text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.client_contacts enable row level security;
alter table public.contact_tasks enable row level security;
alter table public.alerts enable row level security;
alter table public.activity_log enable row level security;
alter table public.dev_kits enable row level security;
alter table public.generated_reports enable row level security;

-- Helper function: check if user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Profiles: users can read all active profiles, update own
create policy "Anyone can read active profiles" on public.profiles for select using (is_active = true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can update any profile" on public.profiles for update using (is_admin());
create policy "Admins can insert profiles" on public.profiles for insert with check (is_admin());

-- Clients: admins full access, members read only
create policy "Anyone authenticated can read clients" on public.clients for select using (auth.uid() is not null);
create policy "Admins can insert clients" on public.clients for insert with check (is_admin());
create policy "Admins can update clients" on public.clients for update using (is_admin());
create policy "Admins can delete clients" on public.clients for delete using (is_admin());

-- Projects: same as clients
create policy "Anyone authenticated can read projects" on public.projects for select using (auth.uid() is not null);
create policy "Admins can manage projects" on public.projects for all using (is_admin());

-- Tasks: members can read assigned, admins all. Members can update assigned task status.
create policy "Admins can manage all tasks" on public.tasks for all using (is_admin());
create policy "Members can read assigned tasks" on public.tasks for select using (assigned_to = auth.uid());
create policy "Members can update assigned tasks" on public.tasks for update using (assigned_to = auth.uid());

-- Client Contacts: same as clients
create policy "Anyone authenticated can read contacts" on public.client_contacts for select using (auth.uid() is not null);
create policy "Admins can manage contacts" on public.client_contacts for all using (is_admin());

-- Contact Tasks: same as tasks
create policy "Admins can manage all contact tasks" on public.contact_tasks for all using (is_admin());
create policy "Members can read assigned contact tasks" on public.contact_tasks for select using (assigned_to = auth.uid());
create policy "Members can update assigned contact tasks" on public.contact_tasks for update using (assigned_to = auth.uid());

-- Alerts: admins manage, all read
create policy "Anyone authenticated can read alerts" on public.alerts for select using (auth.uid() is not null);
create policy "Admins can manage alerts" on public.alerts for all using (is_admin());

-- Activity Log: all read, system writes
create policy "Anyone authenticated can read activity" on public.activity_log for select using (auth.uid() is not null);
create policy "Anyone authenticated can insert activity" on public.activity_log for insert with check (auth.uid() is not null);

-- Dev Kits: all read, admins manage
create policy "Anyone authenticated can read dev kits" on public.dev_kits for select using (auth.uid() is not null);
create policy "Admins can manage dev kits" on public.dev_kits for all using (is_admin());

-- Generated Reports: all read own, admins all
create policy "Admins can manage all reports" on public.generated_reports for all using (is_admin());
create policy "Users can read own reports" on public.generated_reports for select using (generated_by = auth.uid());
create policy "Users can create reports" on public.generated_reports for insert with check (auth.uid() is not null);

-- ═══════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.clients;
alter publication supabase_realtime add table public.activity_log;

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.clients for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.projects for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.tasks for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.client_contacts for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.contact_tasks for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.dev_kits for each row execute function public.update_updated_at();
