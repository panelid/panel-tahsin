// GET /api/guru/list — daftar pengajar aktif (buat dropdown murid minta sesi live)
export async function onRequestGet(context) {
  const { env } = context
  const db = env.DB
  if (!db) return json({ error: 'DB error' }, 500)
  const r = await db.prepare("SELECT id, name, username FROM users WHERE role = 'guru' AND username IS NOT NULL ORDER BY name").all()
  return json({ gurus: r.results || [] })
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
