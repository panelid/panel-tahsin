// GET /api/admin/guru-pending — list guru menunggu
// POST /api/admin/guru-approve — body: {adminId, verificationId, action: approve|reject}
export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB;
  const rows = await db.prepare(
    "SELECT gv.id, gv.user_id, gv.demo_audio_url, gv.cert_url, u.name FROM guru_verification gv JOIN users u ON u.id = gv.user_id WHERE gv.status = 'pending'"
  ).all();
  return json(rows.results || []);
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const db = env.DB;
  const { adminId, verificationId, action } = await request.json().catch(() => ({}));
  const admin = await db.prepare("SELECT is_admin FROM users WHERE id = ?").bind(adminId).first();
  if (!admin || !admin.is_admin) return json({ error: 'Forbidden' }, 403);

  if (action === 'approve') {
    const gv = await db.prepare("SELECT user_id FROM guru_verification WHERE id = ?").bind(verificationId).first();
    if (gv) {
      await db.prepare("UPDATE users SET role = 'guru' WHERE id = ?").bind(gv.user_id).run();
      await db.prepare("UPDATE guru_verification SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
        .bind(adminId, verificationId).run();
    }
  } else if (action === 'reject') {
    await db.prepare("UPDATE users SET role = 'guru_pending' WHERE id = (SELECT user_id FROM guru_verification WHERE id = ?)").bind(verificationId).run();
    await db.prepare("UPDATE guru_verification SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
      .bind(adminId, verificationId).run();
  }
  return json({ success: true });
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
