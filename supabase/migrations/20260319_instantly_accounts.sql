-- Instantly.ai multi-account support
CREATE TABLE IF NOT EXISTS instantly_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  email TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one default account at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_instantly_accounts_default
  ON instantly_accounts (is_default) WHERE is_default = true;

-- RLS
ALTER TABLE instantly_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage instantly accounts"
  ON instantly_accounts FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
