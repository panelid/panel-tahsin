export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequestPost(context) {
  const { env, request } = context
  try {
    const bucket = env.AUDIO
    const db = env.DB

    if (!bucket) {
      return new Response(JSON.stringify({ success: false, error: 'R2 Bucket belum terikat (binding AUDIO missing)' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const formData = await request.formData()
    const file = formData.get('audio')
    const userId = formData.get('user_id')

    if (!file || !userId) {
      return new Response(JSON.stringify({ success: false, error: 'File audio atau user_id tidak ditemukan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const fileName = `setoran/${userId}/${Date.now()}.webm`
    
    // Upload ke R2
    await bucket.put(fileName, file.stream(), {
      httpMetadata: { contentType: file.type || 'audio/webm' }
    })

    const audioUrl = `https://audio.ponpes.org/${fileName}` // Atau URL public R2
    const setoranId = 'set_' + Date.now() + Math.random().toString(36).substring(2, 7)

    // Simpan ke D1
    await db.prepare(
      "INSERT INTO setoran (id, user_id, audio_url, status) VALUES (?, ?, ?, 'pending')"
    ).bind(setoranId, userId, audioUrl).run()

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Setoran berhasil diupload dan disimpan!', 
      setoran_id: setoranId,
      audio_url: audioUrl
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
