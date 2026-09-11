-- Panel Tahsin v2 schema (expand dari v1)
-- Tambah: wa_number, referral, tracks, enrollments, guru verification

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'murid',
  is_student INTEGER DEFAULT 0,    -- guru yang juga aktif sebagai murid (dual role)
  wa_number TEXT,                 -- E.164, buat notif
  referral_code TEXT UNIQUE,      -- kode unik referrer
  username TEXT UNIQUE,               -- username publik (ponpes.org/@username)
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
  demo_audio_url TEXT,            -- setoran bacaannya (Al-Hajj 1-5)
  cert_url TEXT,                  -- sertifikat sanad
  sanad_url TEXT,                 -- upload bukti sanad (jika ada)
  mahad_text TEXT,                -- isian: pernah belajar di Ma'had (jika tanpa sertifikat)
  setoran_id TEXT,                -- id setoran bacaan yang di-review
  status TEXT DEFAULT 'pending', -- pending|approved|rejected
  reviewed_by TEXT,               -- siapa terakhir aksi (audit)
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Review per-guru untuk calon pengajar (1 ACC = lolos)
CREATE TABLE IF NOT EXISTS guru_review (
  id TEXT PRIMARY KEY,
  verification_id TEXT NOT NULL,
  guru_id TEXT NOT NULL,
  decision TEXT NOT NULL,         -- acc|reject
  catatan TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(verification_id, guru_id),
  FOREIGN KEY (verification_id) REFERENCES guru_verification(id),
  FOREIGN KEY (guru_id) REFERENCES users(id)
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
