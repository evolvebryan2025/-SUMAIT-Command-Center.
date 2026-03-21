-- ═══════════════════════════════════════════════════════════
-- SUMAIT Command Center — Phase 2: Notifications + Schema Updates
-- ═══════════════════════════════════════════════════════════

-- Notifications table (in-app notifications for users)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text,
  type text not null default 'info' check (type in ('task_assigned', 'task_overdue', 'client_health', 'report_ready', 'system', 'info')),
  entity_type text,
  entity_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table public.notifications enable row level security;
create policy "Users can read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "Users can update own notifications" on public.notifications for update using (user_id = auth.uid());
create policy "System can insert notifications" on public.notifications for insert with check (auth.uid() is not null);
create policy "Admins can manage all notifications" on public.notifications for all using (is_admin());

-- Realtime for notifications
alter publication supabase_realtime add table public.notifications;

-- Index for fast unread count queries
create index idx_notifications_user_unread on public.notifications (user_id, is_read) where is_read = false;

-- Index for task queries by status and assigned_to (for task board)
create index idx_tasks_status on public.tasks (status);
create index idx_tasks_assigned on public.tasks (assigned_to);
create index idx_tasks_client on public.tasks (client_id);
create index idx_tasks_due_date on public.tasks (due_date);

-- Index for activity log queries by entity
create index idx_activity_entity on public.activity_log (entity_type, entity_id);
create index idx_activity_user on public.activity_log (user_id);
