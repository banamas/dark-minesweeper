// Берёт счётчики скачиваний из GitHub Releases и дописывает снимок в stats.json.
const fs = require("fs");

const FILES = {
  pc: "DarkMinesweeper-Windows.zip",
  android: "DarkMinesweeper-Android.apk",
};
const COUNTER = "https://abacus.jasoncameron.dev";
const COUNTER_NS = "banamas-dark-minesweeper";
// Пишем снимок, если счётчики изменились, или раз в неделю — чтобы в репозитории
// была активность и GitHub не отключил расписание через 60 дней.
const KEEPALIVE_MS = 7 * 24 * 3600 * 1000;

async function main() {
  const res = await fetch(
    `https://api.github.com/repos/${process.env.REPO}/releases?per_page=100`,
    { headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const releases = await res.json();

  const current = { pc: 0, android: 0 };
  for (const r of releases) {
    for (const a of r.assets) {
      if (a.name === FILES.pc) current.pc += a.download_count;
      if (a.name === FILES.android) current.android += a.download_count;
    }
  }

  // мгновенный счётчик нажатий на сайте — берём большее из двух
  for (const [k, key] of [["pc", "pc-downloads"], ["android", "android-downloads"]]) {
    try {
      const r = await fetch(`${COUNTER}/get/${COUNTER_NS}/${key}`);
      if (r.ok) current[k] = Math.max(current[k], (await r.json()).value || 0);
    } catch {}
  }

  let stats = { history: [] };
  try { stats = JSON.parse(fs.readFileSync("stats.json", "utf8")); } catch {}
  stats.history = stats.history || [];

  const now = new Date().toISOString();
  const last = stats.history[stats.history.length - 1];
  const changed = !last || last.pc !== current.pc || last.android !== current.android;
  const stale = !last || Date.now() - Date.parse(last.t) > KEEPALIVE_MS;
  if (!changed && !stale) {
    console.log("unchanged", current);
    return;
  }

  stats.history.push({ t: now, pc: current.pc, android: current.android });
  stats.current = current;
  stats.updated = now;
  fs.writeFileSync("stats.json", JSON.stringify(stats, null, 1) + "\n");
  console.log("snapshot", current);
}

main().catch((e) => { console.error(e); process.exit(1); });
