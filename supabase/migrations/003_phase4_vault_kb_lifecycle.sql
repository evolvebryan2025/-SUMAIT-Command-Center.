-- Phase 4: Credentials Vault, Knowledge Base Docs, Client Lifecycle

-- ============================================
-- 1. Credentials Vault (encrypted at app layer)
-- ============================================
CREATE TABLE IF NOT EXISTS credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  credential_type TEXT NOT NULL DEFAULT 'api_key'
    CHECK (credential_type IN ('api_key', 'password', 'oauth_token', 'ssh_key', 'certificate', 'other')),
  encrypted_value TEXT NOT NULL,
  username TEXT,
  url TEXT,
  notes TEXT,
  last_rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credentials_client ON credentials(client_id);

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all credentials" ON credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 2. Knowledge Base Documents (replaces JSONB)
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'technical', 'brand', 'process', 'credentials_ref', 'notes')),
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_client ON knowledge_docs(client_id);

ALTER TABLE knowledge_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge docs" ON knowledge_docs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage knowledge docs" ON knowledge_docs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 3. Knowledge Base File Attachments
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id UUID REFERENCES knowledge_docs(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_attachments_doc ON knowledge_attachments(doc_id);

ALTER TABLE knowledge_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read attachments" ON knowledge_attachments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage attachments" ON knowledge_attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 4. Client Lifecycle Stages
-- ============================================
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'prospect'
    CHECK (lifecycle_stage IN ('prospect', 'onboarding', 'active', 'at_risk', 'churned', 'paused')),
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS churned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_review_date DATE,
  ADD COLUMN IF NOT EXISTS monthly_value NUMERIC(10,2) DEFAULT 0;

-- Client lifecycle events timeline
CREATE TABLE IF NOT EXISTS client_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('stage_change', 'health_change', 'note', 'meeting', 'milestone', 'issue', 'renewal')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_events_client ON client_events(client_id);

ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client events" ON client_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage client events" ON client_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-files', 'knowledge-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload/read
CREATE POLICY "Authenticated users can manage knowledge files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'knowledge-files' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'knowledge-files' AND auth.role() = 'authenticated');
