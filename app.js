/* 公考刷题库 主逻辑 */
const CATEGORIES = [
  { id: "guokao",   name: "国考",   desc: "中央机关及其直属机构公务员录用考试" },
  { id: "shengkao", name: "省考",   desc: "各省公务员录用考试（含联考）" },
  { id: "shiyebian", name: "事业编", desc: "事业单位公开招聘考试" }
];
const SUBJECTS = { xingce: "行测", shenlun: "申论", gongji: "公共基础知识" };

let state = { cat: null, year: null, subj: null, questions: [], idx: 0, answers: {} };

function store(key, val) {
  if (val === undefined) { try { return JSON.parse(localStorage.getItem("gktk_" + key)) || {}; } catch(e){ return {}; } }
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
    totalDone ? `累计刷题 ${totalDone} 道，答对 ${totalRight} 道，正确率 ${Math.round(totalRight/totalDone*100)}%`
              : "开始你的第一次刷题吧！";
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";
  CATEGORIES.forEach(c => {
    let cnt = 0;
    Object.values(BANK[c.id].years).forEach(y =>
      Object.values(y).forEach(list => cnt += list.length));
    const p = prog[c.id] || {};
    const div = document.createElement("div");
    div.className = "cat-card";
    div.innerHTML = `<h3>${c.name}</h3><p>${c.desc}</p><p>收录题目 ${cnt} 道</p>` +
      (p.done ? `<p class="done">已刷 ${p.done} 道 · 正确率 ${Math.round((p.right||0)/p.done*100)}%</p>` : "");
    div.onclick = () => { state.cat = c.id; go("picker"); };
    grid.appendChild(div);
  });
}

function renderPicker() {
  const cat = BANK[state.cat];
  document.getElementById("pickerTitle").textContent = cat.name + " · 选择年份与科目";
  const box = document.getElementById("yearList");
  box.innerHTML = "";
  Object.keys(cat.years).sort().reverse().forEach(year => {
    const div = document.createElement("div");
    div.className = "year-block";
    let html = `<h3>${year} 年</h3><div class="subj-row">`;
    Object.keys(cat.years[year]).forEach(subj => {
      const n = cat.years[year][subj].length;
      html += `<button class="subj-btn" onclick="startQuiz('${year}','${subj}')">${SUBJECTS[subj]||subj} <span class="cnt">${n}题</span></button>`;
    });
    div.innerHTML = html + "</div>";
    box.appendChild(div);
  });
}

function startQuiz(year, subj) {
  state.year = year; state.subj = subj;
  state.questions = BANK[state.cat].years[year][subj];
  state.idx = 0; state.answers = {};
  go("quiz");
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.idx];
  const n = state.questions.length;
  document.getElementById("quizMeta").textContent =
    `${CATEGORIES.find(c=>c.id===state.cat).name} ${state.year} · ${SUBJECTS[state.subj]||state.subj} · 第 ${state.idx+1}/${n} 题`;
  document.getElementById("progressFill").style.width = ((state.idx+1)/n*100) + "%";
  const box = document.getElementById("questionBox");
  let html = "";
  if (q.material) html += `<div class="material">${esc(q.material)}</div>`;
  html += `<span class="q-type">${q.type || (q.options ? "单选" : "问答")}</span>`;
  html += `<div class="q-stem">${state.idx+1}. ${esc(q.stem)}</div>`;
  if (q.options) {
    const chosen = state.answers[state.idx];
    q.options.forEach((opt, i) => {
      const letter = "ABCD"[i];
      let cls = "opt";
      if (chosen !== undefined) {
        cls += " disabled";
        if (letter === q.answer) cls += " correct";
        else if (letter === chosen) cls += " wrong";
      }
      html += `<button class="${cls}" onclick="answer('${letter}')">${letter}. ${esc(opt)}</button>`;
    });
  } else {
    html += `<p style="font-size:13px;color:#888">申论/材料题：请先自行作答，再点「查看解析」对照参考答案。</p>`;
  }
  box.innerHTML = html;
  document.getElementById("analysisBox").classList.add("hidden");
  document.getElementById("prevBtn").disabled = state.idx === 0;
  document.getElementById("nextBtn").textContent = state.idx === n-1 ? "完成" : "下一题";
}

function answer(letter) {
  if (state.answers[state.idx] !== undefined) return;
  state.answers[state.idx] = letter;
  const q = state.questions[state.idx];
  const prog = store("progress");
  const p = prog[state.cat] = prog[state.cat] || { done: 0, right: 0 };
  p.done++;
  if (letter === q.answer) p.right++;
  store("progress", prog);
  renderQuestion();
  toggleAnalysis(true);
}

function toggleAnalysis(force) {
  const box = document.getElementById("analysisBox");
  const q = state.questions[state.idx];
  if (force === true || box.classList.contains("hidden")) {
    let text = "";
    if (q.answer) text += `【答案】${q.answer}\n`;
    text += `【解析】${q.analysis || "暂无解析"}`;
    box.textContent = text;
    box.classList.remove("hidden");
  } else {
    box.classList.add("hidden");
  }
}

function nav(d) {
  if (d === 1 && state.idx === state.questions.length - 1) return showResult();
  state.idx = Math.max(0, Math.min(state.questions.length - 1, state.idx + d));
  renderQuestion();
}

function showResult() {
  let right = 0, answered = 0;
  state.questions.forEach((q, i) => {
    if (state.answers[i] !== undefined) { answered++; if (state.answers[i] === q.answer) right++; }
  });
  document.getElementById("resultBox").innerHTML =
    `<div class="score">${right} / ${state.questions.length}</div>
     <p>已作答 ${answered} 题 · 正确率 ${answered ? Math.round(right/answered*100) : 0}%</p>`;
  go("result");
}

function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

renderHome();
