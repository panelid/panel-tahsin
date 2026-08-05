export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function onRequestPost(context) {
  const { env, request } = context
  try {
    const db = env.DB
    const { setoran_id, reviews } = await request.json()
    if (!setoran_id || !reviews) return new Response(JSON.stringify({ success: false, error: 'Data tidak lengkap' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

    for (const rev of reviews) {
      const revId = 'rev_' + Date.now() + Math.random().toString(36).substring(2, 7)
      await db.prepare("INSERT INTO review_ayat (id, setoran_id, ayat_number, score, catatan_teks) VALUES (?, ?, ?, ?, ?)").bind(revId, setoran_id, rev.ayat_number, rev.score, rev.catatan_teks || '').run()
    }
    await db.prepare("UPDATE setoran SET status = 'reviewed' WHERE id = ?").bind(setoran_id).run()
    return new Response(JSON.stringify({ success: true, message: 'Review berhasil disimpan' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
}
