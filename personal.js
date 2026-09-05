/* 个人题库（仅本地/私有访问）：加载 _private/data，线上文件不存在时自动隐藏 */
const personalIndex = [];

async function initPersonalBank() {
  try {
    const r = await fetch('_private/data/index.json');
    if (!r.ok) return;
    const list = await r.json();
    if (!Array.isArray(list) || !list.length) return;
    personalIndex.push(...list);
    renderPersonalBank();
  } catch (e) { /* 线上环境：无个人题库 */ }
}

function renderPersonalBank() {
  const box = document.getElementById('personalBank');
  if (!box || !personalIndex.length) return;
  box.classList.remove('hidden');
  const total = personalIndex.reduce((a, x) => a + x.count, 0);
  box.innerHTML = `<div class="personal-head"><div><h2 class="section-title">🔒 个人题库</h2><p class="personal-sub">${personalIndex.length} 套资料 · 共 ${total} 题 · 仅本机/私有网络可见</p></div></div><div class="personal-grid" id="personalGrid"></div>`;
  const grid = document.getElementById('personalGrid');
  personalIndex.forEach(x => {
    const d = document.createElement('div');
    d.className = 'personal-card';
    d.innerHTML = `<b>${esc(x.title)}</b><small>${esc(x.module)} · ${x.count} 题</small><span>开始刷题 →</span>`;
    d.onclick = () => startPersonal(x.key, x.title);
    grid.appendChild(d);
  });
}

async function startPersonal(key, title) {
  try {
    const r = await fetch(`_private/data/personal-${key}.json`);
    if (!r.ok) throw new Error(r.status);
    const list = await r.json();
    if (!list.length) { alert('该资料暂无可刷题目'); return; }
    state.cat = state.cat || 'personal';
    state.subj = state.subj || 'xingce';
    state.questions = list;
    state.quizLabel = title;
    state.quizMode = 'personal';
    beginQuiz();
  } catch (e) {
    alert('个人题库加载失败：' + e.message);
  }
}
