// GET /api/curriculum?goal=read&level=beginner
// Berikan bacaan selanjutnya + audio acuan dari alquran.cloud (tanpa key).
const PLANS = {
  read:    { beginner: [['iqro','Iqro 1','Belajar mengenal huruf hijaiyah'],['iqro','Iqro 2','Harakat & sukun'],['iqro','Iqro 3','Bacaan rangkai']],
             basic:    [['fatihah','Al-Fatihah','Baca tartil per ayat'],['juz_amma','An-Nas s.d. Al-Falaq','Surat pendek'],['juz_amma','Surat Al-Ikhlas']],
             fluent:   [['tilawah','Tilawah surat pendek','Lancar tanpa terbata']] },
  tartil:  { beginner: [['fatihah','Al-Fatihah','Tartil per ayat'],['juz_amma','An-Nas–Al-Falaq']],
             basic:    [['juz_amma','Al-Kafirun s.d. Quraisy'],['juz_amma','Al-Ma’un s.d. Al-Kautsar']],
             fluent:   [['tilawah','Surat Ad-Duha s.d. Ash-Sharh']] },
  hafalan: { beginner: [['hafalan','An-Nas','Hafal 1 surat'],['hafalan','Al-Falaq'],['hafalan','Al-Ikhlas']],
             basic:    [['hafalan','Al-Lahab s.d. Al-‘Asr'],['hafalan','Al-Humazah s.d. Al-Quraisy']],
             fluent:   [['hafalan','Juz 30 penuh']] },
  koreksi: { beginner: [['fatihah','Al-Fatihah','Rekam, ustadz koreksi']],
             basic:    [['juz_amma','3 surat pilihan']],
             fluent:   [['tilawah','1 halaman pilihan']] }
};
const REF = { // surah+ayat untuk ambil audio acuan dari alquran.cloud (edition per indonesian/arabi)
  'fatihah': [1,1], 'juz_amma': [114,1], 'iqro': null, 'tilawah': [93,1], 'hafalan': [114,1]
};
export async function onRequestGet(context) {
  const { env, request } = context
  const url = new URL(request.url)
  const goal = url.searchParams.get('goal') || 'read'
  const level = url.searchParams.get('level') || 'beginner'
  const plan = (PLANS[goal] && PLANS[goal][level]) || PLANS.read[level] || PLANS.read.beginner
  let audio = null
  // cari track pertama yang punya ref audio
  const key = plan[0][0]
  const ref = REF[key]
  if (ref) {
    const [s, a] = ref
    try {
      const u = `https://api.alquran.cloud/v1/ayah/${s}:${a}/ar.alafasy` // qari Mishary
      const r = await fetch(u, { cf: { cacheTtl: 86400 } })
      const d = await r.json()
      if (d.code === 200) audio = { url: d.data.audio, surah: d.data.surah.name, ayah: d.data.numberInSurah, text: d.data.text }
    } catch (e) { audio = null }
  }
  return json({ goal, level, plan: plan.map(([track, name, note]) => ({ track, name, note })), refAudio: audio })
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
