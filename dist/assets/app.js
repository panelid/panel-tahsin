/* ponpes.org — shared chrome: header, bottom nav, user loader */
(function () {
  const me = JSON.parse(localStorage.getItem('user') || '{}');
  const page = document.body.dataset.page || '';
  const root = document.getElementById('hdr');
  if (root) {
    const av = (me.name || '?').trim().charAt(0).toUpperCase();
    root.className = 'hdr';
    root.innerHTML =
      '<div class="hdr-in">' +
      '<a href="/" class="brand"><span class="brand-mark">◈</span>ponpes<span style="opacity:.6;font-weight:400">.org</span></a>' +
      '<span class="spacer"></span>' +
      (me.name
        ? '<a class="chip" href="/u/@' + (me.username || '') + '"><span class="av">' + av + '</span>' + me.name.split(' ')[0] + '</a>'
        : '') +
      '</div>';
  }

  const items = {
    murid: [
      ['🏠', 'Beranda', '/dashboard-murid', 'home'],
      ['🎙', 'Setoran', '#rekam', 'rekam'],
      ['👤', 'Profil', '/u/@' + (me.username || ''), 'me'],
    ],
    guru: [
      ['🏠', 'Beranda', '/dashboard-guru', 'home'],
      ['📚', 'Setoran', '#setoran', 'setoran'],
      ['🎓', 'Calon', '#calon', 'calon'],
      ['👤', 'Profil', '/u/@' + (me.username || ''), 'me'],
    ],
  };
  const nav = document.getElementById('nav');
  if (nav && items[page]) {
    nav.className = 'nav';
    nav.innerHTML = items[page]
      .map(function (it) {
        const on = it[3] === (document.body.dataset.tab || 'home') ? ' class="on"' : '';
        return '<a href="' + it[2] + '"' + on + '><i>' + it[0] + '</i>' + it[1] + '</a>';
      })
      .join('');
  }

  window.PP = {
    me: me,
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    },
    wave: function (n) {
      let h = '';
      for (let i = 0; i < (n || 28); i++) h += '<i style="height:' + (22 + Math.round(Math.abs(Math.sin(i * 1.7)) * 72)) + '%"></i>';
      return '<div class="wave" aria-hidden="true">' + h + '</div>';
    },
    fmt: function (d) {
      if (!d) return '';
      try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
      catch (e) { return d; }
    },
  };
})();
