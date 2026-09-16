// WA notif via DL-BOX bridge (Baileys, nomor 62881010313264) — ganti Meta Cloud API.
// Endpoint: POST {WAAPI_BASE}/waapi/send  body {key, to, text}
// Env di CF Pages: WAAPI_BASE (https://panelid.xcodepod.cloud), WAAPI_KEY.

export async function sendWA(to, text, env) {
  const base = (env && env.WAAPI_BASE) || 'https://panelid.xcodepod.cloud';
  const key = env && env.WAAPI_KEY;
  if (!key) { console.warn('[WA] WAAPI_KEY belum diset, skip'); return false; }
  const wa = String(to || '').replace(/[^\d]/g, '');
  if (!wa) { console.warn('[WA] nomor kosong, skip'); return false; }
  try {
    const res = await fetch(`${base}/waapi/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, to: wa, text })
    });
    if (!res.ok) { console.error('[WA] send fail', res.status, await res.text().catch(() => '')); return false; }
    return true;
  } catch (e) { console.error('[WA] send err', e.message); return false; }
}

// Hooks into setoran/review flow
export async function notifyUstadzNewSetoran(ustadzWa, muridName, setoranId, env) {
  return sendWA(ustadzWa, `📥 Setoran baru dari ${muridName}. ID: ${setoranId}. Silakan review.`, env);
}

export async function notifyMuridReviewed(muridWa, score, catatan, env) {
  const msg = `✅ Setoran kamu direview. Skor: ${score}/10.${catatan ? '\nCatatan: ' + catatan : ''}`;
  return sendWA(muridWa, msg, env);
}
