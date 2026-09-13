// Middleware: intercept /@username -> public profile. Path static/known routes pass through.
import { renderPublicProfile } from './u/profile.js';

const KNOWN = ['/', '/login', '/daftar', '/daftar-guru', '/dashboard-murid', '/dashboard-guru', '/index.html', '/favicon.ico', '/favicon.svg', '/robots.txt', '/sitemap.xml', '/assets', '/api', '/cdn-cgi', '/404.html'];
function isKnown(path) {
  if (path.startsWith('/assets/') || path.startsWith('/api/') || path.startsWith('/cdn-cgi/')) return true;
  return KNOWN.includes(path);
}
const FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#15403A"/><path d="M32 12l14 8v10c0 10-6 17-14 22-8-5-14-12-14-22V20z" fill="#C99A3F"/><path d="M32 20c-3 3-6 5-6 9a6 6 0 0012 0c0-4-3-6-6-9z" fill="#15403A"/></svg>';
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const p = url.pathname;
  // favicon: serve SVG betulan, bukan HTML
  if (p === '/favicon.ico' || p === '/favicon.svg') {
    return new Response(FAVICON_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });
  }
  if (p.startsWith('/@') && p.length > 2) {
    const username = p.slice(2);
    if (/^[a-z0-9_]{3,20}$/.test(username)) {
      const res = await renderPublicProfile(context, username);
      if (!res) return new Response('Profil tidak ditemukan', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      if (res.hidden) return new Response(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Profil privat · ponpes.org</title><link rel="stylesheet" href="/assets/app.css"></head><body data-page="profile"><div id="hdr"></div><div class="wrap" style="max-width:480px;padding-top:30px"><div class="empty"><span class="big">🔒</span><h3 style="margin-bottom:6px">Profil privat</h3><p>${esc(res.name)} menyembunyikan profil publik ini.</p><a href="/" class="btn btn-ghost btn-block" style="margin-top:16px">← Kembali ke beranda</a></div></div></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      return res;
    }
  }
  // redirect legacy /u/xxx -> /@xxx
  if (p.startsWith('/u/') && p.length > 3) return new Response(null, { status: 301, headers: { 'Location': '/' + p.slice(3) } });
  return context.next();
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
