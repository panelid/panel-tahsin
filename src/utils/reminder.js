// Cron reminder: cek murid yang belum setor >2 hari, kirim WA reminder.
// Jalankan via cron harian. Butuh WA token (Meta) di env.

import { sendWA } from './wa.js';

export async function remindInactiveMurid(env) {
  const db = env.DB;
  if (!db) return { error: 'no DB' };

  // murid yang setor terakhir > 2 hari lalu (atau belum pernah)
  const rows = await db.prepare(`
    SELECT u.id, u.name, u.wa_number,
      MAX(s.created_at) as last_setoran
    FROM users u
    LEFT JOIN setoran s ON s.user_id = u.id
    WHERE u.role = 'murid'
    GROUP BY u.id
    HAVING last_setoran IS NULL
       OR last_setoran < datetime('now', '-2 days')
    LIMIT 100
  `).all();

  let sent = 0;
  for (const r of rows.results || []) {
    if (!r.wa_number) continue;
    const ok = await sendWA(
      r.wa_number,
      `📖 Assalamu'alaikum ${r.name}, yuk setor tahsin hari ini! Konsistensi kunci kemajuan.`
    );
    if (ok) sent++;
  }
  return { checked: rows.results?.length || 0, sent };
}
