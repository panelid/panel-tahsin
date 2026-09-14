// /api/setoran/delete-request
// POST {action:'request', setoran_id, uid, reason}  -> santri ajukan hapus setoran (mis. guru salah ACC)
// POST {action:'cancel',  setoran_id, uid}          -> tarik pengajuan
// POST {action:'decide',  id, uid, approve}         -> guru/admin putuskan; approve = setoran benar2 terhapus
import { reqUid } from '../_auth.js';
export async function onRequestPost(context) {
  const { env, request } = context;
  const db = env.DB;
  let b = {}; try { b = await request.json(); } catch (e) { }
  const action = b.action;
  const uid = await reqUid(request, env);
  if (!uid) return json({ error: 'login required' }, 401);

  if (action === 'request') {
    const s = await db.prepare("SELECT id, user_id, status FROM setoran WHERE id = ?").bind(b.setoran_id).first();
    if (!s) return json({ error: 'setoran tidak ditemukan' }, 404);
    if (s.user_id !== uid) return json({ error: 'bukan setoranmu' }, 403);
    if (s.status !== 'reviewed') return json({ error: 'setoran belum direview — hapus langsung saja' }, 400);
    const ex = await db.prepare("SELECT id, status FROM delete_requests WHERE setoran_id = ?").bind(b.setoran_id).first();
    if (ex && ex.status === 'pending') return json({ error: 'pengajuan sudah dikirim, tunggu ustadz' }, 409);
    if (ex) await db.prepare("DELETE FROM delete_requests WHERE id = ?").bind(ex.id).run();
    const id = 'dr_' + Date.now() + Math.random().toString(36).slice(2, 7);
    await db.prepare("INSERT INTO delete_requests (id, setoran_id, user_id, reason) VALUES (?, ?, ?, ?)")
      .bind(id, b.setoran_id, uid, String(b.reason || '').slice(0, 300)).run();
    return json({ success: true, id });
  }

  if (action === 'cancel') {
    await db.prepare("DELETE FROM delete_requests WHERE setoran_id = ? AND user_id = ? AND status = 'pending'").bind(b.setoran_id, uid).run();
    return json({ success: true });
  }

  if (action === 'decide') {
    const me = await db.prepare("SELECT role, is_admin FROM users WHERE id = ?").bind(uid).first();
    if (!me || (me.role !== 'guru' && !me.is_admin)) return json({ error: 'hanya ustadz yang bisa memutuskan' }, 403);
    const dr = await db.prepare("SELECT * FROM delete_requests WHERE id = ?").bind(b.id).first();
    if (!dr) return json({ error: 'pengajuan tidak ditemukan' }, 404);
    if (!b.approve) {
      await db.prepare("UPDATE delete_requests SET status = 'rejected', reviewed_by = ? WHERE id = ?").bind(uid, b.id).run();
      return json({ success: true, status: 'rejected' });
    }
    await db.prepare("DELETE FROM review_ayat WHERE setoran_id = ?").bind(dr.setoran_id).run();
    await db.prepare("DELETE FROM setoran WHERE id = ?").bind(dr.setoran_id).run();
    await db.prepare("UPDATE delete_requests SET status = 'approved', reviewed_by = ? WHERE id = ?").bind(uid, b.id).run();
    return json({ success: true, status: 'approved', deleted: dr.setoran_id });
  }

  return json({ error: 'action tidak dikenal' }, 400);
}

// GET /api/setoran/delete-request?uid=  -> ustadz: daftar pending; siapa saja: pengajuan miliknya
export async function onRequestGet(context) {
  const { env, request } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const uid = url.searchParams.get('uid');
  if (!uid) return json({ error: 'uid required' }, 400);
  const me = await db.prepare("SELECT role, is_admin FROM users WHERE id = ?").bind(uid).first();
  if (me && (me.role === 'guru' || me.is_admin)) {
    const r = await db.prepare(
      "SELECT dr.id, dr.setoran_id, dr.reason, dr.created_at, u.name AS santri, s.track_id, s.unit_ref, s.audio_url FROM delete_requests dr JOIN users u ON u.id = dr.user_id JOIN setoran s ON s.id = dr.setoran_id WHERE dr.status = 'pending' ORDER BY dr.created_at DESC").all();
    return json({ pending: r.results || [] });
  }
  const mine = await db.prepare("SELECT setoran_id, status FROM delete_requests WHERE user_id = ? AND status = 'pending'").bind(uid).all();
  return json({ mine: mine.results || [] });
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
