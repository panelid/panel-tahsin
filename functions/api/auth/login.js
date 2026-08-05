export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequestPost(context) {
  const { env, request } = context
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: 'Email dan password wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const db = env.DB
    const user = await db.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?").bind(email, password).first()

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Email atau password salah' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Login berhasil',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
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
