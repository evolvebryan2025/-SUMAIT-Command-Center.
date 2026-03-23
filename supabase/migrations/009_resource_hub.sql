-- Resource Hub: central repository for client deliverables, links, and outputs
create table public.client_resources (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  description text,
  url text,
  resource_type text not null default 'link' check (resource_type in ('deployment', 'deliverable', 'presentation', 'tool', 'report', 'meeting_note', 'link', 'document')),
  status text not null default 'live' check (status in ('live', 'archived', 'migrated')),
  deploy_date date,
  source_file text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_client_resources_client on public.client_resources (client_id);
create index idx_client_resources_type on public.client_resources (resource_type);

-- RLS
alter table public.client_resources enable row level security;

-- All authenticated users can read resources
create policy "Authenticated users can read resources"
  on public.client_resources for select
  using (auth.uid() is not null);

-- Admins can manage resources
create policy "Admins can insert resources"
  on public.client_resources for insert
  with check (is_admin());

create policy "Admins can update resources"
  on public.client_resources for update
  using (is_admin());

create policy "Admins can delete resources"
  on public.client_resources for delete
  using (is_admin());

-- Updated_at trigger
create trigger set_client_resources_updated_at
  before update on public.client_resources
  for each row execute function update_updated_at();
