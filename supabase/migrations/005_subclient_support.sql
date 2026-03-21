-- ═══════════════════════════════════════════════════════════
-- Sub-client support: parent_client_id for client hierarchy
-- ═══════════════════════════════════════════════════════════

-- Add parent_client_id to clients table
ALTER TABLE public.clients
  ADD COLUMN parent_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Index for fast lookups of sub-clients
CREATE INDEX idx_clients_parent ON public.clients(parent_client_id) WHERE parent_client_id IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.clients.parent_client_id IS 'If set, this client is a sub-client (client of a client). Points to the parent client row.';
