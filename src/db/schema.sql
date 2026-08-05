-- Users table (role: murid | guru)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('murid','guru')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Setoran audio
CREATE TABLE IF NOT EXISTS setoran (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,         -- murid yang setor
  audio_url TEXT NOT NULL,       -- URL di R2
  status TEXT DEFAULT 'pending', -- pending | reviewed
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Review per ayat
CREATE TABLE IF NOT EXISTS review_ayat (
  id TEXT PRIMARY KEY,
  setoran_id TEXT NOT NULL,
  ayat_number INTEGER NOT NULL,  -- 1-7 (ayat Al-Fatihah)
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 10),
  catatan_teks TEXT,
  catatan_suara_url TEXT,        -- optional catatan suara guru
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (setoran_id) REFERENCES setoran(id)
);
