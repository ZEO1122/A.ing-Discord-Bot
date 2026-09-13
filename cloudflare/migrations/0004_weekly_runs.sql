CREATE TABLE IF NOT EXISTS weekly_runs (
 week TEXT PRIMARY KEY,
 status TEXT NOT NULL CHECK(status IN ('queued','running','complete','blocked','dispatch_unknown')),
 error_code TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
