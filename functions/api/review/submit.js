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
    const { setoran_id, reviews, unit_ref } = await request.json()
    if (!setoran_id || !reviews) return new Response(JSON.stringify({ success: false, error: 'Data tidak lengkap' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

    for (const rev of reviews) {
      const revId = 'rev_' + Date.now() + Math.random().toString(36).substring(2, 7)
      await db.prepare("INSERT INTO review_ayat (id, setoran_id, ayat_number, score, catatan_teks, unit_ref) VALUES (?, ?, ?, ?, ?, ?)").bind(revId, setoran_id, rev.ayat_number, rev.score, rev.catatan_teks || '', unit_ref || null).run()
    }
    await db.prepare("UPDATE setoran SET status = 'reviewed', unit_ref = ? WHERE id = ?").bind(unit_ref || null, setoran_id).run()

    // Advance enrollment unit if this setoran passed (avg score >= 7) and track known
    const s = await db.prepare("SELECT user_id, track_id, unit_ref FROM setoran WHERE id = ?").bind(setoran_id).first()
    if (s && s.track_id) {
      const avg = reviews.reduce((a, r) => a + (r.score || 0), 0) / (reviews.length || 1)
      if (avg >= 7) {
        await db.prepare("UPDATE enrollments SET current_unit = ? WHERE user_id = ? AND track_id = ? AND status = 'active'")
          .bind(unit_ref || null, s.user_id, s.track_id).run()
      }
      // WA notify murid
      const murid = await db.prepare("SELECT wa_number, name FROM users WHERE id = ?").bind(s.user_id).first()
      if (murid && murid.wa_number) {
        await notifyMuridReviewed(murid.wa_number, Math.round(avg), reviews[0]?.catatan_teks || '')
      }
    }
    return new Response(JSON.stringify({ success: true, message: 'Review berhasil disimpan', avg_score: reviews.reduce((a, r) => a + (r.score || 0), 0) / (reviews.length || 1) }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
}
