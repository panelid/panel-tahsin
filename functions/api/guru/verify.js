// POST /api/guru/verify — guru submit demo + cert
export async function onRequestPost(context) {
  const { env, request } = context;
  const db = env.DB;
  if (!db) return json({ error: 'DB error' }, 500);
  const { userId, demoAudioUrl, certUrl } = await request.json().catch(() => ({}));
  if (!userId) return json({ error: 'userId required' }, 400);

  const id = 'gv_' + Date.now();
  await db.prepare(
    "INSERT INTO guru_verification (id, user_id, demo_audio_url, cert_url, status) VALUES (?, ?, ?, ?, 'pending')"
  ).bind(id, userId, demoAudioUrl || '', certUrl || '').run();

  // set role ke pending
  await db.prepare("UPDATE users SET role = 'guru_pending' WHERE id = ?").bind(userId).run();
  return json({ success: true, verification_id: id });
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
