-- ═══════════════════════════════════════════════════════════
-- SUMAIT Command Center — Features Batch
-- Task attachments, notification rules, role escalation,
-- performance tracking, health auto-scoring
-- ═══════════════════════════════════════════════════════════

-- 1. task_attachments
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_task_attachments_task ON public.task_attachments (task_id);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read attachments on accessible tasks" ON public.task_attachments FOR SELECT
  USING (is_admin() OR uploaded_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.tasks WHERE id = task_attachments.task_id AND assigned_to = auth.uid()
  ));
CREATE POLICY "Upload attachments on accessible tasks" ON public.task_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());
CREATE POLICY "Delete own attachments" ON public.task_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR is_admin());

-- Storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload task attachments" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Read task attachments" ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Delete own task attachments" ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. notification_rules (configurable alert rules)
CREATE TABLE public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type IN (
    'task_overdue_days', 'no_daily_report', 'client_health_below',
    'task_blocked_days', 'no_activity_days', 'custom'
  )),
  threshold integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  notify_admin boolean DEFAULT true,
  notify_assignee boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notification rules" ON public.notification_rules FOR ALL
  USING (is_admin());
CREATE POLICY "All users read active rules" ON public.notification_rules FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE TRIGGER set_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default notification rules
INSERT INTO public.notification_rules (name, description, rule_type, threshold, notify_admin, notify_assignee) VALUES
  ('Task overdue 3+ days', 'Alert when a task is overdue by 3 or more days', 'task_overdue_days', 3, true, true),
  ('No daily report', 'Alert when a builder misses their daily report', 'no_daily_report', 1, true, false),
  ('Client health below 50', 'Alert when client health score drops below 50%', 'client_health_below', 50, true, false),
  ('Task blocked 2+ days', 'Alert when a task has been blocked for 2 or more days', 'task_blocked_days', 2, true, true),
  ('No activity 3+ days', 'Alert when a builder has no activity for 3+ days', 'no_activity_days', 3, true, false);

-- 3. Role escalation: add 'lead' role option
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'lead', 'member'));

-- 4. Chat attachments (for AI chat file uploads)
CREATE TABLE public.chat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  file_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat attachments" ON public.chat_attachments FOR ALL
  USING (user_id = auth.uid());

-- Storage bucket for chat uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload chat files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-uploads' AND auth.uid() IS NOT NULL);
CREATE POLICY "Read own chat files" ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Delete own chat files" ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
