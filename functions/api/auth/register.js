// POST /api/auth/register
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

import { hashPassword } from '../../../src/utils/hash.js'
import { sendWA, notifyMuridReviewed, notifyUstadzNewSetoran } from '../../../src/utils/wa.js'

export async function onRequestPost(context) {
  const { env, request } = context
  try {
    const { name, email, password, role, wa_number, ref, username, become_student, goal, level } = await request.json()
    if (!name || !email || !password || !role) return json({ success: false, error: 'Semua field wajib diisi' }, 400)
    if (!['murid', 'guru'].includes(role)) return json({ success: false, error: 'Role tidak valid' }, 400)
    const isStudent = role === 'guru' && become_student ? 1 : 0
    const uname = (username || '').toString().trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) return json({ success: false, error: 'Username 3-20 huruf/angka/underscore' }, 400)
    const ggoal = ['read','tartil','hafalan','koreksi'].includes(goal) ? goal : 'read'
    const glevel = ['beginner','basic','fluent'].includes(level) ? level : 'beginner'
    const db = env.DB
    const existingEmail = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()
    if (existingEmail) return json({ success: false, error: 'Email sudah terdaftar' }, 400)
    const existingUname = await db.prepare("SELECT id FROM users WHERE username = ?").bind(uname).first()
    if (existingUname) return json({ success: false, error: 'Username sudah diambil' }, 400)

    const id = 'usr_' + Date.now() + Math.random().toString(36).substring(2, 7)
    const referralCode = id.slice(4, 12)
    let referredBy = null
    if (ref) {
      const refUser = await db.prepare("SELECT id FROM users WHERE referral_code = ?").bind(ref).first()
      if (refUser) referredBy = refUser.id
    }
    const pwHash = await hashPassword(password)
    await db.prepare("INSERT INTO users (id, name, email, password_hash, role, wa_number, referral_code, referred_by, username, is_student, goal, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, name, email, pwHash, role, wa_number || null, referralCode, referredBy, uname, isStudent, ggoal, glevel).run()
    if (referredBy) {
      await db.prepare("INSERT INTO referrals (id, referrer_id, referred_id) VALUES (?, ?, ?)")
        .bind('ref_' + Date.now(), referredBy, id).run()
      const refUser = await db.prepare("SELECT wa_number, name FROM users WHERE id = ?").bind(referredBy).first()
      if (refUser && refUser.wa_number) {
        await sendWA(refUser.wa_number, `🎉 ${name} mendaftar lewat undangan kamu di Ponpes Digital!`, env)
      }
    }
    if (wa_number) {
      await sendWA(wa_number, `Assalamu'alaikum ${name}! Selamat datang di Ponpes Digital 📖 Platform tahsin & ngaji online gratis. Kode referral kamu: ${referralCode}`, env)
    }
    return json({ success: true, message: 'Registrasi berhasil!', user: { id, name, email, role, referral_code: referralCode, username: uname } })
  } catch (err) {
    return json({ success: false, error: err.message }, 500)
  }
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
