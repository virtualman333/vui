#!/usr/bin/env node
/**
 * category.js —— `gen-docs.py` 里 `CATEGORY` 白名单的**唯一解析实现**
 *
 * 为什么必须收敛到一处
 * --------------------
 * `CATEGORY` 是「哪些组件会出现在 README 组件总览表与 docs/API.md 里」的唯一来源：
 * 生成器只遍历它，没登记进去的组件**一个字都不会出现在文档里**。于是关于它的事实 ——
 * 「白名单里的组件集合长什么样」—— 被两个脚本各解析了一遍：
 *   · `check-gen.js` step 4（双向覆盖检查）
 *   · `check-category.js`（本轮新增的唯一登记 / 命名规范检查）
 * 两份解析必然漂移，这正是本仓反复踩的「同一件事两遍」。所以解析收敛到这里，
 * 与组件枚举收敛到 `lib/components.js` 是同一个理由。
 *
 * 旧实现的两个缺陷（本文件同时修掉）
 * ----------------------------------
 *  ① **用 `new Set` 去重，丢掉了「登记了几次」**。`CATEGORY` 里同一个组件被写进两个
 *     分类时，去重后的集合与组件目录**完全一致** —— 覆盖检查照样打印「双向一致」。
 *     而实际产出的文档是：README 组件总览表里该组件出现**两行**、hero 行仍写着
 *     「共 48 个组件」、docs/API.md 里出现**两个同名锚点**（第二个链接永远跳到第一个）。
 *     实测：把 `vui-button` 加进「媒体组件」后，README 的 `<vui-button>` 行数 1 → 2，
 *     `check:gen` 依旧 exit 0。**同一个数字在同一个文档里与表格行数矛盾，没有任何东西报警。**
 *  ② **按 `{...}` 块整体正则扫 id**，块内注释里出现的 `vui-xxx` 会被当成登记项。
 *     现在按分类逐块解析（括号配对），并且 id 必须符合组件命名规范。
 *
 * 约定：**解析不出来一律返回 null，绝不「尽力而为」放行**（调用方必须判 null 并失败）。
 * 解析失败时的静默放行等于把这道检查从链上摘掉 —— 本仓已栽过一次
 * （`prepublish-check` 一度在组件集合为空集时照样全绿）。
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const GEN_DOCS = path.join(root, 'scripts', 'gen-docs.py');

/** 组件 id 的命名规范（与 uni_modules 目录名一致） */
const ID_RE = /^vui-[a-z0-9]+(-[a-z0-9]+)*$/;

/** 从 start 处的开括号出发，返回配对闭括号的下标；不成对返回 -1 */
function matchBracket(s, start, open, close) {
  if (s[start] !== open) return -1;
  let depth = 0;
  let inStr = null;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === '#') {
      // Python 行注释：跳到行尾
      while (i < s.length && s[i] !== '\n') i++;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close && --depth === 0) return i;
  }
  return -1;
}

/**
 * 解析 `CATEGORY` 字面量。
 *
 * @param {string} src gen-docs.py 的源码
 * @returns {{cats: {name: string, ids: string[]}[], ids: string[], duplicated: string[]} | null}
 *   `ids` 是**保留重复**的扁平列表；`duplicated` 是出现多次的 id。
 *   解析不出结构、或某个 id 不符合命名规范时返回 null。
 */
function parseCategories(src) {
  const key = src.indexOf('CATEGORY = ');
  if (key < 0) return null;
  const open = src.indexOf('{', key);
  if (open < 0) return null;
  const close = matchBracket(src, open, '{', '}');
  if (close < 0) return null;
  const body = src.slice(open + 1, close);

  const cats = [];
  const entryRe = /'([^']+)'\s*:\s*\[/g;
  let m;
  while ((m = entryRe.exec(body)) !== null) {
    const lb = m.index + m[0].length - 1;
    const rb = matchBracket(body, lb, '[', ']');
    if (rb < 0) return null;
    const ids = [];
    for (const q of body.slice(lb + 1, rb).matchAll(/'([^']+)'/g)) {
      if (!ID_RE.test(q[1])) return null; // 名字不像组件 id → 结构变了，宁可失败
      ids.push(q[1]);
    }
    cats.push({ name: m[1], ids });
    entryRe.lastIndex = rb; // 跳过已消费的列表，避免重复匹配
  }
  if (!cats.length) return null;

  const ids = cats.flatMap((c) => c.ids);
  const seen = new Map();
  for (const id of ids) seen.set(id, (seen.get(id) || 0) + 1);
  const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id).sort();
  return { cats, ids, duplicated };
}

/** 读仓库里的 gen-docs.py 并解析（解析失败返回 null） */
function readCategories() {
  return parseCategories(fs.readFileSync(GEN_DOCS, 'utf8'));
}

/**
 * 把白名单与真实组件集合对照，返回三类问题。
 * @param {{cats: {name: string, ids: string[]}[], ids: string[]}} parsed
 * @param {string[]} componentIds 真实组件 id（来自 lib/components.js）
 */
function analyze(parsed, componentIds) {
  const count = new Map();
  parsed.cats.forEach((c) => c.ids.forEach((id) => count.set(id, (count.get(id) || 0) + 1)));
  // 注意：这里报的是**登记次数**，不是「出现在几个分类里」——
  // 同一个分类里写两遍同样会让文档收录两次（标题 / 锚点重复），
  // 只数分类数会把它漏掉（上一版就是这么写的，日志里显示成「出现 1 次」）。
  const duplicated = [...count.entries()]
    .filter(([, n]) => n > 1)
    .map(([id, n]) => ({
      id,
      count: n,
      where: parsed.cats
        .map((c) => ({ name: c.name, n: c.ids.filter((x) => x === id).length }))
        .filter((c) => c.n > 0),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const unique = [...new Set(parsed.ids)];
  return {
    duplicated,
    notDocumented: componentIds.filter((id) => !unique.includes(id)).sort(),
    ghost: unique.filter((id) => !componentIds.includes(id)).sort(),
    emptyCats: parsed.cats.filter((c) => !c.ids.length).map((c) => c.name),
    total: unique.length,
  };
}

module.exports = { parseCategories, readCategories, analyze, GEN_DOCS, ID_RE };
