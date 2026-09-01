# 公考刷题库

一个纯前端的公考刷题网页应用：分类为 **国考 / 省考 / 事业编**，科目覆盖 **行测 / 申论 / 公共基础知识**，年份以 2021–2024 为主。纯静态页面，部署到网上后电脑、手机浏览器都能刷题，进度自动保存在本地浏览器。

## 文件结构

- `index.html` — 页面结构（首页分类 → 年份科目选择 → 刷题 → 成绩）
- `style.css` — 响应式样式，手机端自适应
- `app.js` — 刷题逻辑：答题判分、解析、进度统计（localStorage）
- `data.js` — **题库数据，新增题目只改这一个文件**

## 添加新题目

在 `data.js` 对应的 `类别 → 年份 → 科目` 数组中追加对象：

```js
// 选择题
{ type:"常识判断", stem:"题干",
  options:["选项A","选项B","选项C","选项D"],
  answer:"A", analysis:"解析……" }

// 申论/材料题（无选项，靠解析给出参考答案）
{ type:"申发论述", material:"材料（可选）", stem:"题目要求", analysis:"参考要点……" }
```

类别 id：`guokao`（国考）/ `shengkao`（省考）/ `shiyebian`（事业编）
科目 id：`xingce`（行测）/ `shenlun`（申论）/ `gongji`（公共基础知识）

## 上线部署（手机也能访问）

### 方案一：GitHub Pages（免费、推荐）
1. 注册 GitHub 账号，新建一个公开仓库，如 `gongkao-tiku`
2. 把本目录 4 个文件（index.html、style.css、app.js、data.js）上传提交
3. 仓库 Settings → Pages → Source 选 `main` 分支根目录，保存
4. 几分钟后即可通过 `https://<你的用户名>.github.io/gongkao-tiku/` 访问

### 方案二：Vercel / Netlify（免费）
注册后直接把本文件夹拖进去部署，会得到一个 `xxx.vercel.app` 域名。

### 本地预览
直接双击 `index.html` 即可使用（数据用 data.js 加载，无需服务器）。
