-- Immutable first successful HF ranking snapshot. Individual jobs retain API history.
CREATE TABLE IF NOT EXISTS weekly_editions (
  week TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
