-- A semester pins an immutable, reviewed content release and its UTC schedule.
CREATE TABLE IF NOT EXISTS concept_semesters (
  id TEXT PRIMARY KEY,
  release_hash TEXT NOT NULL,
  curriculum_version INTEGER NOT NULL,
  schedule_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paused' CHECK(status IN ('paused','active','complete')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS concept_slots (
  semester_id TEXT NOT NULL REFERENCES concept_semesters(id),
  sequence INTEGER NOT NULL,
  lesson_id TEXT NOT NULL,
  lesson_version INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY(semester_id,sequence)
);
CREATE INDEX IF NOT EXISTS concept_slots_due ON concept_slots(semester_id,scheduled_at);
-- test:<content hash> and semester:<id>:<sequence> have independent ledgers.
CREATE TABLE IF NOT EXISTS concept_deliveries (
  delivery_key TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  lesson_version INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('in_flight','sent','unknown')),
  payload_json TEXT NOT NULL,
  message_id TEXT,
  channel_id TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
