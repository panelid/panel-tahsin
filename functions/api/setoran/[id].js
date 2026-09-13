// DELETE /api/setoran/{id}?uid=<user_id>  -> hapus setoran milik sendiri
export async function onRequestDelete(context) {
  const { env, request } = context;
  const db = env.DB;
  if (!db) return json({ error: 'DB error' }, 500);
  const id = context.params.id;
  const uid = new URL(request.url).searchParams.get('uid');
  if (!id || !uid) return json({ error: 'id & uid required' }, 400);

  const row = await db.prepare("SELECT id, user_id, status FROM setoran WHERE id = ?").bind(id).first();
  if (!row) return json({ error: 'setoran tidak ditemukan' }, 404);
  if (row.user_id !== uid) return json({ error: 'bukan setoranmu' }, 403);

  await db.prepare("DELETE FROM setoran WHERE id = ?").bind(id).run();
  return json({ success: true, id });
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
