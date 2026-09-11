// POST /api/guru/toggle-student { userId, on:true|false } -> guru putuskan aktif/nonaktif mode murid
export async function onRequestPost(context) {
  const { env, request } = context
  try {
    const { userId, on } = await request.json()
    if (!userId) return json({ success: false, error: 'userId required' }, 400)
    const db = env.DB
    const user = await db.prepare("SELECT id, role, is_student FROM users WHERE id = ?").bind(userId).first()
    if (!user) return json({ success: false, error: 'user tidak ditemukan' }, 404)
    if (user.role !== 'guru') return json({ success: false, error: 'hanya pengajar yang bisa pakai ini' }, 400)
    const val = on ? 1 : 0
    await db.prepare("UPDATE users SET is_student = ? WHERE id = ?").bind(val, userId).run()
    return json({ success: true, is_student: !!val })
  } catch (err) {
    return json({ success: false, error: err.message }, 500)
  }
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
