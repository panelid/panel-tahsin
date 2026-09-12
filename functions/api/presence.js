// GET /api/presence?guruId=x  -> online sejak
// POST /api/presence {userId, role} -> upsert last_seen=now
// GET /api/presence?list=1      -> guru online (last_seen < 90s)
export async function onRequest(context) {
  const { env, request } = context
  const db = env.DB
  if (!db) return json({ error: 'DB error' }, 500)
  const url = new URL(request.url)
  const list = url.searchParams.get('list')
  const guruId = url.searchParams.get('guruId')

  if (request.method === 'GET' && list) {
    const r = await db.prepare(
      "SELECT id, name, username FROM users WHERE role='guru' AND last_seen > datetime('now','-90 seconds') ORDER BY name"
    ).all()
    return json({ online: r.results || [] })
  }
  if (request.method === 'GET' && guruId) {
    const r = await db.prepare("SELECT last_seen FROM users WHERE id=?").bind(guruId).first()
    const on = r && r.last_seen && (Date.parse(r.last_seen.replace(' ', 'T') + 'Z') > Date.now() - 90000)
    return json({ online: !!on })
  }
  if (request.method === 'POST') {
    let b = {}
    try { b = await request.json() } catch (e) {}
    if (!b.userId) return json({ error: 'userId required' }, 400)
    await db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").bind(b.userId).run()
    return json({ success: true })
  }
  return json({ error: 'bad request' }, 400)
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
