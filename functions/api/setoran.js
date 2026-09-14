// GET /api/setoran?track_id= — HANYA setoran milik sendiri (token wajib).
// Ustadz ambil antrian lewat /api/guru/pending, bukan sini.
import { reqUid, roleOf } from './_auth.js';
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function onRequestGet(context) {
  const { env, request } = context
  try {
    const db = env.DB
    const url = new URL(request.url)
    const uid = await reqUid(request, env)
    if (!uid) return json({ error: 'login required' }, 401)

    let query = "SELECT s.*, u.name as murid_name FROM setoran s JOIN users u ON s.user_id = u.id WHERE s.user_id = ?"
    const binds = [uid]
    const trackId = url.searchParams.get('track_id')
    if (trackId) { query += " AND s.track_id = ?"; binds.push(trackId) }
    query += " ORDER BY s.created_at DESC"
    const { results } = await db.prepare(query).bind(...binds).all()
    return json({ success: true, setoran: results })
  } catch (err) {
    return json({ success: false, error: err.message }, 500)
  }
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
