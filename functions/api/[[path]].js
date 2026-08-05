import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

const app = new Hono().basePath('/api')

// Test endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', message: 'Panel Tahsin API active!' })
})

// Register (Tanpa verifikasi email, langsung aktif)
app.post('/auth/register', async (c) => {
  try {
    const { name, email, password, role } = await c.req.json()
    if (!name || !email || !password || !role) {
      return c.json({ success: false, error: 'Semua field wajib diisi' }, 400)
    }

    if (!['murid', 'guru'].includes(role)) {
      return c.json({ success: false, error: 'Role tidak valid' }, 400)
    }

    const db = c.env.DB
    if (!db) {
      return c.json({ success: false, error: 'Database D1 belum terikat (binding DB missing)' }, 500)
    }

    // Cek email
    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()
    if (existing) {
      return c.json({ success: false, error: 'Email sudah terdaftar' }, 400)
    }

    const id = 'usr_' + Date.now() + Math.random().toString(36).substring(2, 7)
    
    await db.prepare(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, name, email, password, role).run()

    return c.json({ 
      success: true, 
      message: 'Registrasi berhasil!', 
      user: { id, name, email, role } 
    })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Login
app.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) {
      return c.json({ success: false, error: 'Email dan password wajib diisi' }, 400)
    }

    const db = c.env.DB
    const user = await db.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?").bind(email, password).first()

    if (!user) {
      return c.json({ success: false, error: 'Email atau password salah' }, 401)
    }

    return c.json({
      success: true,
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Setoran API
app.post('/setoran/create', async (c) => {
  try {
    const { user_id, audio_url } = await c.req.json()
    if (!user_id || !audio_url) {
      return c.json({ success: false, error: 'Data setoran tidak lengkap' }, 400)
    }

    const db = c.env.DB
    const id = 'set_' + Date.now() + Math.random().toString(36).substring(2, 7)

    await db.prepare(
      "INSERT INTO setoran (id, user_id, audio_url, status) VALUES (?, ?, ?, 'pending')"
    ).bind(id, user_id, audio_url).run()

    return c.json({ success: true, message: 'Setoran berhasil dikirim', setoran_id: id })
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
    let stmt

    if (role === 'murid' && user_id) {
      stmt = db.prepare(query + " WHERE s.user_id = ? ORDER BY s.created_at DESC").bind(user_id)
    } else {
      stmt = db.prepare(query + " ORDER BY s.created_at DESC")
    }

    const { results } = await stmt.all()
    return c.json({ success: true, setoran: results })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Review API
app.post('/review/submit', async (c) => {
  try {
    const { setoran_id, reviews } = await c.req.json()
    if (!setoran_id || !reviews || !Array.isArray(reviews)) {
      return c.json({ success: false, error: 'Data review tidak valid' }, 400)
    }

    const db = c.env.DB

    for (const rev of reviews) {
      const revId = 'rev_' + Date.now() + Math.random().toString(36).substring(2, 7)
      await db.prepare(
        "INSERT INTO review_ayat (id, setoran_id, ayat_number, score, catatan_teks) VALUES (?, ?, ?, ?, ?)"
      ).bind(revId, setoran_id, rev.ayat_number, rev.score, rev.catatan_teks || '').run()
    }

    await db.prepare("UPDATE setoran SET status = 'reviewed' WHERE id = ?").bind(setoran_id).run()

    return c.json({ success: true, message: 'Review berhasil disimpan' })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

export const onRequest = handle(app)
