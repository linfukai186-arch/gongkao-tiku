/* 课程专项练习题加载器：练习题与真题分开，按模块按需加载 */
const practiceCacheV2 = {};
async function loadPractice(cat, subj) {
  const key = `${cat}-${subj}`;
  if (practiceCacheV2[key]) return practiceCacheV2[key];
  try {
    const r = await fetch(`data/practice/${key}.json`);
    practiceCacheV2[key] = r.ok ? await r.json() : [];
  } catch (e) { practiceCacheV2[key] = []; }
  return practiceCacheV2[key];
}
