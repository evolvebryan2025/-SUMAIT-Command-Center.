-- 011_client_portal.sql
-- Client Portal: auth linking, client comments, client branding, role update

-- 1. Update role check on profiles to include 'client'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'lead', 'member', 'client'));

-- 2. Client portal access — links auth user to client record
CREATE TABLE client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id),
  UNIQUE(client_id)
);

ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage portal access"
  ON client_portal_access FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients read own access"
  ON client_portal_access FOR SELECT
  USING (user_id = auth.uid());

-- 3. Client comments — completely separate from task_comments
CREATE TABLE client_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_type TEXT NOT NULL CHECK (author_type IN ('client', 'admin')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_comments_task ON client_comments(task_id);
CREATE INDEX idx_client_comments_author ON client_comments(author_id);

ALTER TABLE client_comments ENABLE ROW LEVEL SECURITY;

-- Helper: get all client_ids a portal user can see (self + sub-clients)
CREATE OR REPLACE FUNCTION get_portal_client_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT c.id FROM clients c
  INNER JOIN client_portal_access cpa ON cpa.client_id = c.id OR c.parent_client_id = cpa.client_id
  WHERE cpa.user_id = p_user_id AND cpa.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is a client
CREATE OR REPLACE FUNCTION is_client()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'client'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Admins full access to client comments
CREATE POLICY "Admins manage client comments"
  ON client_comments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clients can read comments on tasks they can see
CREATE POLICY "Clients read comments on accessible tasks"
  ON client_comments FOR SELECT
  USING (
    is_client() AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = client_comments.task_id
      AND t.client_id IN (SELECT get_portal_client_ids(auth.uid()))
    )
  );

-- Clients can insert comments on tasks they can see
CREATE POLICY "Clients insert comments"
  ON client_comments FOR INSERT
  WITH CHECK (
    is_client()
    AND author_id = auth.uid()
    AND author_type = 'client'
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = client_comments.task_id
      AND t.client_id IN (SELECT get_portal_client_ids(auth.uid()))
    )
  );

-- Members (employees) can read client comments on tasks assigned to them
CREATE POLICY "Members read client comments on assigned tasks"
  ON client_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = client_comments.task_id
      AND t.assigned_to = auth.uid()
    )
  );

-- 4. Client branding — dev kit tokens per client
CREATE TABLE client_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  primary_bg TEXT NOT NULL DEFAULT '#09090B',
  accent_color TEXT NOT NULL DEFAULT '#3b82f6',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  font_heading TEXT NOT NULL DEFAULT 'Inter',
  font_body TEXT NOT NULL DEFAULT 'Inter',
  extra_tokens JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client branding"
  ON client_branding FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients read own branding"
  ON client_branding FOR SELECT
  USING (
    is_client() AND client_id IN (SELECT get_portal_client_ids(auth.uid()))
  );

-- 5. RLS for tasks — clients can read tasks linked to their client IDs
CREATE POLICY "Clients read own tasks"
  ON tasks FOR SELECT
  USING (
    is_client() AND client_id IN (SELECT get_portal_client_ids(auth.uid()))
  );

-- 6. RLS for projects — clients can read projects linked to their client IDs
CREATE POLICY "Clients read own projects"
  ON projects FOR SELECT
  USING (
    is_client() AND client_id IN (SELECT get_portal_client_ids(auth.uid()))
  );

-- 7. RLS for notifications — clients can read their own notifications
CREATE POLICY "Clients read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() AND is_client());

CREATE POLICY "Clients update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid() AND is_client())
  WITH CHECK (user_id = auth.uid() AND is_client());
