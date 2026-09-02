/* 公考刷题库 主逻辑（索引 + 按年加载版） */
let state = {
  cat: null, subj: null,
  idx: [],           // 当前科目的卷目录 [{key, count}]
  questions: [], idxPos: 0, answers: {}
};

function store(key, val) {
  if (val === undefined) { try { return JSON.parse(localStorage.getItem("gktk_" + key)) || {}; } catch (e) { return {}; } }
  localStorage.setItem("gktk_" + key, JSON.stringify(val));
}

function go(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(page).classList.add("active");
  if (page === "home") renderHome();
  if (page === "picker") renderPicker();
  window.scrollTo(0, 0);
}

function renderHome() {
  const prog = store("progress");
  let totalDone = 0, totalRight = 0;
  Object.values(prog).forEach(p => { totalDone += p.done || 0; totalRight += p.right || 0; });
  document.getElementById("globalStats").textContent =
    totalDone ? `累计刷题 ${totalDone} 道，答对 ${totalRight} 道，正确率 ${Math.round(totalRight / totalDone * 100)}%`
              : "开始你的第一次刷题吧！";
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";
  CATS.forEach(c => {
    const p = prog[c.id] || {};
    const div = document.createElement("div");
    div.className = "cat-card";
    div.innerHTML = `<h3>${c.name}</h3><p>${c.desc}</p>` +
      (p.done ? `<p class="done">已刷 ${p.done} 道 · 正确率 ${Math.round((p.right || 0) / p.done * 100)}%</p>` : "");
    div.onclick = () => { state.cat = c.id; go("picker"); };
    grid.appendChild(div);
  });
}

async function renderPicker() {
  const cat = CATS.find(c => c.id === state.cat);
  document.getElementById("pickerTitle").textContent = cat.name;
  const tabs = document.getElementById("subjTabs");
  tabs.innerHTML = "";
  Object.keys(cat.subjects).forEach(sid => {
    const b = document.createElement("button");
    b.className = "subj-tab" + (state.subj === sid ? " on" : "");
    b.textContent = cat.subjects[sid];
    b.onclick = () => { state.subj = sid; renderPicker(); };
    tabs.appendChild(b);
  });
  if (!state.subj || !cat.subjects[state.subj]) state.subj = Object.keys(cat.subjects)[0];
  document.getElementById("randomBtn").style.display = state.subj === "shenlun" || state.subj === "zongying" ? "none" : "inline-block";
  document.getElementById("yearList").innerHTML = "<p class='loading'>加载中…</p>";
  const { index } = await loadIndex(state.cat, state.subj);
  state.idx = index;
  renderYearList();
}

function renderYearList() {
  const box = document.getElementById("yearList");
  const kw = (document.getElementById("searchInput").value || "").trim();
  const entries = state.idx.filter(e => !kw || e.key.includes(kw));
  box.innerHTML = "";
  if (!entries.length) { box.innerHTML = "<p class='loading'>没有匹配的试卷</p>"; return; }
  const frag = document.createDocumentFragment();
  entries.forEach(e => {
    const div = document.createElement("div");
    div.className = "year-block";
    const [y, ...rest] = e.key.split("·");
    div.innerHTML = `<h3>${y} 年 ${rest.join(" ")}</h3>
      <button class="start-btn" data-key="${escAttr(e.key)}">开始刷题（${e.count} 题）</button>`;
    div.querySelector(".start-btn").onclick = () => startQuiz(e.key);
    frag.appendChild(div);
  });
  box.appendChild(frag);
}

function yearOf(key) { return /^\d{4}/.test(key) ? key.slice(0, 4) : key; }

async function startQuiz(key) {
  const papers = await loadYearPapers(state.cat, state.subj, yearOf(key));
  const list = papers[key] || [];
  if (!list.length) { alert("该卷数据加载失败，请重试"); return; }
  state.questions = list.slice();
  state.quizLabel = key;
  beginQuiz();
}

async function startRandom() {
  // 从索引挑一个题量充足的年份卷，再全量洗牌抽 20 题
  const pool = state.idx.filter(e => e.count >= 20);
  if (!pool.length) return alert("暂无题目");
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const papers = await loadYearPapers(state.cat, state.subj, yearOf(pick.key));
  const list = (papers[pick.key] || []).slice();
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  state.questions = list.slice(0, 20);
  state.quizLabel = "随机抽题 · " + pick.key;
  beginQuiz();
}

function beginQuiz() {
  state.idxPos = 0; state.answers = {};
  go("quiz");
  renderQuestion();
}

function normQ(q) {
  return {
    type: q.type || q.t || "",
    material: q.material || q.s || "",
    stem: q.stem || q.q || "",
    options: q.options || q.o || null,
    answer: q.answer || q.a || "",
    analysis: q.analysis || q.e || ""
  };
}

function renderQuestion() {
  const raw = state.questions[state.idxPos];
  if (!raw) return;
  const q = normQ(raw);
  const n = state.questions.length;
  const catName = CATS.find(c => c.id === state.cat).name;
  const subjName = CATS.find(c => c.id === state.cat).subjects[state.subj] || "";
  document.getElementById("quizMeta").textContent =
    `${catName} · ${subjName} · ${state.quizLabel} · 第 ${state.idxPos + 1}/${n} 题`;
  document.getElementById("progressFill").style.width = ((state.idxPos + 1) / n * 100) + "%";
  const box = document.getElementById("questionBox");
  let html = "";
  if (q.material) html += `<div class="material">${esc(q.material)}</div>`;
  if (q.type) html += `<span class="q-type">${esc(q.type)}</span>`;
  html += `<div class="q-stem">${state.idxPos + 1}. ${esc(q.stem)}</div>`;
  if (q.options && q.options.length) {
    const chosen = state.answers[state.idxPos];
    const letters = "ABCDEFGH";
    q.options.forEach((opt, i) => {
      const letter = letters[i];
      let cls = "opt";
      if (chosen !== undefined) {
        cls += " disabled";
        if (q.answer.includes(letter)) cls += " correct";
        else if (letter === chosen) cls += " wrong";
      }
      html += `<button class="${cls}" onclick="answer('${letter}')">${letter}. ${esc(opt)}</button>`;
    });
  } else {
    html += `<p style="font-size:13px;color:#888">申论/材料题：请先自行作答，再点「查看解析」对照参考答案。</p>`;
  }
  box.innerHTML = html;
  document.getElementById("analysisBox").classList.add("hidden");
  document.getElementById("prevBtn").disabled = state.idxPos === 0;
  document.getElementById("nextBtn").textContent = state.idxPos === n - 1 ? "完成" : "下一题";
}

function answer(letter) {
  if (state.answers[state.idxPos] !== undefined) return;
  state.answers[state.idxPos] = letter;
  const q = normQ(state.questions[state.idxPos]);
  const prog = store("progress");
  const p = prog[state.cat] = prog[state.cat] || { done: 0, right: 0 };
  p.done++;
  if (q.answer.includes(letter)) p.right++;
  store("progress", prog);
  renderQuestion();
  toggleAnalysis(true);
}

function toggleAnalysis(force) {
  const box = document.getElementById("analysisBox");
  const q = normQ(state.questions[state.idxPos] || {});
  if (force === true || box.classList.contains("hidden")) {
    let text = "";
    if (q.answer && q.options) text += `【答案】${q.answer}\n`;
    text += `【解析】${q.analysis || "暂无解析"}`;
    box.textContent = text;
    box.classList.remove("hidden");
  } else {
    box.classList.add("hidden");
  }
}

function nav(d) {
  if (d === 1 && state.idxPos === state.questions.length - 1) return showResult();
  state.idxPos = Math.max(0, Math.min(state.questions.length - 1, state.idxPos + d));
  renderQuestion();
}

function showResult() {
  let right = 0, answered = 0, objective = 0;
  state.questions.forEach((raw, i) => {
    const q = normQ(raw);
    if (q.options) {
      objective++;
      if (state.answers[i] !== undefined) { answered++; if (q.answer.includes(state.answers[i])) right++; }
    }
  });
  document.getElementById("resultBox").innerHTML = objective
    ? `<div class="score">${right} / ${objective}</div><p>已作答 ${answered} 题 · 正确率 ${answered ? Math.round(right / answered * 100) : 0}%</p>`
    : `<div class="score">✍️</div><p>申论练习完成，共 ${state.questions.length} 题，参考解析见答题过程</p>`;
  go("result");
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }

renderHome();
