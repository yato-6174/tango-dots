CREATE TABLE IF NOT EXISTS user_card_states (
  device_id TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  scheduler_card_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (device_id, card_id)
);

CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  reviewed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_logs_device_reviewed_at
ON review_logs (device_id, reviewed_at);
