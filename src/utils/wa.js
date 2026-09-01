// WA notif via Meta WhatsApp Cloud API (free 1000 msgs/day)
// Docs: POST https://graph.facebook.com/v19.0/{PHONE_ID}/messages
// Needs: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID (Meta app), user wa number in E.164

export async function sendWA(to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.warn('[WA] not configured, skip');
    return false;
  }
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('[WA] send fail', json);
    return false;
  }
  return true;
}

// Hooks into setoran/review flow
export async function notifyUstadzNewSetoran(ustadzWa, muridName, setoranId) {
  return sendWA(ustadzWa, `📥 Setoran baru dari ${muridName}. ID: ${setoranId}. Silakan review.`);
}

export async function notifyMuridReviewed(muridWa, score, catatan) {
  const msg = `✅ Setoran kamu direview. Skor: ${score}/10.${catatan ? '\nCatatan: ' + catatan : ''}`;
  return sendWA(muridWa, msg);
}
