// POST /api/guru/promote { promoterId, muridEmail|muridId }
// Guru (atau admin) mengangkat murid jadi guru. Langsung aktif sebagai pengajar.
import { sendWA } from '../../../src/utils/wa.js'
export async function onRequestPost(context) {
  const { env, request } = context
  try {
    const { promoterId, muridEmail, muridId } = await request.json().catch(() => ({}))
    if (!promoterId) return json({ success: false, error: 'promoterId required' }, 400)
    const db = env.DB
    const prom = await db.prepare("SELECT id, role, is_admin, name FROM users WHERE id = ?").bind(promoterId).first()
    if (!prom || (prom.role !== 'guru' && !prom.is_admin)) return json({ success: false, error: 'hanya guru/admin yang bisa mengangkat' }, 403)

    let murid
    if (muridId) murid = await db.prepare("SELECT id, name, email, role, wa_number FROM users WHERE id = ?").bind(muridId).first()
    else if (muridEmail) murid = await db.prepare("SELECT id, name, email, role, wa_number FROM users WHERE email = ?").bind(muridEmail).first()
    if (!murid) return json({ success: false, error: 'murid tidak ditemukan' }, 404)
    if (murid.role === 'guru') return json({ success: false, error: 'sudah jadi guru' }, 400)

    // angkat: role -> guru, insert guru_verification approved
    await db.prepare("UPDATE users SET role = 'guru' WHERE id = ?").bind(murid.id).run()
    const vid = 'gv_' + Date.now()
    await db.prepare("INSERT INTO guru_verification (id, user_id, demo_audio_url, cert_url, status, reviewed_by, reviewed_at) VALUES (?, ?, '', '', 'approved', ?, datetime('now'))")
      .bind(vid, murid.id, promoterId).run()

    // WA notif ke murid (gak error kalau token kosong)
    if (murid.wa_number) {
      await sendWA(murid.wa_number, `🎓 Assalamu'alaikum ${murid.name}! Kamu diangkat menjadi Pengajar di Ponpes Digital oleh ${prom.name}. Login untuk mulai membimbing.`, env)
    }
    return json({ success: true, murid_id: murid.id, role: 'guru' })
  } catch (err) {
    return json({ success: false, error: err.message }, 500)
  }
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
