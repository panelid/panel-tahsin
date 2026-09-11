// POST /api/guru/review { guruId, verificationId, decision: 'acc'|'reject', catatan }
import { sendWA } from '../../../src/utils/wa.js'
export async function onRequestPost(context) {
  const { env, request } = context
  try {
    const db = env.DB
    const { guruId, verificationId, decision, catatan } = await request.json()
    if (!guruId || !verificationId || !['acc', 'reject'].includes(decision)) return json({ error: 'bad request' }, 400)
    const guru = await db.prepare("SELECT id, role, name FROM users WHERE id = ?").bind(guruId).first()
    if (!guru || guru.role !== 'guru') return json({ error: 'hanya guru yang bisa review' }, 403)

    // upsert vote (1 guru 1 vote)
    const existing = await db.prepare("SELECT id FROM guru_review WHERE verification_id = ? AND guru_id = ?").bind(verificationId, guruId).first()
    if (existing) {
      await db.prepare("UPDATE guru_review SET decision = ?, catatan = ?, created_at = datetime('now') WHERE id = ?").bind(decision, catatan || '', existing.id).run()
    } else {
      await db.prepare("INSERT INTO guru_review (id, verification_id, guru_id, decision, catatan) VALUES (?, ?, ?, ?, ?)")
        .bind('gr_' + Date.now(), verificationId, guruId, decision, catatan || '').run()
    }

    // hitung acc
    const acc = await db.prepare("SELECT COUNT(*) c FROM guru_review WHERE verification_id = ? AND decision='acc'").bind(verificationId).first()
    const v = await db.prepare("SELECT user_id, u_name FROM guru_verification gv JOIN users u ON u.id=gv.user_id WHERE gv.id = ?").bind(verificationId).first()

    if (acc.c >= 1) {
      await db.prepare("UPDATE users SET role = 'guru' WHERE id = ?").bind(v.user_id).run()
      await db.prepare("UPDATE guru_verification SET status='approved', reviewed_by=?, reviewed_at=datetime('now') WHERE id = ?").bind(guruId, verificationId).run()
      // notif ke calon
      const calon = await db.prepare("SELECT wa_number, name FROM users WHERE id = ?").bind(v.user_id).first()
      if (calon && calon.wa_number) await sendWA(calon.wa_number, `🎉 Selamat ${calon.name}! Kamu resmi menjadi Pengajar di Ponpes Digital. Login untuk mulai membimbing.`, env)
      return json({ success: true, status: 'approved', role: 'guru' })
    }
    return json({ success: true, status: 'pending', acc_count: acc.c })
  } catch (e) { return json({ error: e.message }, 500) }
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
