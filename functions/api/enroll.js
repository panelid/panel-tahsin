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

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
