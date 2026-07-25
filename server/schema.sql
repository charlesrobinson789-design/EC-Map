CREATE TABLE IF NOT EXISTS mock_patients (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  age_range TEXT NOT NULL,
  menopause_stage TEXT NOT NULL,
  adhd_context TEXT NOT NULL,
  profile_notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_sessions (
  id UUID PRIMARY KEY,
  patient_id TEXT REFERENCES mock_patients(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
  session_payload JSONB NOT NULL,
  report_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  versions JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_sessions_patient_idx
  ON assessment_sessions (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS assessment_sessions_status_idx
  ON assessment_sessions (status, created_at DESC);
