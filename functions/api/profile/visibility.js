// GET /api/profile/visibility?uid=x  -> state
// POST /api/profile/visibility { uid, field, value }  -> update (field: profile_visible|show_progress|show_setoran|show_audio|bio)
import { reqUid } from '../_auth.js';
export async function onRequest(context) {
const { env, request } = context;
  const db = env.DB;
  if (!db) return json({ error: 'DB error' }, 500);
  const url = new URL(request.url);
  let uid = await reqUid(request, env) || url.searchParams.get('uid');
  if (request.method === 'GET') {
    if (!uid) return json({ error: 'uid required' }, 400);
    const u = await db.prepare("SELECT username, bio, profile_visible, show_progress, show_setoran, show_audio FROM users WHERE id = ?").bind(uid).first();
    if (!u) return json({ error: 'not found' }, 404);
    return json({ username: u.username, bio: u.bio, profile_visible: !!u.profile_visible, show_progress: !!u.show_progress, show_setoran: !!u.show_setoran, show_audio: !!u.show_audio });
  }
  if (request.method === 'POST') {
    let b = {};
    try { b = await request.json(); } catch (e) {}
    if (!b.uid) return json({ error: 'uid required' }, 400);
    if (b.bio !== undefined) {
      await db.prepare("UPDATE users SET bio = ? WHERE id = ?").bind(String(b.bio).slice(0, 200), b.uid).run();
      return json({ success: true });
    }
    const allowed = ['profile_visible', 'show_progress', 'show_setoran', 'show_audio'];
    if (!allowed.includes(b.field)) return json({ error: 'field invalid' }, 400);
    const val = b.value ? 1 : 0;
    await db.prepare(`UPDATE users SET ${b.field} = ? WHERE id = ?`).bind(val, b.uid).run();
    return json({ success: true, field: b.field, value: val });
  }
  return json({ error: 'bad request' }, 400);
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
