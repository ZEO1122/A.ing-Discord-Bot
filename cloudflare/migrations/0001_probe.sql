-- This isolated POC has no public Discord delivery or user/quiz data.
CREATE TABLE IF NOT EXISTS probe_jobs (
  id TEXT PRIMARY KEY,
  request_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','running','complete','blocked','dispatch_unknown')),
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS probe_sources (
  job_id TEXT NOT NULL REFERENCES probe_jobs(id),
  paper_id TEXT NOT NULL,
  source_json TEXT NOT NULL,
  PRIMARY KEY(job_id,paper_id)
);
CREATE TABLE IF NOT EXISTS probe_calls (
  job_id TEXT NOT NULL REFERENCES probe_jobs(id),
  paper_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('in_flight','complete','unknown','rejected')),
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(job_id,paper_id)
);
CREATE INDEX IF NOT EXISTS probe_calls_created ON probe_calls(created_at);
