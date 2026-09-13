// Auto-redirect kalau sudah login: index -> dashboard masing².
// Jalan di <head> sebelum render biar gak keliatan flash.
(function () {
  try {
    var p = location.pathname;
    if (p !== '/' && p !== '/index.html') return;      // cuma di homepage
    if (!localStorage.getItem('uid')) return;          // belum login
    var u = {}; try { u = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) {}
    var dest = u.role === 'guru' ? '/dashboard-guru' : '/dashboard-murid';
    location.replace(dest);
  } catch (e) {}
})();
