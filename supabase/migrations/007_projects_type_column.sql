-- Add type column to projects table for distinguishing deliverables vs presentations
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'deliverable'
  CHECK (type IN ('deliverable', 'presentation', 'tool', 'report', 'brand_kit'));

-- Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(type);
