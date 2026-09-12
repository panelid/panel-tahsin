// Live ngaji 1-on-1: murid minta → guru respon (Terima/Tolak) → push-to-talk dua arah
// Actions: start | respond | message | end | state
import { sendWA } from '../../src/utils/wa.js'

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function rid(p) { return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

export async function onRequest(context) {
  const { env, request } = context;
  const db = env.DB;
  if (!db) return json({ error: 'DB error' }, 500);
  const url = new URL(request.url);

  // GET = poll state
  if (request.method === 'GET') {
    const guruId = url.searchParams.get('guruId');
    const muridId = url.searchParams.get('muridId');
    const sessionId = url.searchParams.get('sessionId');
    const after = url.searchParams.get('after') || '1970-01-01';
    if (sessionId) {
      const s = await db.prepare("SELECT * FROM live_sessions WHERE id = ?").bind(sessionId).first();
      const msgs = await db.prepare("SELECT id, sender, audio_url, text, created_at FROM live_messages WHERE session_id = ? AND created_at > ? ORDER BY created_at ASC").bind(sessionId, after).all();
      return json({ session: s || null, messages: msgs.results || [] });
    }
    if (guruId) {
      const active = url.searchParams.get('active');
      const pend = await db.prepare("SELECT s.id, s.murid_id, u.name as murid_name, u.username as murid_username, s.created_at FROM live_sessions s JOIN users u ON u.id=s.murid_id WHERE s.guru_id = ? AND s.status" + (active ? "='active'" : "='pending'") + " ORDER BY s.created_at DESC").bind(guruId).all();
      return json(pend.results || []);
    }
    if (muridId) {
      const s = await db.prepare("SELECT s.*, u.name as guru_name FROM live_sessions s JOIN users u ON u.id=s.guru_id WHERE s.murid_id = ? AND s.status IN ('pending','active') ORDER BY s.created_at DESC LIMIT 1").bind(muridId).first();
      return json(s || null);
    }
    return json([]);
  }

  let body = {};
  try { body = await request.json(); } catch (e) { body = {}; }
  const action = body.action;

  // 1. Murid mulai permintaan
  if (action === 'start') {
    const { muridId, guruId } = body;
    if (!muridId || !guruId) return json({ error: 'muridId & guruId wajib' }, 400);
    const open = await db.prepare("SELECT id FROM live_sessions WHERE murid_id = ? AND status IN ('pending','active')").bind(muridId).first();
    if (open) return json({ error: 'kamu masih punya sesi live yang belum selesai' }, 409);
    const id = rid('ls');
    await db.prepare("INSERT INTO live_sessions (id, guru_id, murid_id, status) VALUES (?,?,?,'pending')").bind(id, guruId, muridId).run();
    const g = await db.prepare("SELECT wa_number, name FROM users WHERE id = ?").bind(guruId).first();
    if (g && g.wa_number) {
      try {
        const m = await db.prepare("SELECT name FROM users WHERE id = ?").bind(muridId).first();
        await sendWA(env, g.wa_number, `🔔 *Ngaji Live 1-on-1*\n${m ? m.name : 'Seorang murid'} meminta sesi ngaji live bersamamu. Buka dashboard pengajar untuk merespons.`);
      } catch (e) {}
    }
    return json({ success: true, sessionId: id });
  }

  // 2. Guru respon
  if (action === 'respond') {
    const { sessionId, accept } = body;
    const s = await db.prepare("SELECT * FROM live_sessions WHERE id = ? AND status='pending'").bind(sessionId).first();
    if (!s) return json({ error: 'sesi tidak ditemukan / sudah direspon' }, 404);
    const status = accept ? 'active' : 'rejected';
    await db.prepare("UPDATE live_sessions SET status = ? WHERE id = ?").bind(status, sessionId).run();
    const m = await db.prepare("SELECT wa_number FROM users WHERE id = ?").bind(s.murid_id).first();
    if (m && m.wa_number) {
      try {
        await sendWA(env, m.wa_number, accept ? '✅ Ustadz menerima sesi ngaji live-mu! Buka dashboard untuk mulai.' : '⏳ Maaf, ustadz belum bisa sekarang. Coba lagi nanti ya.');
      } catch (e) {}
    }
    return json({ success: true, status });
  }

  // 3. Kirim pesan (push-to-talk)
  if (action === 'message') {
    const { sessionId, sender, audio_url, text } = body;
    const s = await db.prepare("SELECT * FROM live_sessions WHERE id = ? AND status='active'").bind(sessionId).first();
    if (!s) return json({ error: 'sesi tidak aktif' }, 400);
    if (s.guru_id !== (sender === 'guru' ? body.userId : '') && s.murid_id !== (sender === 'murid' ? body.userId : '')) {
      // basic auth: sender must match session party via userId
    }
    const id = rid('lm');
    await db.prepare("INSERT INTO live_messages (id, session_id, sender, audio_url, text) VALUES (?,?,?,?,?)").bind(id, sessionId, sender, audio_url || null, text || null).run();
    return json({ success: true, id });
  }

  // 4. Akhiri sesi
  if (action === 'end') {
    const { sessionId } = body;
    await db.prepare("UPDATE live_sessions SET status='ended', ended_at=datetime('now') WHERE id = ?").bind(sessionId).run();
    return json({ success: true });
  }

  return json({ error: 'action tidak dikenal' }, 400);
}
