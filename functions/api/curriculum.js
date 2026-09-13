// GET /api/curriculum?uid=<user_id>
// Stage DIPROGRES (bukan pilihan user): Al-Fatihah+Iqro bareng -> setelah Al-Fatihah lulus -> Juz Amma.
// Al-Fatihah wajib tiap shalat (5x sehari). Juz Amma = surat pendek yg sering dibaca dlm shalat.

const JUZ_AMMA = [ // surat pendek Juz 'Amma, urut yg umum dibaca dlm shalat
  [78, "An-Naba"], [79, "An-Nazi'at"], [80, "'Abasa"], [81, "At-Takwir"], [82, "Al-Infitar"],
  [83, "Al-Mutaffifin"], [84, "Al-Insyiqaq"], [85, "Al-Buruj"], [86, "At-Tariq"], [87, "Al-A'la"],
  [88, "Al-Ghasyiyah"], [89, "Al-Fajr"], [90, "Al-Balad"], [91, "Asy-Syams"], [92, "Al-Lail"],
  [93, "Ad-Duha"], [94, "Asy-Syarh"], [95, "At-Tin"], [96, "'Alaq"], [97, "Al-Qadr"],
  [98, "Al-Bayyinah"], [99, "Az-Zalzalah"], [100, "'Adiyat"], [101, "Al-Qari'ah"], [102, "At-Takatsur"],
  [103, "Al-'Asr"], [104, "Al-Humazah"], [105, "Al-Fil"], [106, "Quraisy"], [107, "Al-Ma'un"],
  [108, "Al-Kautsar"], [109, "Al-Kafirun"], [110, "An-Nasr"], [111, "Al-Lahab"], [112, "Al-Ikhlas"],
  [113, "Al-Falaq"], [114, "An-Nas"]
];

async function bestScore(db, uid, track) {
  // rata2 skor dari setoran track tsb yang sudah direview; pakai setoran terbaru
  const rows = await db.prepare(
    "SELECT ry.score FROM setoran s JOIN review_ayat ry ON ry.setoran_id = s.id WHERE s.user_id = ? AND s.track_id = ? AND s.status = 'reviewed' ORDER BY s.created_at DESC LIMIT 10"
  ).bind(uid, track).all();
  if (!rows.results || !rows.results.length) return null;
  return rows.results.reduce((a, r) => a + r.score, 0) / rows.results.length;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const uid = url.searchParams.get('uid');

  let stage = 'dasar';
  if (uid && db) {
    const f = await bestScore(db, uid, 'fatihah');
    // lulus = pernah direview dgn rata2 >= 7
    if (f != null && f >= 7) stage = 'lanjut';
  }

  let plan;
  if (stage === 'dasar') {
    plan = [
      { track: 'fatihah', name: 'Al-Fatihah', note: 'Wajib — dibaca di tiap rakaat shalat. Perbaiki terus tiap hari.' },
      { track: 'iqro', name: 'Iqro (bersamaan)', note: 'Dasar baca yg sering belum pas — lanjutkan bareng Al-Fatihah.' }
    ];
  } else {
    // lanjut: ambil 3 surat juz amma berikutnya berdasar sudah disetor
    const done = new Set();
    if (db) {
      const d = await db.prepare("SELECT DISTINCT unit_ref FROM setoran WHERE user_id = ? AND track_id = 'juz_amma'").bind(uid).all();
      (d.results || []).forEach(r => { if (r.unit_ref) done.add(r.unit_ref.toLowerCase().replace(/\s/g, '')); });
    }
    const next = JUZ_AMMA.filter(j => !done.has(('surat ' + j[1]).toLowerCase().replace(/\s/g, '')) && !done.has(j[1].toLowerCase().replace(/['\s]/g, ''))).slice(0, 3);
    plan = [
      { track: 'fatihah', name: 'Al-Fatihah (maintain)', note: 'Tetap jaga kelancaran — masih jadi bacaan inti shalat.' },
      ...next.map(j => ({ track: 'juz_amma', name: 'Surat ' + j[1], note: 'Sering dibaca dlm shalat — perbaiki tahsinnya.' }))
    ];
    if (!next.length) plan.push({ track: 'juz_amma', name: "Juz 'Amma penuh", note: "Ulang mutaba'ah dari An-Naba s.d. An-Nas." });
  }

  // audio acuan: selalu Al-Fatihah (inti), atau ayat 1 surat juz amma pertama di plan
  let refAudio = null;
  try {
    if (stage === 'dasar') {
      const r = await fetch('https://api.alquran.cloud/v1/ayah/1:1/ar.alafasy', { cf: { cacheTtl: 86400 } });
      const d = await r.json();
      if (d.code === 200) refAudio = { url: d.data.audio, surah: 'Al-Fatihah', ayah: 1, text: d.data.text };
    } else {
      const first = plan.find(p => p.track === 'juz_amma');
      const m = first && JUZ_AMMA.find(j => j[1] === first.name.replace('Surat ', ''));
      if (m) {
        const r = await fetch(`https://api.alquran.cloud/v1/ayah/${m[0]}:1/ar.alafasy`, { cf: { cacheTtl: 86400 } });
        const d = await r.json();
        if (d.code === 200) refAudio = { url: d.data.audio, surah: m[1], ayah: 1, text: d.data.text };
      }
    }
  } catch (e) { refAudio = null; }

  return json({ stage, plan, refAudio });
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}
