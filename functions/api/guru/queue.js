// GET /api/guru/queue — daftar calon guru pending + vote per guru
export async function onRequestGet(context) {
  const { env } = context
  const db = env.DB
  if (!db) return json({ error: 'DB error' }, 500)
  const rows = await db.prepare(`
    SELECT gv.id, gv.user_id, u.name, u.email, u.wa_number,
           gv.demo_audio_url, gv.sanad_url, gv.cert_url, gv.mahad_text, gv.created_at,
           (SELECT COUNT(*) FROM guru_review gr WHERE gr.verification_id = gv.id AND gr.decision='acc') acc_count,
           (SELECT COUNT(*) FROM guru_review gr WHERE gr.verification_id = gv.id AND gr.decision='reject') rej_count,
           (SELECT COUNT(*) FROM users ur WHERE ur.role='guru') guru_total
    FROM guru_verification gv JOIN users u ON u.id = gv.user_id
    WHERE gv.status = 'pending'
    ORDER BY gv.created_at DESC LIMIT 50
  `).all()
  return json(rows.results || [])
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
