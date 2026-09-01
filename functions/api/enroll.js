// POST /api/enroll — murid pilih track + start unit
export async function onRequestPost(context) {
  const { env, request } = context;
  const db = env.DB;
  const { userId, trackId, currentUnit } = await request.json().catch(() => ({}));
  if (!userId || !trackId) return json({ error: 'userId & trackId required' }, 400);
  const id = 'enr_' + Date.now();
  await db.prepare("INSERT INTO enrollments (id, user_id, track_id, current_unit, status) VALUES (?, ?, ?, ?, 'active')")
    .bind(id, userId, trackId, currentUnit || '').run();
  return json({ success: true, enrollment_id: id });
}

// GET /api/murid/:id — profil + enrollments + setoran
export async function onRequestGet(context) {
  const { env, request } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  const user = await db.prepare("SELECT id, name, referral_code FROM users WHERE id = ?").bind(id).first();
  if (!user) return json({ error: 'not found' }, 404);
  const enroll = await db.prepare("SELECT t.name as track, e.current_unit, e.status FROM enrollments e JOIN tracks t ON t.id=e.track_id WHERE e.user_id = ?").bind(id).all();
  const setoran = await db.prepare("SELECT s.id, s.track_id, s.status, s.created_at FROM setoran s WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 10").bind(id).all();
  return json({ user, enrollments: enroll.results || [], setoran: setoran.results || [] });
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
