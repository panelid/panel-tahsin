// GET /api/guru/murid?guruId=xxx — murid yang diajak guru ini (bisa diangkat jadi guru)
export async function onRequestGet(context) {
  const { env, request } = context
  const db = env.DB
  const guruId = new URL(request.url).searchParams.get('guruId')
  if (!guruId) return json({ error: 'guruId required' }, 400)
  const rows = await db.prepare(
    "SELECT u.id, u.name, u.email, u.role FROM referrals r JOIN users u ON u.id = r.referred_id WHERE r.referrer_id = ? ORDER BY u.name"
  ).bind(guruId).all()
  return json(rows.results || [])
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
