// Shared auth: signed token (uid + exp), HMAC-SHA256. Replace client-side `uid` trust.
// Token dikirim via ?token= , header x-auth-token, atau body JSON {token}.
function secret(env) { return (env && env.AUTH_SECRET) || 'ponpes-dev-secret'; }

async function hmac(msg, key) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function signToken(uid, env) {
  const exp = Math.floor(Date.now() / 1000) + 2592000; // 30 hari
  const body = btoa(JSON.stringify({ uid, exp }));
  return body + '.' + (await hmac(body, secret(env)));
}

export async function verifyToken(token, env) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if ((await hmac(body, secret(env))) !== sig) return null;
  try {
    const p = JSON.parse(atob(body));
    if (!p.exp || p.exp < Date.now() / 1000) return null;
    return p.uid;
  } catch { return null; }
}

export function reqToken(request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('token');
  if (q) return q;
  const h = request.headers.get('x-auth-token');
  if (h) return h;
  return null;
}

// Ambil uid terverifikasi dari request. Null kalau token invalid/absen.
export async function reqUid(request, env) {
  return await verifyToken(reqToken(request), env);
}

// Body JSON helper yang aman.
export async function bodyJSON(request) {
  try { return await request.json(); } catch { return {}; }
}

// Cek role user.
export async function roleOf(uid, db) {
  if (!uid) return null;
  return await db.prepare('SELECT id, role, is_admin FROM users WHERE id = ?').bind(uid).first();
}

// Rate limiter sederhana via D1. key = "login:ip:email". Return false kalau kena limit.
export async function limit(db, key, max, windowMin) {
  await db.prepare("DELETE FROM rate_limit WHERE ts < datetime('now', ?)").bind('-' + windowMin + ' minutes').run();
  const c = await db.prepare('SELECT COUNT(*) c FROM rate_limit WHERE key = ?').bind(key).first();
  if (c && c.c >= max) return false;
  await db.prepare('INSERT INTO rate_limit (key) VALUES (?)').bind(key).run();
  return true;
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || '0.0.0.0';
}
