CREATE TABLE IF NOT EXISTS user_settings (
  device_id TEXT PRIMARY KEY NOT NULL,
  daily_new_limit INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
