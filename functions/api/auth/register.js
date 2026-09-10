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
    const { name, email, password, role, wa_number, ref } = await request.json()
    if (!name || !email || !password || !role) return new Response(JSON.stringify({ success: false, error: 'Semua field wajib diisi' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    if (!['murid', 'guru'].includes(role)) return new Response(JSON.stringify({ success: false, error: 'Role tidak valid' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    const db = env.DB
    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()
    if (existing) return new Response(JSON.stringify({ success: false, error: 'Email sudah terdaftar' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    const id = 'usr_' + Date.now() + Math.random().toString(36).substring(2, 7)
    const referralCode = id.slice(4, 12)
    let referredBy = null
    if (ref) {
      const refUser = await db.prepare("SELECT id FROM users WHERE referral_code = ?").bind(ref).first()
      if (refUser) referredBy = refUser.id
    }
    const pwHash = await hashPassword(password)
    await db.prepare("INSERT INTO users (id, name, email, password_hash, role, wa_number, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, name, email, pwHash, role, wa_number || null, referralCode, referredBy).run()
    if (referredBy) {
      await db.prepare("INSERT INTO referrals (id, referrer_id, referred_id) VALUES (?, ?, ?)")
        .bind('ref_' + Date.now(), referredBy, id).run()
      const refUser = await db.prepare("SELECT wa_number, name FROM users WHERE id = ?").bind(referredBy).first()
      if (refUser && refUser.wa_number) {
        await sendWA(refUser.wa_number, `🎉 ${name} mendaftar lewat undangan kamu di Ponpes Digital!`)
      }
    }
    if (wa_number) {
      await sendWA(wa_number, `Assalamu'alaikum ${name}! Selamat datang di Ponpes Digital 📖 Platform tahsin & ngaji online gratis. Kode referral kamu: ${referralCode}`)
    }
    return new Response(JSON.stringify({ success: true, message: 'Registrasi berhasil!', user: { id, name, email, role, referral_code: referralCode } }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
}
