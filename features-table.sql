-- Features table schema for ScopeLock
-- This table stores features for each project with status tracking

CREATE TABLE features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  project_id uuid REFERENCES projects(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "feature_isolation" ON features
  FOR ALL
  USING (user_id = auth.uid());
