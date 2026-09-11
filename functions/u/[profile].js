// Public profile: ponpes.org/u/@username (atau /u/<id>)
export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  let username = url.pathname.replace('/u/', '').replace(/^@/, '');
  if (!username || username === '') return new Response('Not found', { status: 404 });
  const db = env.DB;
  if (!db) return new Response('DB error', { status: 500 });

  let user = await db.prepare(
    "SELECT id, name, referral_code, username, created_at FROM users WHERE username = ?"
  ).bind(username).first();
  if (!user) user = await db.prepare(
    "SELECT id, name, referral_code, username, created_at FROM users WHERE referral_code = ? OR id = ?"
  ).bind(username, username).first();
  if (!user) return new Response('User not found', { status: 404 });

  const ref = await db.prepare("SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ?").bind(user.id).first();
  const refCount = ref ? ref.c : 0;
  const enroll = await db.prepare(
    "SELECT t.name as track, e.current_unit, e.status FROM enrollments e JOIN tracks t ON t.id = e.track_id WHERE e.user_id = ?"
  ).bind(user.id).all();
  const setoran = await db.prepare(
    "SELECT s.track_id, s.status, s.created_at, s.audio_url FROM setoran s WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 5"
  ).bind(user.id).all();

  // progress: % enrollment yang status active vs total
  const tracks = enroll.results || [];
  const activeCount = tracks.filter(t => t.status === 'active').length;
  const progress = tracks.length ? Math.round((activeCount / tracks.length) * 100) : 0;

  const rows = tracks.map(e => `<div class="track"><span>${e.track}</span><span class="muted">${e.status}${e.current_unit ? ' · ' + e.current_unit : ''}</span></div>`).join('') || '<p class="muted">Belum mulai track.</p>';
  const trackNames = { iqro:'Iqro', fatihah:'Al-Fatihah', juz_amma:'Juz Amma', tilawah:'Tilawah', hafalan:'Hafalan' };
  const sets = (setoran.results || []).map(s => {
    const tn = trackNames[s.track_id] || s.track_id || '-';
    const audio = s.audio_url ? `<audio controls src="${s.audio_url}" style="width:100%;margin-top:8px"></audio>` : '';
    return `<div class="track"><div><span>${tn}</span><span class="muted">${s.status}</span></div>${audio}</div>`;
  }).join('') || '<p class="muted">Belum ada setoran.</p>';

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${user.name} · Ponpes Digital</title>
<meta name="description" content="Profil santri ${user.name} di ponpes.org — platform tahsin & ngaji online gratis.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Literata:opsz,wght@7..72,600&display=swap" rel="stylesheet">
<style>
:root{--base:#F6F5EF;--teal:#1E4640;--amber:#E3A23B;--ink:#1C2420;--soft:#E7EEE6;--muted:#5A655F;--line:#D9DED8}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--base);color:var(--ink);line-height:1.7;padding:24px 16px}
.wrap{max-width:560px;margin:0 auto}
.back{display:inline-block;margin-bottom:16px;color:var(--teal);font-weight:600;text-decoration:none;font-size:14px}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:28px;box-shadow:0 12px 30px rgba(30,70,64,.07)}
.top{display:flex;align-items:center;gap:16px;margin-bottom:20px}
.avatar{width:56px;height:56px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Literata',serif;font-size:22px;font-weight:600;flex-shrink:0}
.name{font-family:'Literata',serif;font-size:22px;font-weight:600}
.sub{font-size:14px;color:var(--muted)}
.prog-label{display:flex;justify-content:space-between;font-size:13px;color:var(--muted);font-weight:600;margin:18px 0 8px}
.bar{height:10px;background:var(--soft);border-radius:99px;overflow:hidden}
.bar i{display:block;height:100%;width:${progress}%;background:var(--amber);border-radius:99px}
.h2{font-size:17px;color:var(--teal);margin:22px 0 10px;font-weight:700}
.track{display:flex;justify-content:space-between;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-bottom:8px;font-size:14px}
.muted{color:var(--muted)}
.wave{display:flex;align-items:flex-end;gap:3px;height:24px;margin:14px 0;color:var(--line)}
.wave span{width:4px;background:var(--teal);border-radius:2px;height:40%}
footer{text-align:center;margin-top:24px;font-size:12px;color:var(--muted)}
</style></head>
<body><div class="wrap">
<a href="/" class="back">← ponpes.org</a>
<div class="card">
  <div class="top">
    <div class="avatar">${user.name.charAt(0)}</div>
    <div><div class="name">${user.name}</div><div class="sub">Bergabung ${user.created_at ? user.created_at.slice(0,10) : '-'}</div></div>
  </div>
  <div class="wave" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
  <p class="muted">Mengajak <b style="color:var(--amber)">${refCount}</b> orang belajar tahsin</p>
  <div class="prog-label"><span>Progres tahsin</span><span>${progress}%</span></div>
  <div class="bar"><i></i></div>
  <div class="h2">Track diambil</div>
  ${rows}
  <div class="h2">Setoran terakhir</div>
  ${sets}
</div>
<footer>ponpes.org — platform tahsin & ngaji online gratis</footer>
</div></body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
}
