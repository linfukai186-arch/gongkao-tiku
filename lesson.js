/* 课程内容加载、阅读和进度 */
const lessonCache = {};
let lessonFilter = 'all';

async function loadLessonContent(id) {
  if (lessonCache[id]) return lessonCache[id];
  try {
    const r = await fetch(`content/lessons/${id}.json`);
    if (!r.ok) throw new Error(r.status);
    lessonCache[id] = await r.json();
  } catch (e) {
    lessonCache[id] = null;
  }
  return lessonCache[id];
}

function lessonProgress() {
  const value = store('lessonProgress');
  if (!value.version) value.version = 1;
  if (!value.lessons) value.lessons = {};
  return value;
}

function allLessons() {
  return typeof LESSON_CATALOG === 'undefined' ? [] : LESSON_CATALOG;
}

function lessonById(id) {
  return allLessons().find(x => x.id === id);
}

function lessonDuration(value) {
  return typeof value === 'number' ? `${value} 分钟` : value;
}

function transcriptLines(value) {
  if (Array.isArray(value)) return value;
  return String(value || '').split(/\n\s*\n/).filter(Boolean);
}

function renderLessonCenter() {
  const tabs = document.getElementById('lessonTabs');
  const list = document.getElementById('lessonList');
  if (!tabs || !list) return;
  const filters = [['all', '推荐学习'], ['video', '视频课程'], ['text', '文字课程']];
  tabs.innerHTML = filters.map(([id, name]) => `<button class="lesson-tab${lessonFilter === id ? ' on' : ''}" onclick="setLessonFilter('${id}')">${name}</button>`).join('');
  const lessons = lessonsFor(state.cat, state.subj).filter(x => lessonFilter === 'all' || x.type === lessonFilter);
  const progress = lessonProgress();
  const completed = lessonsFor(state.cat, state.subj).filter(x => progress.lessons[x.id]?.completed).length;
  const total = lessonsFor(state.cat, state.subj).length;
  document.getElementById('courseProgressText').textContent = `${completed}/${total} 已完成`;
  list.innerHTML = lessons.map((lesson, index) => {
    const done = progress.lessons[lesson.id]?.completed;
    const icon = lesson.type === 'video' ? '▶' : '📄';
    const sourceTag = lesson.external ? '<em class="ext">公开课</em>' : '<em>原创</em>';
    return `<button class="lesson-card" onclick="openLesson('${escAttr(lesson.id)}')">
      <span class="lesson-cover ${lesson.type}">${icon}</span>
      <span class="lesson-info"><span class="lesson-badges">${sourceTag}${lesson.external ? '' : `<em>${lesson.type === 'video' ? '视频' : '文字'}</em>`}<em>${esc(lessonDuration(lesson.duration))}</em><em>${esc(lesson.difficulty)}</em></span><b>${esc(lesson.title)}</b><small>${esc(lesson.summary)}</small></span>
      <span class="lesson-status${done ? ' done' : ''}">${done ? '✓ 已学' : `${index + 1}`}</span>
    </button>`;
  }).join('') || '<p class="loading">暂无此类课程</p>';
}

function setLessonFilter(type) {
  lessonFilter = type;
  renderLessonCenter();
}

async function openLesson(id) {
  const lesson = lessonById(id);
  if (!lesson) return;
  state.lessonId = id;
  const progress = lessonProgress();
  const item = progress.lessons[id] || {};
  progress.lessons[id] = { ...item, lastOpened: Date.now(), type: lesson.type, cat: lesson.cat, subj: lesson.subj };
  progress.lastLesson = id;
  store('lessonProgress', progress);
  go('lesson');
  const box = document.getElementById('lessonDetail');
  box.innerHTML = '<p class="loading">课程加载中…</p>';
  if (lesson.type === 'video') renderVideoLesson(lesson);
  else {
    const content = await loadLessonContent(id);
    renderTextLesson(lesson, content);
  }
}

function renderLessonHeader(lesson) {
  const progress = lessonProgress();
  const done = progress.lessons[lesson.id]?.completed;
  const kind = lesson.external ? `▶ 免费公开课 · ${lesson.platform === 'bilibili' ? '哔哩哔哩' : lesson.platform || '外部平台'}` : lesson.type === 'video' ? '▶ 原创视频微课' : '📄 原创文字课程';
  const catName = (typeof CATS !== 'undefined' && CATS.find(c => c.id === lesson.cat)?.name) || lesson.cat;
  const subjName = (typeof CATS !== 'undefined' && CATS.find(c => c.id === lesson.cat)?.subjects[lesson.subj]) || lesson.subj;
  return `<div class="lesson-hero"><span class="lesson-kind">${kind}</span><h2>${esc(lesson.title)}</h2><p>${esc(lesson.summary)}</p><div class="lesson-meta"><span>⏱ ${esc(lessonDuration(lesson.duration))}</span><span>📊 ${esc(lesson.difficulty)}</span><span>📚 ${esc(catName)}·${esc(subjName)}</span>${lesson.provider ? `<span>👤 ${esc(lesson.provider)}</span>` : ''}</div><button class="complete-btn${done ? ' done' : ''}" onclick="toggleLessonComplete('${escAttr(lesson.id)}')">${done ? '✓ 已完成' : '标记为已完成'}</button></div>`;
}

function renderVideoLesson(lesson) {
  if (lesson.external) {
    const transcript = transcriptLines(lesson.transcript || '').map((text, i) => `<li><span>${i + 1}</span>${esc(text)}</li>`).join('');
    document.getElementById('lessonDetail').innerHTML = `${renderLessonHeader(lesson)}
    <div class="video-shell"><iframe src="${escAttr(lesson.embedUrl)}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" title="${escAttr(lesson.title)}"></iframe></div>
    <div class="attr-box"><b>课程来源</b><p>${esc(lesson.attribution || '')}</p><p class="attr-links"><a href="${escAttr(lesson.url)}" target="_blank" rel="noopener noreferrer">在哔哩哔哩打开完整课程 →</a></p></div>
    ${transcript ? `<article class="lesson-article"><h3>本课讲义</h3><ol class="transcript-list">${transcript}</ol></article>` : ''}${lessonActions(lesson)}`;
    return;
  }
  const transcript = transcriptLines(lesson.transcript).map((text, i) => `<li><span>${i + 1}</span>${esc(text)}</li>`).join('');
  document.getElementById('lessonDetail').innerHTML = `${renderLessonHeader(lesson)}
    <div class="video-shell"><video id="lessonVideo" controls preload="metadata" poster="${escAttr(lesson.poster)}"><source src="${escAttr(lesson.path)}" type="video/mp4"><track kind="captions" srclang="zh" label="中文字幕" src="${escAttr(lesson.captions)}" default>当前浏览器不支持视频播放。</video></div>
    <article class="lesson-article"><h3>本课讲义</h3><ol class="transcript-list">${transcript}</ol></article>${lessonActions(lesson)}`;
  const video = document.getElementById('lessonVideo');
  const saved = lessonProgress().lessons[lesson.id]?.position || 0;
  video.addEventListener('loadedmetadata', () => { if (saved > 0 && saved < video.duration - 2) video.currentTime = saved; });
  video.addEventListener('timeupdate', () => saveVideoPosition(lesson.id, video.currentTime));
  video.addEventListener('ended', () => setLessonComplete(lesson.id, true));
}

function renderTextLesson(lesson, content) {
  if (!content) {
    document.getElementById('lessonDetail').innerHTML = `${renderLessonHeader(lesson)}<div class="notice-box">课程正文加载失败，请刷新后重试。</div>${lessonActions(lesson)}`;
    return;
  }
  const objectives = (content.objectives || []).map(x => `<li>${esc(x)}</li>`).join('');
  const sections = (content.sections || []).map(s => { const title=s.title||s.heading||''; const paragraphs=s.paragraphs||(s.content?[s.content]:[]); return `<section class="article-section"><h3>${esc(title)}</h3>${paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}${s.example ? `<div class="lesson-example"><b>典型例题</b><p>${esc(s.example)}</p></div>` : ''}</section>`; }).join('');
  const pitfalls = (content.pitfalls || []).map(x => `<li>${esc(x)}</li>`).join('');
  document.getElementById('lessonDetail').innerHTML = `${renderLessonHeader(lesson)}<article class="lesson-article"><div class="objective-box"><h3>学习目标</h3><ul>${objectives}</ul></div>${sections}<div class="pitfall-box"><h3>易错提醒</h3><ul>${pitfalls}</ul></div><div class="lesson-summary"><h3>本课小结</h3><p>${esc(content.summary || '')}</p></div></article>${lessonActions(lesson)}`;
}

function lessonActions(lesson) {
  const list = lessonsFor(lesson.cat, lesson.subj);
  const i = list.findIndex(x => x.id === lesson.id);
  return `<div class="lesson-actions"><button ${i < 1 ? 'disabled' : ''} onclick="openLesson('${i > 0 ? list[i - 1].id : ''}')">上一课</button><button class="practice-action" onclick="startPracticeFromLesson('${escAttr(lesson.practiceModule || lesson.module)}')">配套练习</button><button ${i === list.length - 1 ? 'disabled' : ''} onclick="openLesson('${i < list.length - 1 ? list[i + 1].id : ''}')">下一课</button></div>`;
}

function saveVideoPosition(id, position) {
  const progress = lessonProgress();
  const item = progress.lessons[id] || {};
  if (Math.abs((item.position || 0) - position) < 3) return;
  progress.lessons[id] = { ...item, position: Math.floor(position), lastOpened: Date.now() };
  store('lessonProgress', progress);
}

function setLessonComplete(id, complete) {
  const progress = lessonProgress();
  progress.lessons[id] = { ...(progress.lessons[id] || {}), completed: complete, completedAt: complete ? Date.now() : null };
  store('lessonProgress', progress);
}

function toggleLessonComplete(id) {
  const progress = lessonProgress();
  setLessonComplete(id, !progress.lessons[id]?.completed);
  openLesson(id);
}

function startPracticeFromLesson(module) {
  const lesson = lessonById(state.lessonId);
  if (lesson) { state.cat = lesson.cat; state.subj = lesson.subj; }
  startPractice(module);
}

function returnToCourses() {
  go('picker');
}

function renderContinueLearning() {
  const box = document.getElementById('continueLearning');
  if (!box) return;
  const progress = lessonProgress();
  const lesson = lessonById(progress.lastLesson);
  if (!lesson) { box.classList.add('hidden'); return; }
  const total = allLessons().length;
  const completed = allLessons().filter(x => progress.lessons[x.id]?.completed).length;
  box.classList.remove('hidden');
  box.innerHTML = `<div><span>继续学习</span><b>${esc(lesson.title)}</b><small>课程总进度 ${completed}/${total}</small></div><button onclick="openLesson('${escAttr(lesson.id)}')">继续 →</button>`;
}
