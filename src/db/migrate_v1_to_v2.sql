-- Migration: v1 → v2
-- Jalankan sekali di D1 production: wrangler d1 execute panel-tahsin-db --file=src/db/migrate_v1_to_v2.sql

-- 1. Alter users: tambah kolom baru (D1/SQLite tidak support ALTER ADD banyak sekaligus, satu per satu)
ALTER TABLE users ADD COLUMN wa_number TEXT;
ALTER TABLE users ADD COLUMN referral_code TEXT;
ALTER TABLE users ADD COLUMN referred_by TEXT;
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- 2. Update role check: guru_pending + guru_verifier (D1 tidak support ALTER CHECK, buat ulang tidak bisa drop-add di SQLite mudah)
-- Workaround: buat tabel baru, copy, drop lama, rename
-- Tapi karena ada FK, lebih aman: cukup allow di app level, biarkan CHECK lama (murid|guru) — nanti upgrade bertahap

-- 3. Buat tabel baru
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  current_unit TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guru_verification (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  demo_audio_url TEXT,
  cert_url TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Tambah kolom track_id + unit_ref ke setoran
ALTER TABLE setoran ADD COLUMN track_id TEXT;
ALTER TABLE setoran ADD COLUMN unit_ref TEXT;

-- 5. Tambah unit_ref ke review_ayat
ALTER TABLE review_ayat ADD COLUMN unit_ref TEXT;

-- 6. Seed tracks
INSERT OR IGNORE INTO tracks (id, name, unit_type) VALUES
  ('iqro',     'Iqro',     'jilid_halaman'),
  ('fatihah',  'Al-Fatihah','ayat'),
  ('juz_amma', 'Juz Amma', 'surat_ayat'),
  ('tilawah',  'Tilawah',  'juz_halaman'),
  ('hafalan',  'Hafalan',  'surat');

-- 7. Unique index referral_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
