// GET /api/guru/pending — list setoran pending buat review
export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB;
  const rows = await db.prepare(`
    SELECT s.id, s.user_id, u.name as murid, s.track_id, s.unit_ref, s.created_at
    FROM setoran s JOIN users u ON u.id = s.user_id
    WHERE s.status = 'pending'
    ORDER BY s.created_at DESC LIMIT 50
  `).all();
  return json(rows.results || []);
}
// POST /api/review/submit (v2) — ustadz review per unit
export async function onRequestPost(context) {
  const { env, request } = context;
  const db = env.DB;
  const { setoranId, unitRef, score, catatan } = await request.json().catch(() => ({}));
  if (!setoranId || !score) return json({ error: 'setoranId & score required' }, 400);
  const id = 'rv_' + Date.now();
  await db.prepare("INSERT INTO review_ayat (id, setoran_id, unit_ref, score, catatan_teks) VALUES (?, ?, ?, ?, ?)")
    .bind(id, setoranId, unitRef || '', score, catatan || '').run();
  await db.prepare("UPDATE setoran SET status = 'reviewed' WHERE id = ?").bind(setoranId).run();
  return json({ success: true, review_id: id });
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
