/* ============ 数据层：题库索引与按需加载 ============ */
const CATS = [
  { id: "guokao",    name: "国考",   desc: "中央机关公务员考试（2000–2026）", subjects: { xingce: "行测", shenlun: "申论" } },
  { id: "shengkao",  name: "省考",   desc: "各省公务员考试（2004–2026）",     subjects: { xingce: "行测", shenlun: "申论" } },
  { id: "shiyebian", name: "事业编", desc: "事业单位考试（公基/职测/综应）",   subjects: { gongji: "公基", zongying: "综应" } }
];

/* 各类目·科目的数据目录（含 index.json + 按年份文件 y<year>.json） */
const DATA_DIRS = {
  "guokao/xingce":   "data/guokao-xingce",
  "guokao/shenlun":  "data/guokao-shenlun",
  "shengkao/xingce": "data/shengkao-xingce",
  "shengkao/shenlun":"data/shengkao-shenlun",
  "shiyebian/gongji": "data/shiyebian-gongji",
  "shiyebian/zongying": "data/shiyebian-zongying"
};

const idxCache = {}, yearCache = {}, practiceCache = {};

async function loadPractice(cat, subj) {
  const key = `${cat}-${subj}`;
  if (practiceCache[key]) return practiceCache[key];
  try {
    const r = await fetch(`data/practice/${key}.json`);
    practiceCache[key] = r.ok ? await r.json() : [];
  } catch (e) { practiceCache[key] = []; }
  return practiceCache[key];
}

async function loadIndex(cat, subj) {
  const key = cat + "/" + subj;
  if (idxCache[key]) return idxCache[key];
  // 事业编公基来自 data.js 种子数据
  if (cat === "shiyebian" && subj === "gongji") {
    const dir = DATA_DIRS[key];
    if (dir) {
      try { const r = await fetch(dir + "/index.json"); if (r.ok) { idxCache[key] = { index: await r.json() }; return idxCache[key]; } } catch (e) {}
    }
    const list = [];
    const seed = (typeof BANK !== "undefined" && BANK.shiyebian) ? BANK.shiyebian.years : {};
    Object.keys(seed).sort().reverse().forEach(y =>
      Object.keys(seed[y]).forEach(s => {
        if (s !== "gongji") return;
        const label = Object.keys(seed[y]).length > 1 ? y + "·综合" : y;
        list.push({ key: y, count: seed[y][s].length });
      }));
    // 去重（每年一行）
    const seen = new Set();
    const idx = list.filter(e => !seen.has(e.key) && seen.add(e.key));
    idxCache[key] = { local: true, index: idx };
    return idxCache[key];
  }
  const dir = DATA_DIRS[key];
  if (!dir) { idxCache[key] = { index: [] }; return idxCache[key]; }
  try {
    const r = await fetch(dir + "/index.json");
    if (!r.ok) throw new Error(r.status);
    idxCache[key] = { index: await r.json() };
  } catch (e) {
    console.error("index load fail", key, e.message);
    idxCache[key] = { index: [] };
  }
  return idxCache[key];
}

async function loadYearPapers(cat, subj, year) {
  const key = cat + "/" + subj;
  if (cat === "shiyebian" && subj === "gongji") {
    const dir = DATA_DIRS[key];
    if (dir) {
      const ck = key + "#" + year;
      if (yearCache[ck]) return yearCache[ck];
      try { const r = await fetch(dir + "/y" + year + ".json"); if (r.ok) { yearCache[ck] = await r.json(); return yearCache[ck]; } } catch (e) {}
    }
    const seed = BANK.shiyebian.years[year];
    const out = {};
    if (dir) {
      const ck = key + "#" + year;
      try { const r = await fetch(dir + "/y" + year + ".json"); if (r.ok) { yearCache[ck] = await r.json(); return yearCache[ck]; } } catch (e) {}
    }
    if (seed) Object.keys(seed).forEach(s => { if (s === "gongji") out[year] = seed[s]; });
    return out;
  }
  const ck = key + "#" + year;
  if (yearCache[ck]) return yearCache[ck];
  const dir = DATA_DIRS[key];
  try {
    const r = await fetch(dir + "/y" + year + ".json");
    if (!r.ok) throw new Error(r.status);
    yearCache[ck] = await r.json();
  } catch (e) {
    console.error("year load fail", ck, e.message);
    yearCache[ck] = {};
  }
  return yearCache[ck];
}
