-- Panel Tahsin v2 schema (expand dari v1)
-- Tambah: wa_number, referral, tracks, enrollments, guru verification

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('murid','guru_pending','guru','guru_verifier')),
  wa_number TEXT,                 -- E.164, buat notif
  referral_code TEXT UNIQUE,      -- kode unik referrer
  referred_by TEXT,               -- user_id yang mengajak
  is_admin INTEGER DEFAULT 0,     -- @sobur = 1
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referrer_id) REFERENCES users(id),
  FOREIGN KEY (referred_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,            -- iqro|fatihah|juz_amma|tilawah|hafalan
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL         -- jilid_halaman|ayat|surat_ayat|juz_halaman|surat
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  current_unit TEXT,              -- mulai dari mana (ditentukan murid)
  status TEXT DEFAULT 'active',   -- active|done
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);

CREATE TABLE IF NOT EXISTS guru_verification (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,          -- guru_pending
  demo_audio_url TEXT,            -- setoran bacaannya
  cert_url TEXT,                  -- sertifikat/bukti
  status TEXT DEFAULT 'pending', -- pending|approved|rejected
  reviewed_by TEXT,               -- @sobur atau verifier
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS setoran (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  track_id TEXT,
  unit_ref TEXT,
  audio_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS review_ayat (
  id TEXT PRIMARY KEY,
  setoran_id TEXT NOT NULL,
  unit_ref TEXT,
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 10),
  catatan_teks TEXT,
  catatan_suara_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (setoran_id) REFERENCES setoran(id)
);
