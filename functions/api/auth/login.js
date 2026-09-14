import { verifyPassword } from '../../../src/utils/hash.js'
import { signToken, limit, clientIp } from '../_auth.js'

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function onRequestPost(context) {
  const { env, request } = context
  try {
    const { email, password } = await request.json()
    if (!email || !password) return new Response(JSON.stringify({ success: false, error: 'Email dan password wajib diisi' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    const db = env.DB
    if (!await limit(db, 'login:' + clientIp(request) + ':' + String(email||'').slice(0,40), 8, 10)) return new Response(JSON.stringify({ success: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    const user = await db.prepare("SELECT id, name, email, password_hash, role, username, referral_code, is_student FROM users WHERE email = ?").bind(email).first();
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Email atau password salah' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) return new Response(JSON.stringify({ success: false, error: 'Email atau password salah' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    const token = await signToken(user.id, env)
    return new Response(JSON.stringify({ success: true, message: 'Login berhasil', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username, referral_code: user.referral_code, is_student: !!user.is_student } }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
}
