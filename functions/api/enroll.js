// POST /api/enroll — murid pilih track + start unit
import { reqUid } from './_auth.js';
export async function onRequestPost(context) {
  const { env, request } = context;
  const db = env.DB;
  const b = await request.json().catch(() => ({}));
  const userId = await reqUid(request, env);
  const trackId = b.trackId, currentUnit = b.currentUnit;
  if (!userId || !trackId) return json({ error: 'userId & trackId required' }, 400);
  const TRACKS = ['iqro', 'fatihah', 'juz_amma', 'tilawah', 'hafalan'];
  if (!TRACKS.includes(trackId)) return json({ error: 'track tidak dikenal' }, 400);
  // cegah duplikat enrollment aktif per track
  const ex = await db.prepare("SELECT id FROM enrollments WHERE user_id = ? AND track_id = ? AND status = 'active'").bind(userId, trackId).first();
  if (ex) return json({ success: true, enrollment_id: ex.id, note: 'sudah terdaftar' });
  const id = 'enr_' + Date.now();
  await db.prepare("INSERT INTO enrollments (id, user_id, track_id, current_unit, status) VALUES (?, ?, ?, ?, 'active')")
    .bind(id, userId, trackId, currentUnit || '').run();
  return json({ success: true, enrollment_id: id });
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
