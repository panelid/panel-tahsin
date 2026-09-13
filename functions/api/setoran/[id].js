// DELETE /api/setoran/{id}?uid=<user_id>          -> hapus setoran milik sendiri (hanya belum direview)
// PATCH /api/setoran/{id}  { uid, track_id }       -> ganti judul/track (tap dari daftar, bukan ketik)
const TRACKS = ['iqro', 'fatihah', 'juz_amma', 'tilawah', 'hafalan'];

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

export async function onRequestPatch(context) {
  const { env, request } = context;
  const db = env.DB;
  if (!db) return json({ error: 'DB error' }, 500);
  const id = context.params.id;
  let b = {}; try { b = await request.json(); } catch (e) { }
  if (!id || !b.uid) return json({ error: 'id & uid required' }, 400);
  if (!TRACKS.includes(b.track_id)) return json({ error: 'pelajaran tidak dikenal' }, 400);

  const row = await db.prepare("SELECT id, user_id, status FROM setoran WHERE id = ?").bind(id).first();
  if (!row) return json({ error: 'setoran tidak ditemukan' }, 404);
  if (row.user_id !== b.uid) return json({ error: 'bukan setoranmu' }, 403);
  if (row.status === 'reviewed') return json({ error: 'sudah direview — ajukan hapus dulu' }, 409);

  await db.prepare("UPDATE setoran SET track_id = ? WHERE id = ?").bind(b.track_id, id).run();
  return json({ success: true, id, track_id: b.track_id });
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
