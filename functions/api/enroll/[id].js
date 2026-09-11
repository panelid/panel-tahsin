// GET /api/enroll/:id — profil murid + enrollments + setoran (dipakai dashboard-murid)
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
