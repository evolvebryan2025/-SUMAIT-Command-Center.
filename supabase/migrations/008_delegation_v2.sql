-- ═══════════════════════════════════════════════════════════
-- SUMAIT Command Center — Phase: Delegation v2
-- ═══════════════════════════════════════════════════════════

-- 1. task_comments
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  comment_type text NOT NULL DEFAULT 'comment'
    CHECK (comment_type IN ('comment', 'question', 'blocker')),
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. comment_reads (junction table for read receipts)
CREATE TABLE public.comment_reads (
  comment_id uuid REFERENCES public.task_comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- 3. daily_reports
CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  report_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, report_date)
);

-- 4. daily_report_items
CREATE TABLE public.daily_report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.daily_reports(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('completed', 'pending', 'blocker')),
  description text NOT NULL,
  links text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. daily_report_attachments
CREATE TABLE public.daily_report_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.daily_report_items(id) ON DELETE CASCADE NOT NULL,
  report_id uuid REFERENCES public.daily_reports(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Schema changes to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
ALTER TABLE public.generated_reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'
  CHECK (status IN ('draft', 'approved', 'deployed'));

-- Dynamic constraint drop for notifications type
DO $$
DECLARE _conname text;
BEGIN
  SELECT conname INTO _conname FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%';
  IF _conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', _conname);
  END IF;
END $$;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'task_assigned','task_overdue','task_due_soon','client_health',
    'report_ready','comment_reply','question_posted','blocker_raised',
    'daily_report_missing','system','info'
  ));

-- RLS: Enable on all new tables
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: task_comments (scoped through task access)
CREATE POLICY "Read comments on accessible tasks" ON public.task_comments FOR SELECT
  USING (is_admin() OR author_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.tasks WHERE id = task_comments.task_id AND assigned_to = auth.uid()
  ));
CREATE POLICY "Insert comments on accessible tasks" ON public.task_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid() AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM public.tasks WHERE id = task_comments.task_id AND assigned_to = auth.uid()
    )
  ));
CREATE POLICY "Author or admin can update comments" ON public.task_comments FOR UPDATE
  USING (author_id = auth.uid() OR is_admin());
CREATE POLICY "Author or admin can delete comments" ON public.task_comments FOR DELETE
  USING (author_id = auth.uid() OR is_admin());

-- RLS: comment_reads
CREATE POLICY "Users can read all reads" ON public.comment_reads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can mark own reads" ON public.comment_reads FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS: daily_reports
CREATE POLICY "Members read own reports" ON public.daily_reports FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Members insert own reports" ON public.daily_reports FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members update own reports" ON public.daily_reports FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage all reports" ON public.daily_reports FOR ALL USING (is_admin());

-- RLS: daily_report_items (scoped through parent report)
CREATE POLICY "Read own report items" ON public.daily_report_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM daily_reports WHERE id = report_id AND (user_id = auth.uid() OR is_admin())));
CREATE POLICY "Insert own report items" ON public.daily_report_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM daily_reports WHERE id = report_id AND (user_id = auth.uid() OR is_admin())));
CREATE POLICY "Update own report items" ON public.daily_report_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM daily_reports WHERE id = report_id AND (user_id = auth.uid() OR is_admin())));
CREATE POLICY "Delete own report items" ON public.daily_report_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM daily_reports WHERE id = report_id AND (user_id = auth.uid() OR is_admin())));

-- RLS: daily_report_attachments (scoped through parent report)
CREATE POLICY "Read own report attachments" ON public.daily_report_attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM daily_reports WHERE id = report_id AND (user_id = auth.uid() OR is_admin())));
CREATE POLICY "Insert own report attachments" ON public.daily_report_attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM daily_reports WHERE id = report_id AND (user_id = auth.uid() OR is_admin())) AND uploaded_by = auth.uid());
CREATE POLICY "Delete own report attachments" ON public.daily_report_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR is_admin());

-- RLS: tasks (add member insert policy)
CREATE POLICY "Members can insert own tasks" ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid() AND (assigned_to = auth.uid() OR assigned_to IS NULL));

-- Triggers: updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;

-- Indexes
CREATE INDEX idx_task_comments_task ON public.task_comments (task_id);
CREATE INDEX idx_task_comments_author ON public.task_comments (author_id);
CREATE INDEX idx_task_comments_unresolved ON public.task_comments (is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_comment_reads_comment ON public.comment_reads (comment_id);
CREATE INDEX idx_daily_reports_user_date ON public.daily_reports (user_id, report_date);
CREATE INDEX idx_daily_report_items_report ON public.daily_report_items (report_id);
CREATE INDEX idx_daily_report_attachments_item ON public.daily_report_attachments (item_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('daily-reports', 'daily-reports', false);

CREATE POLICY "Members upload own screenshots" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'daily-reports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Read own or admin reads all screenshots" ON storage.objects FOR SELECT
  USING (bucket_id = 'daily-reports' AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin()));
CREATE POLICY "Delete own screenshots" ON storage.objects FOR DELETE
  USING (bucket_id = 'daily-reports' AND (storage.foldername(name))[1] = auth.uid()::text);
