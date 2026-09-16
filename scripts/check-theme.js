#!/usr/bin/env node
/**
 * 主题变量校验（零依赖，Node 原生）—— 落实 AGENTS.md 第五节
 * 「样式块内的颜色只能引用 `$vui-*` 变量，不得硬编码色值」。
 *
 * 为什么需要它
 * ------------
 * 「颜色走主题变量」是本组件库**唯一的差异点**：`inject-theme.py` 在每个组件
 * 的样式块里声明 `$vui-*: <值> !default`，使用方只要在自己的 `uni.scss` 里重新
 * 赋值就能整体换肤。硬编码一次色值，那个组件就永久脱离主题层 —— 换肤时它不变，
 * 而**不会有任何报错**，只会看起来「这个按钮怎么没跟着变」。
 *
 * 这条规则写在 AGENTS.md 第五节与 CONTRIBUTING.md 里，但发布前六道检查
 * （prepublish / sfc / entry / types / gen / pack）没有一道看颜色：一次手工
 * 「统一主题变量」的成果，会被下一个新组件悄悄破坏，而且只有在用户换肤时才现形。
 *
 * 判定范围与豁免
 * --------------
 * 只校验 `uni_modules/**\/*.vue` 的 `<style lang="scss">` 块（规则原文如此）：
 *  - `$vui-*: ... !default` 那段兜底块由脚本注入、本身就是色值 → 整段排除；
 *  - 注释里的色值（说明文字、示例）不算 → 先剥注释再扫；
 *  - **中性遮罩/阴影豁免**：`rgba(0,0,0,.x)` 这类 R=G=B 的色值属视觉层次而非
 *    主题色，AGENTS.md 明确要求「保持中性、不变量化」；
 *  - 具名色（`white` 之类）只在**颜色类属性**上判定，避免 `white-space` 误报。
 *
 * 历史遗留基线
 * ------------
 * 首次建立本检查时，48 个组件里仍有 12 处硬编码色值。它们属于「用户可见」的改动，
 * 必须随版本一起发（AGENTS.md 第一节），因此不在建立检查的同一轮里顺手改掉。
 * BASELINE 是**只减不增**的棘轮：
 *  - 新增硬编码 → 失败；
 *  - 把基线里的某处改好了却忘记删条目 → 也失败（提示删除），保证白名单不会烂掉。
 *
 * **2026-09-17：棘轮已归零。** 那 12 处已全部改走主题变量（并为其中 3 处补了
 * 主题层缺失的变量：`$vui-text-color-disabled` / `$vui-code-bg` / `$vui-code-color`），
 * 因此 BASELINE 现在是空对象。空基线 = 这个文件从今往后是**硬闸门**：
 * 任何新出现的硬编码色值都会直接让 `npm run check:all` 失败，没有豁免通道。
 *
 * 用法：
 *   npm run check:theme
 */
const fs = require('fs');
const path = require('path');
// 组件集合的唯一来源（本文件旧实现自己 readdir 了一次）
const { componentIds } = require('./lib/components');

const root = path.resolve(__dirname, '..');
const MODULES = path.join(root, 'uni_modules');

/**
 * 历史遗留基线：`组件名|小写字面量` → 处置说明。
 * **只减不增**。修掉一处就把对应条目删掉（留着会报「条目已失效」）。
 *
 * 2026-09-17 起为空：12 处历史硬编码已全部改走主题变量，棘轮归零。
 * 空对象不是「关掉检查」——恰恰相反，它让下面那句 `BASELINE[key] ? 放行 : 失败`
 * 变成无条件失败，也就是说从这里开始，任何新的硬编码都会被直接拦下。
 */
const BASELINE = {};

/** `inject-theme.py` 注入的兜底块：整段排除（变量定义本身就是色值） */
const THEME_BLOCK_RE =
  /\/\*[^*]*VUI[^*]*主题变量[^*]*\*\/[\s\S]*?\/\*[^*]*VUI[^*]*主题变量结束[^*]*\*\//;
/** 兜底块的起始标记，用于检查「组件是否被注入过」 */
const THEME_MARK_RE = /\/\*[^*]*VUI[^*]*主题变量[^*]*\*\//;

/** 值位置上的十六进制色值。排除 `#{...}` 插值与 `#backtop` 这类选择器（后面不能接字母/短横线） */
const HEX_RE = /(?<=[:\s,(])(#[0-9a-fA-F]{3,8})(?![\w-])/g;
/** rgb() / rgba() / hsl() / hsla() 函数色值 */
const FUNC_RE = /\b(rgba?|hsla?)\(([^)]*)\)/gi;
/** 颜色类属性（只有这些属性上的具名色才算颜色） */
const COLOR_PROPS =
  /^(color|background|background-color|background-image|border|border-[a-z]+|outline|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|accent-color|text-decoration-color|column-rule|scrollbar-color)$/;
const NAMED_RE =
  /(?<![\w-])(white|black|red|blue|green|gray|grey|silver|orange|yellow|purple|pink|brown|cyan|magenta|lime|navy|teal|olive|maroon|aqua|fuchsia|gold|beige|ivory|khaki|salmon|coral|tan|violet|indigo|turquoise|lavender|crimson|chocolate|plum|orchid)(?![\w-])/i;

/** 把一段文本替换成等长空白（保留换行，行号才不会错位） */
function blank(s) {
  return s.replace(/[^\n]/g, ' ');
}

/** 剥掉 CSS/SCSS 注释（块注释与行注释），保留长度 */
function blankComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => blank(m))
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, (m, p1) => p1 + blank(m.slice(p1.length)));
}

function lineOf(lines, idx) {
  let n = 1;
  for (let i = 0; i < idx && i < lines.length; i += lines[i].length + 1) {
    if (i + lines[i].length + 1 <= idx) n++;
    else break;
  }
  return n;
}

/** 直接按行号表定位（比上面循环可靠）：把行起点数组传给调用方 */
function buildLineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}
function posToLine(starts, idx) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= idx) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** 取出一个 .vue 文件里所有 scss 样式块的 [内容起点, 内容] */
function scssBlocks(raw) {
  const out = [];
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(raw))) {
    const attrs = m[1];
    if (!/lang=["']scss["']/.test(attrs)) continue;
    const start = m.index + ('<style' + attrs + '>').length;
    out.push({ start, content: m[2] });
  }
  return out;
}

/**
 * 主题变量清单的**唯一来源**：`scripts/inject-theme.py` 的 THEME_BLOCK。
 * 这里只取变量名（正则扫 `$vui-xxx:`），不比对文本形状 —— 要求的是
 * 「每个组件能引用的变量集合 = 主题层提供的变量集合」，不是格式一致。
 */
const THEME_SOURCE = path.join(__dirname, 'inject-theme.py');
const EXPECTED_VARS = (() => {
  const src = fs.readFileSync(THEME_SOURCE, 'utf8');
  const m = /THEME_BLOCK\s*=\s*"""([\s\S]*?)"""/.exec(src);
  if (!m) return null;
  const names = [...m[1].matchAll(/\$vui-[a-z0-9-]+(?=\s*:)/g)].map((x) => x[0]);
  return new Set(names);
})();

/** 从一个样式块里取出兜底块声明的变量名 */
function themeVarsIn(body) {
  const m = THEME_BLOCK_RE.exec(body);
  if (!m) return null;
  return new Set([...m[0].matchAll(/\$vui-[a-z0-9-]+(?=\s*:)/g)].map((x) => x[0]));
}

/** 扫描单个文件，返回 { violations: [{line, text, literal, key}], exempt, missingTheme } */
function scanFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const rawLines = raw.split(/\r?\n/);
  const starts = buildLineStarts(raw);
  const blocks = scssBlocks(raw);
  const missingTheme =
    blocks.length > 0 && !blocks.some((b) => THEME_MARK_RE.test(b.content));
  const themeVars = themeVarsIn(blocks.map((b) => b.content).join('\n'));

  // 只保留 scss 样式块的内容，块外一律空白；再剥注释、排除主题兜底块
  let masked = blank(raw);
  for (const b of blocks) {
    let body = b.content.replace(THEME_BLOCK_RE, (m) => blank(m));
    body = blankComments(body);
    masked = masked.slice(0, b.start) + body + masked.slice(b.start + b.content.length);
  }

  const violations = [];
  const add = (idx, literal) => {
    const line = posToLine(starts, idx);
    violations.push({
      line,
      text: (rawLines[line - 1] || '').trim(),
      literal,
      key: path.basename(file, '.vue') + '|' + literal.toLowerCase(),
    });
  };

  let m;
  HEX_RE.lastIndex = 0;
  while ((m = HEX_RE.exec(masked))) add(m.index, m[1]);

  let exempt = 0;
  let derived = 0;
  FUNC_RE.lastIndex = 0;
  while ((m = FUNC_RE.exec(masked))) {
    const args = m[2]
      .split(',')
      .slice(0, 3);
    // 变量派生的色值（如 rgba($vui-error, .9)）本身就是「走了主题变量」，
    // 不是硬编码。此前这类写法会被误判成违规（第一个通道解析出 NaN → 判定为非中性），
    // 于是「把硬编码改成变量」反而会让校验变红 —— 那会把人逼回硬编码。
    if (args.some((x) => x.includes('$'))) {
      derived++;
      continue;
    }
    const nums = args.map((x) => Number(String(x).replace(/%/g, '').trim()));
    const neutral =
      nums.length === 3 && nums.every((n) => Number.isFinite(n)) && nums[0] === nums[1] && nums[1] === nums[2];
    if (neutral) exempt++;
    else add(m.index, m[0].replace(/\s+/g, ''));
  }

  // 具名色：只认「颜色类属性」上的声明，避免 white-space / display 之类误报
  const declRe = /(?:^|[;{\s])([-a-zA-Z]+)\s*:\s*([^;{}]*)/g;
  let d;
  while ((d = declRe.exec(masked))) {
    const prop = d[1].toLowerCase();
    const valueStart = d.index + d[0].length - d[2].length;
    if (!COLOR_PROPS.test(prop)) continue;
    const nm = NAMED_RE.exec(d[2]);
    if (nm) add(valueStart + nm.index, nm[0]);
  }

  return { violations, exempt, derived, missingTheme, themeVars, blocks: blocks.length };
}

console.log('\n[vui-uniapp] 主题变量校验');

if (!fs.existsSync(MODULES)) {
  console.log('  x 找不到 uni_modules 目录\n');
  process.exit(1);
}

const components = componentIds();

const all = [];
let exemptTotal = 0;
let derivedTotal = 0;
let blockTotal = 0;
const noTheme = [];
/** 兜底块变量清单与主题层不一致的组件：[组件, 缺的变量, 多的变量] */
const varDrift = [];

for (const c of components) {
  const dir = path.join(MODULES, c, 'components', c);
  if (!fs.existsSync(dir)) {
    console.log(`  x ${c}: 缺少 components/${c}/ 目录（见 AGENTS.md 第三节）`);
    all.push({ file: c, line: 0, text: '', literal: '', key: c + '|__dir__' });
    continue;
  }
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.vue'))) {
    const file = path.join(dir, f);
    const r = scanFile(file);
    blockTotal += r.blocks;
    exemptTotal += r.exempt;
    derivedTotal += r.derived;
    if (r.missingTheme) noTheme.push(c);
    for (const v of r.violations) all.push({ ...v, file: c });

    // 兜底块变量清单 == 主题层清单（inject-theme.py 的 THEME_BLOCK）
    if (EXPECTED_VARS && r.themeVars) {
      const missing = [...EXPECTED_VARS].filter((v) => !r.themeVars.has(v));
      const extra = [...r.themeVars].filter((v) => !EXPECTED_VARS.has(v));
      if (missing.length || extra.length) varDrift.push({ c, missing, extra });
    }
  }
}

console.log(`  组件: ${components.length}   scss 样式块: ${blockTotal}`);
console.log(
  `  豁免的中性遮罩/阴影: ${exemptTotal} 处（R=G=B，视觉层次而非主题色，AGENTS.md 第五节明确不变量化）`
);
console.log(`  变量派生的色值: ${derivedTotal} 处（如 rgba($vui-error, .9)，本就是走主题变量）`);
if (EXPECTED_VARS) {
  console.log(
    `  兜底块变量清单: 与主题层一致（${EXPECTED_VARS.size} 个变量，来源 scripts/inject-theme.py）`
  );
} else {
  // 解析不出来 = 这条检查**没有生效**。让它直接失败，而不是打一行警告继续 ——
  // 「检查自己静默消失了」正是本仓最贵的一类回归（prepublish-check 曾一边打印 48
  // 一边打印 49 却照样说「校验通过」）。
  console.log('\n  x 没能从 scripts/inject-theme.py 解析出 THEME_BLOCK —— 变量清单一致性检查无法生效');
  console.log('    该块是主题变量清单的唯一来源；改了它的写法请同步本文件的正则。');
  process.exit(1);
}

// 基线核对：条目必须仍然命中，否则说明该处已修好却没删条目（白名单会烂掉）
const hit = new Set();
const fresh = [];
for (const v of all) {
  if (Object.prototype.hasOwnProperty.call(BASELINE, v.key)) hit.add(v.key);
  else fresh.push(v);
}
const stale = Object.keys(BASELINE).filter((k) => !hit.has(k));

if (noTheme.length) {
  console.log(`\n  x ${noTheme.length} 个组件缺少主题变量兜底块 —— 样式块里没有 $vui-* 兜底定义，`);
  console.log('    使用方无法覆盖、组件脱离项目后也可能编译失败。执行：');
  console.log('      python scripts/inject-theme.py');
  for (const c of noTheme) console.log(`      - ${c}`);
}

if (hit.size) {
  console.log(`\n  基线内（历史遗留，随下个版本一并修）: ${hit.size} 处`);
  for (const k of [...hit].sort()) console.log(`      - ${k}   ${BASELINE[k] || ''}`);
}

if (fresh.length) {
  console.log(`\n  x ${fresh.length} 处硬编码色值（AGENTS.md 第五节：样式块内的颜色只能引用 $vui-* 变量）`);
  for (const v of fresh) {
    console.log(`      ${v.file}:${v.line}  ${v.literal}`);
    console.log(`        ${v.text.slice(0, 90)}`);
  }
  console.log('\n    改法：用主题变量替代，例如');
  console.log('      color: #909399;        ->  color: $vui-text-color-secondary;');
  console.log('      background: #f5f7fa;   ->  background: $vui-fill-color-light;');
  console.log('    可用的变量清单见 scripts/inject-theme.py 的 THEME_BLOCK；');
  console.log('    确实需要新变量时，先在 THEME_BLOCK 里加一条再跑 inject-theme.py。');
}

if (stale.length) {
  console.log(`\n  x ${stale.length} 条基线条目已失效（对应色值已修复或已改值）—— 白名单只减不增，请删除：`);
  for (const k of stale) console.log(`      - ${k}`);
  console.log('    删除位置：scripts/check-theme.js 的 BASELINE');
}

if (varDrift.length) {
  console.log(
    `\n  x ${varDrift.length} 个组件的兜底块变量清单与主题层（scripts/inject-theme.py 的 THEME_BLOCK）不一致：`
  );
  for (const d of varDrift) {
    const bits = [];
    if (d.missing.length) bits.push(`缺 ${d.missing.join(' ')}`);
    if (d.extra.length) bits.push(`多 ${d.extra.join(' ')}`);
    console.log(`      ${d.c}: ${bits.join('；')}`);
  }
  console.log('\n    为什么必须一致：组件引用一个自己兜底块里没有的变量时，单独编译该组件的');
  console.log('    样式（npm run check:sfc 就是这么做的）会直接报 Undefined variable；而');
  console.log('    inject-theme.py 旧版是「只注入不更新」，新加的变量永远进不了老组件。');
  console.log('    修法：python scripts/inject-theme.py');
}

if (fresh.length || noTheme.length || stale.length || varDrift.length) {
  console.log('\n主题变量校验未通过。\n');
  process.exit(1);
}

console.log('\n  主题变量校验通过。\n');
