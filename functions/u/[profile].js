// Public profile: ponpes.org/u/@username (atau /u/<id>)
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  let username = url.pathname.replace('/u/', '');
  if (!username || username === '') return new Response('Not found', { status: 404 });
  const db = env.DB;
  if (!db) return new Response('DB error', { status: 500 });
  const user = await db.prepare(
    "SELECT id, name, referral_code, created_at FROM users WHERE referral_code = ? OR id = ?"
  ).bind(username, username).first();
  if (!user) return new Response('User not found', { status: 404 });
  const ref = await db.prepare("SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ?").bind(user.id).first();
  const refCount = ref ? ref.c : 0;
  const enroll = await db.prepare(
    "SELECT t.name as track, e.current_unit, e.status FROM enrollments e JOIN tracks t ON t.id = e.track_id WHERE e.user_id = ?"
  ).bind(user.id).all();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${user.name} · Ponpes Digital</title><style>body{font-family:'Space Grotesk',DM Mono,sans-serif;background:#fafafa;color:#000;display:flex;flex-direction:column;align-items:center;min-height:100vh;margin:0;padding:16px}h1{font-size:2rem;font-weight:700;margin:.5rem 0 .25rem;font-family:'Space Grotesk'}p.muted{color:#555;margin:4px 0}p.muted strong{color:#d4ff00;font-family:'DM Mono'}section{width:100%;max-width:500px;margin:24px 0;padding:24px;border:4px solid #000;box-shadow:8px 8px 0 #000;border-radius:0;background:#fff;display:flex;flex-direction:column;align-items:center;text-align:center}section h3{margin:0 0 12px;border-bottom:4px solid #d4ff00;border-bottom-width:4px;padding-bottom:4px}.track{width:100%;margin:8px 0;padding:12px;border:4px solid #000;background:#fff;border-radius:0}footer{margin-top:auto;margin-bottom:16px;font-size:.8rem;color:#777}</style></head><body><h1>${user.name}</h1><p class="muted">Bergabung ${user.created_at}</p><p>🤝 <strong>Mengajak ${refCount}</strong> orang belajar tahsin</p><h3>Progress</h3>${(enroll.results || []).map(e => `<div class="track"><b>${e.track}</b> — ${e.status}<br>Unit: ${e.current_unit || '-'}</div>`).join('')}<footer>ponpes.org — platform tahsin online</footer></body></html>`;  
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

