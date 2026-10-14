// Счётчики скачиваний из двух источников:
//  - clicks: мгновенный счётчик нажатий на кнопки сайта;
//  - github: счётчик скачиваний файлов релиза (обновляется с задержкой, но
//    учитывает и прямые ссылки). Показываем большее из двух.
(function () {
  "use strict";
  var SITE = window.SITE;
  var KEYS = { pc: "pc-downloads", android: "android-downloads" };

  function counterUrl(op, platform) {
    return SITE.counter + "/" + op + "/" + SITE.counterNs + "/" + KEYS[platform];
  }
  function clickCount(platform) {
    return fetch(counterUrl("get", platform), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { value: 0 }; })
      .then(function (j) { return j.value || 0; })
      .catch(function () { return null; });
  }

  window.DMCounts = {
    hit: function (platform) {
      return fetch(counterUrl("hit", platform), { keepalive: true, cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (j) { return j.value; });
    },
    clicks: function () {
      return Promise.all([clickCount("pc"), clickCount("android")]).then(function (v) {
        if (v[0] === null && v[1] === null) return null;
        return { pc: v[0] || 0, android: v[1] || 0 };
      });
    },
    github: function () {
      return fetch("https://api.github.com/repos/" + SITE.repo + "/releases?per_page=100")
        .then(function (r) { if (!r.ok) throw r; return r.json(); })
        .then(function (rel) {
          var c = { pc: 0, android: 0 };
          rel.forEach(function (r) {
            (r.assets || []).forEach(function (a) {
              if (a.name === SITE.files.pc.name) c.pc += a.download_count;
              if (a.name === SITE.files.android.name) c.android += a.download_count;
            });
          });
          return c;
        })
        .catch(function () { return null; });
    },
    merged: function () {
      return Promise.all([this.clicks(), this.github()]).then(function (v) {
        var a = v[0], b = v[1];
        if (!a && !b) return null;
        a = a || { pc: 0, android: 0 }; b = b || { pc: 0, android: 0 };
        return { pc: Math.max(a.pc, b.pc), android: Math.max(a.android, b.android) };
      });
    }
  };
})();
