import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

const app = new Hono().basePath('/api')

app.get('/health', (c) => c.json({ status: 'ok' }))

app.post('/auth/register', async (c) => {
  try {
    const { name, email, password, role } = await c.req.json()
    const db = c.env.DB
    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()
    if (existing) return c.json({ success: false, error: 'Email sudah terdaftar' }, 400)
    
    const id = 'usr_' + Date.now() + Math.random().toString(36).substring(2, 7)
    await db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)").bind(id, name, email, password, role).run()
    return c.json({ success: true, message: 'Registrasi berhasil!', user: { id, name, email, role } })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

app.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    const db = c.env.DB
    const user = await db.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?").bind(email, password).first()
    if (!user) return c.json({ success: false, error: 'Email atau password salah' }, 401)
    return c.json({ success: true, message: 'Login berhasil', user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

app.post('/setoran/upload', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.parseBody()
    const file = body['audio']
    const userId = body['user_id']

    if (!file || !userId) return c.json({ success: false, error: 'Data tidak lengkap' }, 400)

    let audioDataUrl = ''
    if (typeof file === 'object' && file.arrayBuffer) {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      audioDataUrl = `data:audio/webm;base64,${base64}`
    } else {
      audioDataUrl = String(file)
    }

    const setoranId = 'set_' + Date.now() + Math.random().toString(36).substring(2, 7)
    await db.prepare("INSERT INTO setoran (id, user_id, audio_url, status) VALUES (?, ?, ?, 'pending')").bind(setoranId, userId, audioDataUrl).run()
    return c.json({ success: true, message: 'Setoran berhasil dikirim!', setoran_id: setoranId })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

app.get('/setoran', async (c) => {
  try {
    const db = c.env.DB
    const user_id = c.req.query('user_id')
    const role = c.req.query('role')
    let query = "SELECT s.*, u.name as murid_name FROM setoran s JOIN users u ON s.user_id = u.id"
    let stmt = (role === 'murid' && user_id) ? db.prepare(query + " WHERE s.user_id = ? ORDER BY s.created_at DESC").bind(user_id) : db.prepare(query + " ORDER BY s.created_at DESC")
    const { results } = await stmt.all()
    return c.json({ success: true, setoran: results })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

app.post('/review/submit', async (c) => {
  try {
    const db = c.env.DB
    const { setoran_id, reviews } = await c.req.json()
    for (const rev of reviews) {
      const revId = 'rev_' + Date.now() + Math.random().toString(36).substring(2, 7)
      await db.prepare("INSERT INTO review_ayat (id, setoran_id, ayat_number, score, catatan_teks) VALUES (?, ?, ?, ?, ?)").bind(revId, setoran_id, rev.ayat_number, rev.score, rev.catatan_teks || '').run()
    }
    await db.prepare("UPDATE setoran SET status = 'reviewed' WHERE id = ?").bind(setoran_id).run()
    return c.json({ success: true, message: 'Review berhasil disimpan' })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

export const onRequest = handle(app)
