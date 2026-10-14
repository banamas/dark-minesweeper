(function () {
  "use strict";
  var SITE = window.SITE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- download links ----------
  // Файлы лежат в GitHub Releases: каждое скачивание GitHub считает сам.
  function downloadUrl(key) {
    return "https://github.com/" + SITE.repo + "/releases/latest/download/" + SITE.files[key].name;
  }
  $$(".plate").forEach(function (a) {
    var key = a.dataset.platform;
    a.href = downloadUrl(key);
    a.setAttribute("download", SITE.files[key].name);
  });
  $$("[data-size]").forEach(function (el) { el.textContent = SITE.files[el.dataset.size].size; });
  $$("[data-file]").forEach(function (el) { el.textContent = SITE.files[el.dataset.file].name; });

  // ---------- platform hint ----------
  var ua = navigator.userAgent || "";
  var note = $("#platform-note");
  if (/iPhone|iPad|iPod/i.test(ua)) {
    note.textContent = "На iPhone и iPad игра пока не выходит — скачай её на компьютер или Android.";
    note.classList.add("warn");
  } else if (/Android/i.test(ua)) {
    $('.plate[data-platform="android"]').classList.add("suggested");
    $(".downloads").insertBefore($('.plate[data-platform="android"]'), $('.plate[data-platform="pc"]'));
  } else {
    $('.plate[data-platform="pc"]').classList.add("suggested");
  }

  // ---------- download counters ----------
  function fmt(n) { return n.toLocaleString("ru-RU"); }
  function showCounts(c) {
    var pc = c.pc || 0, android = c.android || 0;
    $('[data-count="pc"]').textContent = "скачали " + fmt(pc);
    $('[data-count="android"]').textContent = "скачали " + fmt(android);
    if (pc + android > 0) {
      $("#total-count").textContent = fmt(pc + android);
      $("#total-line").hidden = false;
    }
  }
  function countsFromReleases(releases) {
    var c = { pc: 0, android: 0 };
    releases.forEach(function (r) {
      (r.assets || []).forEach(function (a) {
        if (a.name === SITE.files.pc.name) c.pc += a.download_count;
        if (a.name === SITE.files.android.name) c.android += a.download_count;
      });
    });
    return c;
  }
  function loadCounts() {
    if (SITE.repo.indexOf("OWNER/") === 0) return;
    fetch("https://api.github.com/repos/" + SITE.repo + "/releases?per_page=100")
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (rel) { showCounts(countsFromReleases(rel)); })
      .catch(function () {
        // запасной путь: снимок, который пишет GitHub Action
        fetch("stats.json", { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (s) { if (s.current) showCounts(s.current); })
          .catch(function () {});
      });
  }
  loadCounts();

  // ---------- embers ----------
  var embers = $(".embers");
  if (embers && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (var i = 0; i < 26; i++) {
      var e = document.createElement("i");
      e.style.left = (Math.random() * 100) + "%";
      e.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
      e.style.animationDuration = (7 + Math.random() * 9) + "s";
      e.style.animationDelay = (-Math.random() * 14) + "s";
      var s = 1.5 + Math.random() * 2.5;
      e.style.width = e.style.height = s + "px";
      embers.appendChild(e);
    }
  }

  // ---------- raven lines ----------
  var lines = [
    "Тьма тут густая. Держись круга света, и доживём до выхода.",
    "Посмотри на число рядом с тобой. Что оно говорит о плитах вокруг?",
    "Ещё мин: одна. Закрытых плит: одна. Числа равны — значит, там мина.",
    "Это можно было понять. Давай разберём, где ты мог увидеть подвох.",
    "А это был честный риск. Тут не угадал бы никто.",
    "Насколько ты уверен? Скажи прежде, чем открыть."
  ];
  var lineEl = $("#raven-line");
  var li = 0;
  function typeLine() {
    var text = lines[li % lines.length], k = 0;
    lineEl.textContent = "";
    var caret = document.createElement("span");
    caret.className = "caret";
    caret.textContent = "▍";
    var t = setInterval(function () {
      k++;
      lineEl.textContent = text.slice(0, k);
      lineEl.appendChild(caret);
      if (k >= text.length) { clearInterval(t); li++; setTimeout(typeLine, 4200); }
    }, 34);
  }
  if (lineEl) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) lineEl.textContent = lines[0];
    else if ("IntersectionObserver" in window) {
      var started = false;
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !started) { started = true; typeLine(); }
      }).observe(lineEl);
    } else typeLine();
  }

  // ---------- lightbox ----------
  var lb = $("#lightbox");
  $$(".shot").forEach(function (f) {
    f.addEventListener("click", function () {
      $("img", lb).src = f.dataset.full;
      $("img", lb).alt = $("img", f).alt;
      lb.hidden = false;
    });
  });
  lb.addEventListener("click", function () { lb.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") lb.hidden = true; });

  // ---------- mini minesweeper ----------
  var W = 9, H = 9, MINES = 10;
  var board = $("#board"), msg = $("#board-msg"), left = $("#mines-left"), flagBtn = $("#flag-mode");
  var cells, mine, open, flag, started, over, flagMode = false;

  function idx(x, y) { return y * W + x; }
  function around(i) {
    var x = i % W, y = (i / W) | 0, r = [];
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      var nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) r.push(idx(nx, ny));
    }
    return r;
  }
  function count(i) { return around(i).filter(function (j) { return mine[j]; }).length; }

  function reset() {
    board.innerHTML = "";
    cells = []; mine = []; open = []; flag = [];
    started = false; over = false;
    msg.innerHTML = "&nbsp;";
    for (var i = 0; i < W * H; i++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cell";
      b.dataset.i = i;
      b.setAttribute("aria-label", "Плита " + (i % W + 1) + ", " + ((i / W | 0) + 1));
      board.appendChild(b);
      cells.push(b); mine.push(false); open.push(false); flag.push(false);
    }
    updateLeft();
  }
  function plant(safe) {
    var banned = around(safe).concat(safe), placed = 0;
    while (placed < MINES) {
      var r = (Math.random() * W * H) | 0;
      if (!mine[r] && banned.indexOf(r) < 0) { mine[r] = true; placed++; }
    }
  }
  function updateLeft() { left.textContent = MINES - flag.filter(Boolean).length; }

  function reveal(i) {
    var stack = [i];
    while (stack.length) {
      var c = stack.pop();
      if (open[c] || flag[c]) continue;
      open[c] = true;
      var n = count(c), el = cells[c];
      el.classList.add("open");
      el.setAttribute("aria-label", n ? "Число " + n : "Пусто");
      if (n) { el.textContent = n; el.classList.add("n" + n); }
      else around(c).forEach(function (j) { if (!open[j]) stack.push(j); });
    }
  }
  function lose(i) {
    over = true;
    for (var j = 0; j < W * H; j++) {
      if (mine[j] && !flag[j]) cells[j].classList.add("open", "mine");
      if (!mine[j] && flag[j]) cells[j].classList.add("wrong");
    }
    cells[i].classList.add("boom");
    msg.textContent = "Тьма забрала тебя. В полной игре ворон объяснил бы, где ты ошибся.";
  }
  function checkWin() {
    for (var j = 0; j < W * H; j++) if (!mine[j] && !open[j]) return;
    over = true;
    for (var k = 0; k < W * H; k++) if (mine[k] && !flag[k]) { flag[k] = true; cells[k].classList.add("flag"); }
    updateLeft();
    msg.textContent = "Ты пережил тьму. Дальше — Деревня, Лес и Подземелья.";
  }
  function toggleFlag(i) {
    if (open[i] || over) return;
    flag[i] = !flag[i];
    cells[i].classList.toggle("flag", flag[i]);
    updateLeft();
  }
  function chord(i) {
    // нажатие на число, вокруг которого уже стоят все флаги, открывает остальных соседей
    var n = around(i), f = n.filter(function (j) { return flag[j]; }).length;
    if (f !== count(i)) return;
    n.forEach(function (j) { if (!flag[j] && !open[j]) step(j); });
  }
  function step(i) {
    if (over || flag[i]) return;
    if (open[i]) { chord(i); return; }
    if (!started) { plant(i); started = true; }
    if (mine[i]) { lose(i); return; }
    reveal(i);
    checkWin();
  }

  var pressTimer = null, longPressed = false;
  board.addEventListener("click", function (e) {
    var t = e.target.closest(".cell");
    if (!t) return;
    if (longPressed) { longPressed = false; return; }
    var i = +t.dataset.i;
    if (flagMode && !open[i]) toggleFlag(i); else step(i);
  });
  board.addEventListener("contextmenu", function (e) {
    var t = e.target.closest(".cell");
    if (!t) return;
    e.preventDefault();
    toggleFlag(+t.dataset.i);
  });
  board.addEventListener("touchstart", function (e) {
    var t = e.target.closest(".cell");
    if (!t) return;
    longPressed = false;
    pressTimer = setTimeout(function () {
      longPressed = true;
      toggleFlag(+t.dataset.i);
      if (navigator.vibrate) navigator.vibrate(20);
    }, 420);
  }, { passive: true });
  ["touchend", "touchmove", "touchcancel"].forEach(function (ev) {
    board.addEventListener(ev, function () { clearTimeout(pressTimer); }, { passive: true });
  });
  flagBtn.addEventListener("click", function () {
    flagMode = !flagMode;
    flagBtn.setAttribute("aria-pressed", flagMode);
    flagBtn.textContent = "Флажок: " + (flagMode ? "вкл" : "выкл");
  });
  $("#restart").addEventListener("click", reset);
  reset();
})();
