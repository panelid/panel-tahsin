export async function onRequestGet() {
  return new Response(`# Ponpes Digital — llms.txt
Ponpes Digital adalah platform tahsin online gratis di ponpes.org.

## Apa itu
Platform belajar membaca Al-Quran secara online: setor bacaan, dapat review dari ustadz.

## Track belajar
- Iqro
- Al-Fatihah
- Juz Amma
- Tilawah
- Hafalan

## Fitur
- Daftar gratis tanpa verifikasi email
- Profil publik per santri (ponpes.org/u/{kode_referral})
- Guru diverifikasi oleh admin (@sobur)
- Referral: ajak teman, lihat di profil

## Akses
- Beranda: https://ponpes.org/
- Dashboard murid: https://ponpes.org/dashboard-murid
- Dashboard guru: https://ponpes.org/dashboard-guru

Dibangun di Cloudflare Pages + D1. Gratis untuk semua.
`, { headers: { 'Content-Type': 'text/plain' } });
}
