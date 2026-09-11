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
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database D1 belum terikat' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const formData = await request.formData()
    const file = formData.get('audio')
    const userId = formData.get('user_id')
    const trackId = formData.get('track_id') || null
    const unitRef = formData.get('unit_ref') || null

    if (!file || !userId) {
      return new Response(JSON.stringify({ success: false, error: 'Data tidak lengkap' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk)
    }
    const base64 = btoa(binary)
    const audioDataUrl = `data:audio/webm;base64,${base64}`

    const setoranId = 'set_' + Date.now() + Math.random().toString(36).substring(2, 7)

        await db.prepare(
          "INSERT INTO setoran (id, user_id, track_id, unit_ref, audio_url, status) VALUES (?, ?, ?, ?, ?, 'pending')"
        ).bind(setoranId, userId, trackId, unitRef, audioDataUrl).run()

        // WA notif ke guru (cari guru pertama / INSTRUCTOR_WA env)
        try {
          const { notifyUstadzNewSetoran } = await import('../../../src/utils/wa.js')
          const murid = await db.prepare("SELECT name FROM users WHERE id = ?").bind(userId).first()
          const guru = await db.prepare("SELECT wa_number FROM users WHERE role = 'guru' AND wa_number IS NOT NULL LIMIT 1").first()
          const instructorWa = env && env.INSTRUCTOR_WA
          const target = instructorWa || (guru && guru.wa_number)
          if (target) {
            await notifyUstadzNewSetoran(target, murid ? murid.name : 'Santri', setoranId, env)
          }
        } catch (waErr) {
          console.warn('[WA] notify skipped:', waErr.message)
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Setoran berhasil dikirim!',
          setoran_id: setoranId,
          audio_url: audioDataUrl
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
