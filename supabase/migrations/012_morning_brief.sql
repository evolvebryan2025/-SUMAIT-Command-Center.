-- 012_morning_brief.sql
-- Extends schema for interactive morning brief

-- 1. Add 'meeting_note' to daily_report_items.item_type
ALTER TABLE public.daily_report_items
  DROP CONSTRAINT IF EXISTS daily_report_items_item_type_check;
ALTER TABLE public.daily_report_items
  ADD CONSTRAINT daily_report_items_item_type_check
  CHECK (item_type IN ('completed', 'pending', 'blocker', 'meeting_note'));

-- 2. Add client_id to daily_report_items (for meeting notes tied to a client)
ALTER TABLE public.daily_report_items
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_daily_report_items_client
  ON public.daily_report_items(client_id);

-- 3. Create brief_actions table (tracks AI-generated recommended actions)
CREATE TABLE IF NOT EXISTS public.brief_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date date NOT NULL,
  action_text text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'task_created')),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brief_actions_date ON public.brief_actions(brief_date);
CREATE INDEX IF NOT EXISTS idx_brief_actions_status ON public.brief_actions(status);

-- 4. RLS for brief_actions
ALTER TABLE public.brief_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to brief_actions"
  ON public.brief_actions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Members read own brief_actions"
  ON public.brief_actions FOR SELECT
  USING (created_by = auth.uid());

-- 5. Add 'delegation_daily' to generated_reports type check if not present
ALTER TABLE public.generated_reports
  DROP CONSTRAINT IF EXISTS generated_reports_type_check;
ALTER TABLE public.generated_reports
  ADD CONSTRAINT generated_reports_type_check
  CHECK (type IN ('morning_brief', 'client_report', 'employee_report', 'team_performance', 'delegation_dashboard', 'delegation_daily'));
