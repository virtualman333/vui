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
 * 首次建立本检查时，48 个组件里仍有若干处硬编码色值（见 BASELINE）。它们属于
 * 「用户可见」的改动，必须随版本一起发（AGENTS.md 第一节），因此不在建立检查的
 * 同一轮里顺手改掉。BASELINE 是**只减不增**的棘轮：
 *  - 新增硬编码 → 失败；
 *  - 把基线里的某处改好了却忘记删条目 → 也失败（提示删除），保证白名单不会烂掉。
 *
 * 用法：
 *   npm run check:theme
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const MODULES = path.join(root, 'uni_modules');

/**
 * 历史遗留基线：`组件名|小写字面量` → 处置说明。
 * **只减不增**。修掉一处就把对应条目删掉（留着会报「条目已失效」）。
 */
const BASELINE = {
  // 分隔线：主题层里本来就有同名变量（$vui-bg-color-hover: #f2f3f5 !default），
  // 却在 5 个组件里各复制了一遍 —— 换肤时这 5 条分隔线不会跟着走。
  'vui-calendar|#f2f3f5': '→ $vui-bg-color-hover',
  'vui-card|#f2f3f5': '→ $vui-bg-color-hover',
  'vui-collapse|#f2f3f5': '→ $vui-bg-color-hover',
  'vui-drawer|#f2f3f5': '→ $vui-bg-color-hover',
  'vui-select|#f2f3f5': '→ $vui-bg-color-hover',
  // 下面两处是同样的「主题层已有同名值」：$vui-text-color-placeholder 就是 #c0c4cc
  'vui-scrollbar|#c0c4cc': '→ $vui-text-color-placeholder（值完全相同）',
  // 记录中的红色遮罩：$vui-error 就是 #e43d33，应写 rgba($vui-error, .9)
  'vui-voice-input|rgba(228,61,51,0.9)': '→ rgba($vui-error, .9)',
  // 日历的辅助文字：主题层没有等值变量，需先补一条（如 $vui-text-color-disabled）
  'vui-calendar|#e4e7ed': '→ 需新增文本辅助色变量',
  // 代码块配色（深色底 + 配套前景），vui-code 与 vui-markdown 各写了一份，逐字相同 ——
  // 典型的两处实现，应抽成 $vui-code-bg / $vui-code-color 两个变量
  'vui-code|#282c34': '→ 新增 $vui-code-bg',
  'vui-code|#abb2bf': '→ 新增 $vui-code-color',
  'vui-markdown|#282c34': '→ 新增 $vui-code-bg',
  'vui-markdown|#abb2bf': '→ 新增 $vui-code-color',
};

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

/** 扫描单个文件，返回 { violations: [{line, text, literal, key}], exempt, missingTheme } */
function scanFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const rawLines = raw.split(/\r?\n/);
  const starts = buildLineStarts(raw);
  const blocks = scssBlocks(raw);
  const missingTheme =
    blocks.length > 0 && !blocks.some((b) => THEME_MARK_RE.test(b.content));

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
  FUNC_RE.lastIndex = 0;
  while ((m = FUNC_RE.exec(masked))) {
    const nums = m[2]
      .split(',')
      .slice(0, 3)
      .map((x) => Number(String(x).replace(/%/g, '').trim()));
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

  return { violations, exempt, missingTheme, blocks: blocks.length };
}

console.log('\n[vui-uniapp] 主题变量校验');

if (!fs.existsSync(MODULES)) {
  console.log('  x 找不到 uni_modules 目录\n');
  process.exit(1);
}

const components = fs
  .readdirSync(MODULES, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith('vui-'))
  .map((e) => e.name)
  .sort();

const all = [];
let exemptTotal = 0;
let blockTotal = 0;
const noTheme = [];

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
    if (r.missingTheme) noTheme.push(c);
    for (const v of r.violations) all.push({ ...v, file: c });
  }
}

console.log(`  组件: ${components.length}   scss 样式块: ${blockTotal}`);
console.log(
  `  豁免的中性遮罩/阴影: ${exemptTotal} 处（R=G=B，视觉层次而非主题色，AGENTS.md 第五节明确不变量化）`
);

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

if (fresh.length || noTheme.length || stale.length) {
  console.log('\n主题变量校验未通过。\n');
  process.exit(1);
}

console.log('\n  主题变量校验通过。\n');
