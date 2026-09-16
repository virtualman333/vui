#!/usr/bin/env node
/**
 * 打包产物校验（零依赖，Node 原生）—— 把 AGENTS.md 第八节的 `npm run pack` 从
 * 「人工看一眼」变成「脚本判定」。
 *
 * 为什么需要它
 * ------------
 * 前面几条校验查的都是**仓库里的文件**：check-sfc 查 *.vue 语法、check-entry 查入口、
 * check-types 查类型声明、check-gen 查生成产物是否反映源码、prepublish-check 查目录
 * 结构与类型覆盖。
 *
 * 但用户 `npm i vui-uniapp` 拿到的不是仓库，是 **tarball**。`package.json` 的 `files`
 * 字段决定 tarball 装了什么，而它此前**没有任何自动核对**：
 *
 *   - `files` 少写一项（漏掉 `types/`）→ 产物本身全部合法，四条检查全绿，使用方
 *     的 TS 直接找不到声明文件。这条链上没有任何一处会发现。
 *   - `files` 被追加条目（`"scripts/"`、`"pages/"`）→ 演示页、演示素材、开发脚本、
 *     HBuilderX 工程文件一起进包，包体暴涨且暴露实现细节。
 *   - `files` 被图省事写成 `["./"]` → **实测只装根目录的 4 个文件**
 *     （`LICENSE` / `README.md` / `index.js` / `package.json`），
 *     `types/`、`docs/`、`uni_modules/` 这些**目录全部不入包** —— 48 个组件一个
 *     也发不出去，而前面几条检查照样全绿（仓库里的文件本来就都在）。
 *     这条反直觉行为是实测出来的，写在这里免得后人再试一次。
 *   - 某个组件的四件套缺一件（改了目录结构）→ AGENTS.md 第三节写明这会让用户的
 *     easycom 配置**静默失效**，是用户侧故障，不是仓库内部问题。
 *
 * 因此本脚本用 `npm pack --dry-run --json` 取**真实**打包清单（不是重新实现一遍
 * npm 的 ignore 规则 —— 那本身就是最容易漂移的第二份实现），逐条断言。
 *
 * 用法：
 *   npm run check:pack
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

/** 用户必须拿到的文件；缺任何一个都会让包不可用或不可读 */
const REQUIRED = [
  'package.json',
  'index.js', // main / module 入口
  'types/index.d.ts', // TS 声明（files 少写 types/ 时最先消失的就是它）
  'README.md',
  'LICENSE',
  'docs/API.md',
];

/** 组件的四件套；AGENTS.md 第三节规定目录结构，缺一件即破坏 easycom */
const COMPONENT_PARTS = ['package.json', 'readme.md', 'changelog.md'];

/**
 * 绝不该进包的文件。npm 自带 ignore 能挡掉 `node_modules` 与 `.npmrc`，
 * 这里仍然列出是为了**显式表达意图**（万一将来有人改 `files` 或加 `.npmignore`）。
 */
const FORBIDDEN_DIRS = [
  ['node_modules/', '依赖目录（npm 自带 ignore，列出以防 files 被改宽）'],
  ['unpackage/', 'HBuilderX 构建产物'],
  ['scripts/', '本仓库的开发/校验脚本，使用方不需要'],
  ['pages/', '演示页面，不属于组件库'],
  ['static/', '演示素材，不属于组件库'],
  ['.github/', 'CI 配置'],
];
const FORBIDDEN_FILES = [
  ['.npmrc', '含 npm token 明文'],
  ['AGENTS.md', '面向本仓库协作者的规则'],
  ['CONTRIBUTING.md', '面向贡献者的文档'],
  ['package-lock.json', '开发用锁文件'],
  ['App.vue', 'HBuilderX 工程文件'],
  ['main.js', 'HBuilderX 工程文件'],
  ['pages.json', 'HBuilderX 工程文件'],
  ['manifest.json', 'HBuilderX 工程文件'],
  ['uni.scss', 'HBuilderX 工程文件'],
  ['index.html', 'HBuilderX 工程入口'],
];

/** 体积上限（宽松阈值）：目的是抓「误入大文件」，不是逐 KB 比对 */
const MAX_PACKED_KB = 1536;
const MAX_UNPACKED_KB = 12 * 1024;

console.log('\n[vui-uniapp] 打包产物校验');

// ── 1. 取真实打包清单 ────────────────────────────────────────────────────
const isWin = process.platform === 'win32';
const res = spawnSync(isWin ? 'npm.cmd' : 'npm', ['pack', '--dry-run', '--json'], {
  cwd: root,
  encoding: 'utf8',
  // Windows 上 npm 是 .cmd 包装脚本，必须经 shell 才能执行。
  // 本命令的参数都不含空格，不会踩「shell 按空格重新切分参数」的坑。
  shell: isWin,
});

if (res.error) {
  console.log(`  x 无法执行 npm pack: ${res.error.message}`);
  console.log('    打包产物校验需要 npm 环境。\n');
  process.exit(1);
}

const raw = res.stdout || '';
let meta = null;
try {
  meta = JSON.parse(raw);
} catch {
  const at = raw.indexOf('[');
  if (at >= 0) {
    try {
      meta = JSON.parse(raw.slice(at));
    } catch {
      meta = null;
    }
  }
}

if (!Array.isArray(meta) || !meta.length || !Array.isArray(meta[0].files)) {
  console.log('  x 未能解析 npm pack --json 的输出。');
  console.log(indent((raw + '\n' + (res.stderr || '')).trim() || '(无输出)'));
  console.log('');
  process.exit(1);
}

const info = meta[0];
const paths = info.files.map((f) => String(f.path).replace(/\\/g, '/'));
const set = new Set(paths);
const packedKb = Math.round(info.size / 1024);
const unpackedKb = Math.round(info.unpackedSize / 1024);

console.log(`  包名/版本:    ${info.name}@${info.version}`);
console.log(`  文件数:       ${paths.length}`);
console.log(`  压缩后:       ${packedKb} kB`);
console.log(`  解压后:       ${unpackedKb} kB`);

/** 结论按类别分组输出：某一类问题再多也不能把另一类挤掉（每类各自限量） */
const G_REQUIRED = '必需文件缺失';
const G_FORBIDDEN = '不该进包的文件';
const G_COMPONENT = '组件四件套不完整';
const G_SIZE = '体积超限';
const GROUPS = [G_REQUIRED, G_FORBIDDEN, G_COMPONENT, G_SIZE].map((title) => ({ title, items: [] }));
const report = (title, item) => {
  const g = GROUPS.find((x) => x.title === title);
  if (g && !g.items.includes(item)) g.items.push(item);
};

// ── 2. 必需文件必须在 ────────────────────────────────────────────────────
for (const rel of REQUIRED) {
  if (!set.has(rel)) report(G_REQUIRED, `缺少必需文件：${rel}`);
}

// ── 3. 每个组件的四件套齐全（AGENTS.md 第三节）────────────────────────────
const uniDir = path.join(root, 'uni_modules');
const comps = fs.existsSync(uniDir)
  ? fs.readdirSync(uniDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];
if (!comps.length) {
  report(G_COMPONENT, '仓库里找不到任何组件目录（uni_modules/ 为空？）');
}
for (const id of comps) {
  for (const part of COMPONENT_PARTS) {
    const rel = `uni_modules/${id}/${part}`;
    if (!set.has(rel)) report(G_COMPONENT, `组件 ${id} 缺 ${part}（包内无 ${rel}）`);
  }
  const vue = `uni_modules/${id}/components/${id}/${id}.vue`;
  if (!set.has(vue)) report(G_COMPONENT, `组件 ${id} 缺实现文件（包内无 ${vue}）`);
}
console.log(`  组件数:       ${comps.length}（逐个核对四件套）`);

// ── 4. 不该进包的不许进 ──────────────────────────────────────────────────
for (const p of paths) {
  for (const [prefix, why] of FORBIDDEN_DIRS) {
    if (p.startsWith(prefix)) report(G_FORBIDDEN, `${p}（${why}）`);
  }
  // 精确匹配根目录下的文件，不误伤组件目录里的同名文件
  for (const [name, why] of FORBIDDEN_FILES) {
    if (p === name) report(G_FORBIDDEN, `${p}（${why}）`);
  }
}

// ── 5. 体积上限 ──────────────────────────────────────────────────────────
if (packedKb > MAX_PACKED_KB) {
  report(G_SIZE, `压缩后体积 ${packedKb} kB 超过上限 ${MAX_PACKED_KB} kB（是否有大文件进了组件目录？）`);
}
if (unpackedKb > MAX_UNPACKED_KB) {
  report(G_SIZE, `解压后体积 ${unpackedKb} kB 超过上限 ${MAX_UNPACKED_KB} kB`);
}

// ── 6. 结论 ──────────────────────────────────────────────────────────────
console.log(`  入口/类型:    ${set.has('index.js') ? 'index.js' : '缺失'} / ${set.has('types/index.d.ts') ? 'types/index.d.ts' : '缺失'}`);

const PER_GROUP = 8;
const total = GROUPS.reduce((n, g) => n + g.items.length, 0);

if (total) {
  console.log('\n  发现以下问题：');
  for (const g of GROUPS) {
    if (!g.items.length) continue;
    console.log(`\n  【${g.title}】共 ${g.items.length} 条`);
    for (const it of g.items.slice(0, PER_GROUP)) console.log(`    x ${it}`);
    if (g.items.length > PER_GROUP) console.log(`    … 另有 ${g.items.length - PER_GROUP} 条同类问题`);
  }
  console.log('\n打包产物校验未通过（上面查的是用户真正装到手里的 tarball）。\n');
  process.exit(1);
}

console.log('\n  打包产物校验通过。\n');

/** 多行文本统一缩进，便于把子进程输出嵌进本脚本的报告 */
function indent(s) {
  return String(s)
    .split(/\r?\n/)
    .map((l) => `    ${l}`)
    .join('\n');
}
