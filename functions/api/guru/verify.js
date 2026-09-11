// POST /api/guru/verify — daftar pengajar: upload sanad/cert + isian Ma'had + setor bacaan Al-Hajj 1-5
import { sendWA } from '../../../src/utils/wa.js'
export async function onRequestPost(context) {
  const { env, request } = context
  try {
    const db = env.DB
    if (!db) return json({ error: 'DB error' }, 500)
    const fd = await request.formData()
    const userId = fd.get('userId')
    const sanadUrl = fd.get('sanadUrl') || ''
    const mahadText = fd.get('mahadText') || ''
    const certUrl = fd.get('certUrl') || ''
    const audio = fd.get('audio') // wajib: bacaan Al-Hajj 1-5
    if (!userId) return json({ error: 'userId required' }, 400)
    if (!audio) return json({ error: 'Wajib setor bacaan Al-Hajj 1-5' }, 400)
    if (!sanadUrl && !mahadText && !certUrl) return json({ error: 'Upload sertifikat sanad ATAU isi riwayat Ma\'had' }, 400)

    // simpan audio sebagai setoran (track hafalan unit Al-Hajj 1-5)
    const buf = new Uint8Array(await audio.arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192))
    const audioUrl = 'data:audio/webm;base64,' + btoa(bin)
    const setoranId = 'set_' + Date.now() + Math.random().toString(36).slice(2, 7)
    await db.prepare("INSERT INTO setoran (id, user_id, track_id, unit_ref, audio_url, status) VALUES (?, ?, 'hafalan', 'Al-Hajj 1-5', ?, 'pending')")
      .bind(setoranId, userId, audioUrl).run()

    const id = 'gv_' + Date.now()
    await db.prepare("INSERT INTO guru_verification (id, user_id, demo_audio_url, cert_url, sanad_url, mahad_text, setoran_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')")
      .bind(id, userId, audioUrl, certUrl, sanadUrl, mahadText, setoranId).run()
    await db.prepare("UPDATE users SET role = 'guru_pending' WHERE id = ?").bind(userId).run()

    // notif semua guru ada calon baru (skip kalau token kosong)
    const gurus = await db.prepare("SELECT wa_number, name FROM users WHERE role = 'guru' AND wa_number IS NOT NULL").all()
    for (const g of (gurus.results || [])) {
      await sendWA(g.wa_number, `📩 Ada calon pengajar baru menunggu review di Ponpes Digital. Buka dashboard untuk ACC/Tolak.`, env)
    }
    return json({ success: true, verification_id: id, setoran_id: setoranId })
  } catch (e) { return json({ error: e.message }, 500) }
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
