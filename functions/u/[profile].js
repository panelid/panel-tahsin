// Public profile: ponpes.org/u/@username  (atau /u/<id>)
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
  const html = `<!DOCTYPE html><html><head><title>${user.name} · Ponpes Digital</title>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 16px}
  h1{margin-bottom:4px}.muted{color:#666}.track{border:1px solid #ddd;border-radius:8px;padding:12px;margin:8px 0}</style></head>
  <body>
  <h1>${user.name}</h1>
  <p class="muted">Bergabung ${user.created_at}</p>
  <p>🤝 Mengajak <b>${refCount}</b> orang belajar tahsin</p>
  <h3>Progress</h3>
  ${(enroll.results || []).map(e => `<div class="track"><b>${e.track}</b> — ${e.status}<br>Unit: ${e.current_unit || '-'}</div>`).join('')}
  <p class="muted">ponpes.org — platform tahsin online</p>
  </body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
