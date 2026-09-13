CREATE TABLE IF NOT EXISTS weekly_deliveries (
  week TEXT PRIMARY KEY REFERENCES weekly_editions(week),
  status TEXT NOT NULL CHECK(status IN ('in_flight','sent','unknown')),
  payload_json TEXT NOT NULL,
  message_id TEXT,
  channel_id TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
