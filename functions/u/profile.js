// Shared public profile renderer — dipakai middleware catch-all /@username
// visibility: profile_visible, show_progress, show_setoran, show_audio

export async function renderPublicProfile(context, username) {
  const { env } = context;
  const db = env.DB;
  if (!db) return new Response('DB error', { status: 500 });

  let user = await db.prepare("SELECT id, name, username, bio, profile_visible, show_progress, show_setoran, show_audio, created_at FROM users WHERE username = ?").bind(username).first();
  if (!user) user = await db.prepare("SELECT id, name, username, bio, profile_visible, show_progress, show_setoran, show_audio, created_at FROM users WHERE id = ?").bind(username).first();
  if (!user) return null;
  if (!user.profile_visible) return { hidden: true, name: user.name };

  const ref = await db.prepare("SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ?").bind(user.id).first();
  const refCount = ref ? ref.c : 0;
  const setoran = await db.prepare("SELECT track_id, status, created_at, audio_url FROM setoran WHERE user_id = ? ORDER BY created_at DESC LIMIT 8").bind(user.id).all();
  const sets = setoran.results || [];
  const reviewed = sets.filter(s => s.status === 'reviewed').length;
  const progress = sets.length ? Math.round((reviewed / sets.length) * 100) : 0;
  const trackNames = { iqro: 'Iqro', fatihah: 'Al-Fatihah', juz_amma: 'Juz Amma', tilawah: 'Tilawah', hafalan: 'Hafalan' };

  const rows = sets.map(s => {
    const tn = trackNames[s.track_id] || s.track_id || '-';
    const au = (user.show_audio && s.audio_url) ? `<audio controls preload="none" src="${s.audio_url}"></audio>` : '';
    return `<div class="p-track"><div><b>${tn}</b><span class="m">${s.status === 'reviewed' ? '✓ direview' : 'menunggu'}</span></div>${au}</div>`;
  }).join('') || '<p class="m">Belum ada setoran.</p>';

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(user.name)} · ponpes.org</title>
<meta name="description" content="Profil ${esc(user.name)} di ponpes.org — platform tahsin & ngaji online gratis.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Literata:opsz,wght@7..72,500;7..72,600&family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/app.css"></head>
<body data-page="profile"><div id="hdr"></div><div class="wrap" style="max-width:560px;padding-top:8px">
<div class="hero"><div class="ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّرَّحِيمِ</div><h1>${esc(user.name)}</h1><p>${user.bio ? esc(user.bio) : 'Anggota Ponpes Digital — platform tahsin & ngaji online gratis'}</p><div id="heroWave"></div></div>
<div class="card"><div class="item-h"><b style="font-size:17px">📊 Profil Publik</b><span class="badge b-ok">@${esc(user.username || user.id)}</span></div>
<p class="sub" style="margin-top:6px">Mengajak <b style="color:var(--gold)">${refCount}</b> orang belajar tahsin</p>
${user.show_progress ? `<div class="prog-label"><span>Progres tahsin</span><span>${progress}%</span></div><div class="bar"><i style="width:${progress}%"></i></div>` : ''}
${user.show_setoran ? `<div class="card-t" style="margin-top:18px">📚 Setoran</div>${rows}` : '<p class="sub" style="margin-top:14px">Setoran disembunyikan oleh pemilik.</p>'}
</div>
<div class="foot">ponpes.org — platform tahsin & ngaji online gratis</div>
</div><nav id="nav"></nav>
<script src="/assets/app.js"></script>
<script>document.getElementById('heroWave').outerHTML = PP.wave(24);</script>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
