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
 * 共用同一份，不再各解析一遍），并检查五件事：
 *   1. **恰好登记一次**：同一组件出现在两个分类、或同一分类里写两遍，一律失败；
 *   2. **双向覆盖**：组件目录里有而白名单没有（文档漏收录）/ 白名单里有而目录里没有（幽灵）；
 *   3. **命名规范**：id 必须符合 `vui-<kebab>`（拼音/下划线/大写都是笔误）；
 *   4. **解析失败即失败**：拿不到结构就报错退出，绝不在空集上全绿。
 *   5. **README 里的数量声称与独立真值对账**：`check:gen` 只比对「重新生成 vs 已提交」，
 *      两边带同一个错数字时它照样全绿 —— 第 4 轮「N 个 AI 组件」被手抄在生成器模板里，
 *      加了第 48 个组件后它与 hero 行的「48 个组件」互相矛盾，没有任何检查报警。
 *      这一条把「谁在扛这句声称」变成可执行断言。
 *
 * 本脚本自身也做负向自检（不复制仓库、不跑生成器，因此很快）：
 * 拿**真实的 gen-docs.py 源码**注入一个重复登记，`analyze()` 必须判出来；
 * 未注入时必须判不出来（反向对照）—— 否则上面那些断言就是恒真的。
 *
 * 用法：
 *   npm run check:category
 */
const fs = require('fs');
const path = require('path');
const { componentIds } = require('./lib/components');
const { parseCategories, analyze, GEN_DOCS } = require('./lib/category');

const README = path.resolve(__dirname, '..', 'README.md');

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

  // ── 1d. README 里的「数量声称」必须与独立真值对账 ──────────────────────
  // 为什么放在这里：`check:gen` 只查「重新生成 vs 已提交」，两边带着**同一个**错数字时
  // 它照样全绿。真实发生过：hero 行的组件数是 `%(comp_count)d` 算出来的，但
  // 「N 个 AI 组件」是模板里**手抄的字面量** —— 加第 48 个组件（vui-count-to）时它没跟着动，
  // 于是同一份 README 里「48 个组件」与「11 个 AI 组件」并存，而进 AI 分类的组件已经有 12 个。
  // 修法是让它也走占位符；这条检查是防它再被抄回去。
  const claims = readmeClaims(fs.readFileSync(README, 'utf8'));
  const truth = {
    组件: comps.length,
    'AI 组件': (parsed.cats.find((c) => c.name === 'AI 组件') || { ids: [] }).ids.length,
  };
  const units = [...new Set(claims.map((c) => c.unit))];
  const missingUnits = ['组件', 'AI 组件', '属性', '事件'].filter((u) => !units.includes(u));
  if (missingUnits.length) {
    bad(
      `README 里没抓到「${missingUnits.join(' / ')}」的数量声称`,
      '解析失灵会让下面每条对账都在空集上通过 —— 这是本仓最贵的一类回归'
    );
  } else {
    ok('README 数量声称扫描面', `${claims.length} 处（${units.join(' / ')}）`);
  }
  // 只为「组件」「AI 组件」对账：这两个的真值来自**别处**（文件系统 / CATEGORY 白名单）。
  // 「属性」「事件」的数是同一个表达式算出来直接填进同一句话的，没有第二个来源可比，
  // 硬找一份来比反而是在造一条恒真的断言（AGENTS.md 第五节：不会响的检查更坏）。
  const checked = claims.filter((c) => c.unit in truth);
  const wrong = checked.filter((c) => c.n !== truth[c.unit]);
  if (wrong.length) {
    bad(
      `${wrong.length} 处 README 数量声称与真值不符`,
      wrong.map((c) => `第 ${c.at} 行「${c.raw}」应为 ${truth[c.unit]}`).join('；')
    );
    console.log('    → README 是生成物：说明生成器模板里手抄了这个数字，加/删组件时它不会跟着动。');
    console.log('      修法是把数字换成占位符（见 scripts/gen-docs.py 的 comp_count / ai_count），而不是手工改产物。');
  } else if (checked.length) {
    ok('README 数量声称与独立真值一致', checked.map((c) => `第 ${c.at} 行「${c.raw}」`).join('、'));
  }

  // ── 1e. 演示页 hero 文案声称了同一个数 —— 它是**手写**的，下一处漂的就是它 ──
  // README 那个数已经由生成器算（comp_count / ai_count），演示页没有：文案在 .vue 源文件里，
  // 加组件时没人会想起它。这里把「两处声称」钉在一起，任何一处掉了都会红。
  const AI_DEMO = path.resolve(__dirname, '..', 'pages', 'demo', 'ai.vue');
  const dm = /(\d+)\s*个面向大模型对话场景的组件/.exec(fs.readFileSync(AI_DEMO, 'utf8'));
  if (!dm) {
    bad(
      'pages/demo/ai.vue 里找不到「N 个面向大模型对话场景的组件」',
      '文案形态变了 —— 这条检查必须跟着改，否则它从此在空集上通过'
    );
  } else if (Number(dm[1]) !== truth['AI 组件']) {
    bad(
      `演示页 hero 文案写「${dm[1]} 个面向大模型对话场景的组件」，白名单里是 ${truth['AI 组件']} 个`,
      '这一处没有生成器兜底，加组件时别只改 README 的来源'
    );
  } else {
    ok('演示页 hero 文案与白名单一致', `${dm[1]} 个 AI 组件`);
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

// ── 工具 ──────────────────────────────────────────────────────────────────

/**
 * 抓出 README 里形如「N 个X」的数量声称。
 *
 * 形态覆盖（都来自真实 README）：
 *   `49 个开箱即用的组件`（hero 行 —— 数字与单位之间还夹着修饰语）
 *   `12 个 AI 组件`（特性列表）
 *   `共 **49** 个组件、**298** 个属性、**75** 个事件。`（统计行 —— 数字被 `**` 包起来）
 *
 * 只认这四类单位。中文数字（「三个页面」）与「几个」不匹配，恰好避开；
 * 其余「N 个…」多半是在说取值而不是计数（例如表格里「默认 48」）。
 */
function readmeClaims(text) {
  const out = [];
  // 中间的修饰语限长且不含标点：跨句/跨词组的误匹配会立刻暴露成对账失败，比放宽安全
  const re = /(\d+)\s*(?:\*\*)?\s*个\s*([^\n，。；：、（）()]{0,8}?)(AI 组件|组件|属性|事件)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({
      n: Number(m[1]),
      unit: m[3],
      // 原样回显这一句（去掉 `**`）—— 报错时让用户看到 README 里到底怎么写的，比拼接格式准
      raw: m[0].replace(/\*/g, '').trim(),
      at: text.slice(0, m.index).split('\n').length,
    });
  }
  return out;
}
