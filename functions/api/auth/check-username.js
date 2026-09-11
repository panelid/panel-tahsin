// GET /api/auth/check-username?u=xxx -> {available:bool}
export async function onRequestGet(context) {
  const { env, request } = context
  const db = env.DB
  const u = (new URL(request.url).searchParams.get('u') || '').trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(u)) return json({ available: false, reason: '3-20 huruf/angka/underscore' })
  const row = await db.prepare("SELECT id FROM users WHERE username = ?").bind(u).first()
  return json({ available: !row })
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
