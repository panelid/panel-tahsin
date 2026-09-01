export async function onRequestGet() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://ponpes.org/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://ponpes.org/dashboard-murid</loc><priority>0.8</priority></url>
  <url><loc>https://ponpes.org/dashboard-guru</loc><priority>0.8</priority></url>
  <url><loc>https://ponpes.org/u/sobur</loc><priority>0.6</priority></url>
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
