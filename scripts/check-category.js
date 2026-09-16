#!/usr/bin/env node
/**
 * check-category.js —— `CATEGORY` 白名单不变量（零依赖，Node 原生）
 *
 * 为什么需要它
 * ------------
 * `CATEGORY` 决定「哪些组件会出现在 README 组件总览表与 docs/API.md 里」——
 * 生成器只遍历它，没登记的组件在文档里一个字都没有。而这条链上此前只有一道
 * 双向覆盖检查（在 `check-gen.js` 里），它用 `new Set` 去重，于是**丢掉了「登记了几次」**：
 *
 *   把 `vui-button` 加进「媒体组件」（它本来就在「基础组件」里）→ 实测结果：
 *     · README far-href 行仍写「48 个开箱即用的组件」，而组件总览表里 `<vui-button>`
 *       出现了 **2 行**（同一个文档里两句话互相矛盾）；
 *     · docs/API.md 里出现 **2 个 `### vui-button` 小节**与 **2 条同名锚点**（第二个链接
 *       永远跳到第一个，用户点不进去第二个）；
 *     · `check:gen` 照样打印「组件目录与生成器白名单双向一致（48 个组件）」并 exit 0。
 *   分类归属也随之变得二义：它到底属于基础组件还是媒体组件？
 *
 * 所以本脚本把「白名单不变量」集中到一处（解析器在 `lib/category.js`，与 `check-gen.js`
 * 共用同一份，不再各解析一遍），并检查四件事：
 *   1. **恰好登记一次**：同一组件出现在两个分类、或同一分类里写两遍，一律失败；
 *   2. **双向覆盖**：组件目录里有而白名单没有（文档漏收录）/ 白名单里有而目录里没有（幽灵）；
 *   3. **命名规范**：id 必须符合 `vui-<kebab>`（拼音/下划线/大写都是笔误）；
 *   4. **解析失败即失败**：拿不到结构就报错退出，绝不在空集上全绿。
 *
 * 本脚本自身也做负向自检（不复制仓库、不跑生成器，因此很快）：
 * 拿**真实的 gen-docs.py 源码**注入一个重复登记，`analyze()` 必须判出来；
 * 未注入时必须判不出来（反向对照）—— 否则上面那些断言就是恒真的。
 *
 * 用法：
 *   npm run check:category
 */
const fs = require('fs');
const { componentIds } = require('./lib/components');
const { parseCategories, analyze, GEN_DOCS } = require('./lib/category');

let failed = false;

function ok(name, note) {
  console.log(`  ok  ${name}${note ? `  —— ${note}` : ''}`);
}
function bad(name, note) {
  failed = true;
  console.log(`  x   ${name}${note ? `  —— ${note}` : ''}`);
}

console.log('\n[vui-uniapp] CATEGORY 白名单不变量校验');

// ── 1. 解析真实源码 ──────────────────────────────────────────────────────
const src = fs.readFileSync(GEN_DOCS, 'utf8');
const parsed = parseCategories(src);
const comps = componentIds();

if (!parsed) {
  bad(
    '无法从 scripts/gen-docs.py 解析出 CATEGORY',
    '该字典是 README.md / docs/API.md 的组件清单唯一来源，解析不到就无法校验（绝不放行）'
  );
  console.log('    可能原因：① 结构改了（花括号 / 列表没闭合）；② 某个 id 不符合 `vui-<kebab>` 规范，例如写成了 `vui-Button`。');
} else {
  const info = analyze(parsed, comps);

  // 扫描面自证：解析失灵导致「在空集上全绿」是本仓最贵的一类回归
  console.log(
    `  扫描面：${parsed.cats.length} 个分类 / 白名单登记 ${parsed.ids.length} 项 / 去重 ${info.total} 个组件 / uni_modules ${comps.length} 个`
  );
  if (parsed.ids.length === 0) {
    bad('白名单解析结果为空', '解析器坏了 —— 下面每条都会在空集上「通过」');
  }

  // ── 1a. 恰好登记一次 ──────────────────────────────────────────────────
  if (info.duplicated.length) {
    bad(
      `有 ${info.duplicated.length} 个组件被登记了不止一次`,
      info.duplicated.map((d) => `${d.id} ×${d.count}（${d.where.map((w) => `${w.name}×${w.n}`).join('，')}）`).join('；')
    );
    console.log('    → 生成的 README 总览表与 docs/API.md 会把同一个组件收录两次');
    console.log('      （标题重复、锚点重复、分类归属二义），而「共 N 个组件」的计数仍按去重后的数。');
  } else {
    ok('每个组件恰好登记一次', `${info.total} 个`);
  }

  // ── 1b. 双向覆盖 ──────────────────────────────────────────────────────
  if (info.notDocumented.length) {
    bad(`${info.notDocumented.length} 个组件没登记进 CATEGORY`, info.notDocumented.join(', '));
    console.log('    → docs/API.md 与 README.md 不会收录它们，使用方在文档里根本找不到。');
  }
  if (info.ghost.length) {
    bad(`CATEGORY 里有 ${info.ghost.length} 个组件在 uni_modules 下不存在`, info.ghost.join(', '));
    console.log('    → 组件已删/改名，白名单没同步。');
  }
  if (!info.notDocumented.length && !info.ghost.length) {
    ok('组件目录与白名单双向一致', `${comps.length} 个组件`);
  }

  // ── 1c. 空分类 ────────────────────────────────────────────────────────
  if (info.emptyCats.length) {
    bad(`有 ${info.emptyCats.length} 个分类是空的`, info.emptyCats.join(', '));
  } else {
    ok('每个分类都有组件');
  }
}

// ── 2. 反向自检：对**真实源码**注入重复登记，必须判得出来 ────────────────
// 不复制仓库、不跑生成器 —— 只把真实源码改一处再喂给同一个解析器，所以很快。
// 存在的意义：证明上面那条「恰好登记一次」不是恒真的。
// 两种形态都要覆盖：① 同一分类里写两遍；② **跨分类重复**（真实场景，测试里漏过它
// 就等于没测 —— 只数「出现在几个分类里」的实现会把它算成 1 次）。
if (parsed) {
  const firstId = parsed.cats[0].ids[0];
  const secondCat = parsed.cats[1];
  const catStart = src.indexOf('CATEGORY = ');
  const lb = src.indexOf('[', catStart);

  // ① 同一分类内重复：把 firstId 再插到这个分类列表开头
  const sameCat = `${src.slice(0, lb + 1)}'${firstId}', ${src.slice(lb + 1)}`;
  // ② 跨分类重复：把 firstId 追加到第二个分类的列表里
  const lb2 = src.indexOf('[', src.indexOf(`'${secondCat.name}'`, catStart));
  const crossCat = `${src.slice(0, lb2 + 1)}'${firstId}', ${src.slice(lb2 + 1)}`;

  const base = analyze(parseCategories(src), []);
  if (base.duplicated.length === 0) {
    ok('反向对照 · 未注入时没有重复登记', '否则下面的注入断言无从判断');
  } else {
    bad('未注入就判出重复登记', JSON.stringify(base.duplicated));
  }

  for (const [label, text, expectCats] of [
    ['同一分类内重复', sameCat, 1],
    [`跨分类重复（${parsed.cats[0].name} + ${secondCat.name}）`, crossCat, 2],
  ]) {
    const d = analyze(parseCategories(text), []).duplicated.find((x) => x.id === firstId);
    if (d && d.count === 2 && d.where.length === expectCats) {
      ok(`反向对照 · 注入「${label}」能被判出`, `${firstId} ×${d.count}（${d.where.map((w) => `${w.name}×${w.n}`).join('，')}）`);
    } else {
      bad(
        `反向对照失败：注入「${label}」没判对`,
        `得到 ${JSON.stringify(d)}（应为 ×2 且落在 ${expectCats} 个分类里）`
      );
    }
  }

  // ── 3. 解析器：坏输入必须返回 null（绝不「尽力而为」） ─────────────────
  const badInputs = {
    '没有 CATEGORY 定义': 'X = 1\n',
    '缺右花括号': "CATEGORY = {'基础组件': ['vui-button']\n",
    '列表没闭合': "CATEGORY = {'基础组件': ['vui-button'}\n",
    'id 不符合命名规范': "CATEGORY = {'基础组件': ['vui-Button']}\n",
  };
  const leaked = Object.entries(badInputs).filter(([, s]) => parseCategories(s) !== null);
  if (leaked.length) {
    bad('坏结构被判成合法输入', leaked.map(([k]) => k).join('，'));
  } else {
    ok('坏结构一律返回 null（调用方必须判空并失败）', `${Object.keys(badInputs).length} 种`);
  }
}

console.log('');
if (failed) {
  console.log('  CATEGORY 白名单校验未通过。\n');
  process.exit(1);
}
console.log('  CATEGORY 白名单校验通过。\n');
