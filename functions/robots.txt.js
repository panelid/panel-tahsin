export async function onRequestGet() {
  return new Response(`User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://ponpes.org/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain' } });
}
