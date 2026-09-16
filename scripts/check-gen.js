#!/usr/bin/env node
/**
 * 生成产物一致性校验（零依赖，Node 原生）—— 落实 AGENTS.md 第二节「禁止手工编辑
 * 自动生成的产物」与第五节「新组件必须先跑 npm run gen」背后的那层保证。
 *
 * 为什么需要它
 * ------------
 * `index.js` / `types/index.d.ts` / `docs/API.md` / `README.md` 都是**生成物**，
 * 而生成器只在 `npm run gen` 与发布流程里跑。于是有两类错误谁都拦不住：
 *
 *   ① **改了组件但没重新生成**：提交上去的 index.js / .d.ts / API.md 仍是旧内容。
 *      使用方按 README 写的用法与包里实际行为对不上，而本仓库所有静态检查
 *      （prepublish / sfc / entry / types）全部只查「产物自身是否合法」，
 *      没有任何一条查「产物是否还反映源码」——旧产物同样是合法的。
 *
 *   ② **新组件忘了登记进 gen-docs.py 的 CATEGORY**：`docs/API.md` 与 `README.md`
 *      是按 CATEGORY 分组的白名单生成的，没登记就不收录。此时「重新生成」与
 *      「已提交产物」**完全一致**（都缺那个组件），差异检查发现不了它 ——
 *      第 3 轮加 `vui-count-to` 时就真的漏过一次。所以这里额外做一遍双向覆盖检查。
 *
 * 做法
 * ----
 * 把仓库复制到临时目录（不动工作区），在副本里跑真正的生成器，再与已提交的
 * 产物逐文件比对；同时校验「uni_modules 下的组件集合」与「生成文档里出现的
 * 组件集合」双向相等。临时目录用完即删。
 *
 * 注意：本机 git core.autocrlf=true，工作区文件是 CRLF、生成器写出的是 LF，
 * 比对时统一归一化行尾，否则每次都会假报「产物有差异」。
 *
 * 用法：
 *   npm run check:gen
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

/** 生成器负责维护的产物（组件级 package.json 由 release.js 同步版本，不在此列） */
const ARTIFACTS = ['index.js', 'types/index.d.ts', 'README.md', 'docs/API.md', 'package.json'];

/** 复制仓库时跳过的目录：体积大且与生成无关 */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'release', 'dist', 'temp', 'unpackage']);

console.log('\n[vui-uniapp] 生成产物一致性校验');

// ── 1. 产物必须存在 ──────────────────────────────────────────────────────
const missing = ARTIFACTS.filter((f) => !fs.existsSync(path.join(root, f)));
if (missing.length) {
  console.log(`  x 缺少生成产物: ${missing.join(', ')}`);
  console.log('    请先执行 npm run gen。\n');
  process.exit(1);
}

// ── 2. 复制到临时目录并重新生成 ─────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vui-gen-'));
let failed = false;

try {
  fs.cpSync(root, tmp, {
    recursive: true,
    filter: (src) => !SKIP_DIRS.has(path.basename(src)),
  });

  const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  for (const script of ['scripts/gen-package.py', 'scripts/gen-docs.py']) {
    const res = spawnSync(py, [script], { cwd: tmp, encoding: 'utf8' });
    if (res.error) {
      console.log(`  x 无法执行 ${py} ${script}: ${res.error.message}`);
      console.log('    生成产物一致性校验需要 Python 环境（与 npm run gen 相同）。\n');
      process.exit(1);
    }
    if (res.status !== 0) {
      console.log(`  x 生成器执行失败: ${script}（退出码 ${res.status}）`);
      console.log(indent((res.stderr || res.stdout || '').trim()));
      console.log('\n生成器跑不起来，无法判定产物是否同步。\n');
      process.exit(1);
    }
  }

  // ── 3. 逐文件比对 ─────────────────────────────────────────────────────
  const norm = (s) => s.replace(/\r\n/g, '\n');
  const diffs = [];
  for (const rel of ARTIFACTS) {
    const before = norm(fs.readFileSync(path.join(root, rel), 'utf8'));
    const after = norm(fs.readFileSync(path.join(tmp, rel), 'utf8'));
    if (before === after) continue;
    diffs.push({ rel, report: firstDiffs(before, after) });
  }

  if (diffs.length) {
    failed = true;
    console.log('  x 已提交的产物与源码不一致，共 ' + diffs.length + ' 个文件：');
    for (const d of diffs) {
      console.log(`\n    ${d.rel}（${d.report.count} 处不同，列出前 ${d.report.lines.length} 处）`);
      for (const l of d.report.lines) console.log(`      - ${l.before}`);
      for (const l of d.report.lines) console.log(`      + ${l.after}`);
    }
    console.log('\n  说明：产物是生成物，请执行 npm run gen 并把结果一起提交。');
    console.log('  （手改产物会在下次生成时被覆盖，见 AGENTS.md 第二节）\n');
  } else {
    console.log(`  重新生成后与已提交产物完全一致（${ARTIFACTS.length} 个文件）`);
  }

  // ── 4. 白名单一致性已搬家 ──────────────────────────────────────────────
  // 这里原本还做「uni_modules 组件目录 <-> gen-docs.py 的 CATEGORY」双向覆盖检查，
  // 但它与 check-category.js 会各解析一遍 CATEGORY（同一件事两遍），且旧实现用
  // `new Set` 去重、丢掉了「登记了几次」：把 vui-button 重复登记进第二个分类时，
  // 覆盖检查照样打印「双向一致」，而 README 总览表里该组件出现两行、hero 行仍写着
  // 「48 个组件」—— 同一个文档里两句话互相矛盾却没人报警。
  // 白名单的全部不变量（恰好一次 / 双向覆盖 / 命名规范 / 解析失败即失败）现在归
  // `npm run check:category` 一处负责，两条都在 check:all 里。
  console.log('  组件白名单不变量见 npm run check:category（本节不再重复解析 CATEGORY）');
} finally {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* 清理失败不影响判定 */
  }
}

if (failed) {
  console.log('生成产物一致性校验未通过。\n');
  process.exit(1);
}
console.log('  生成产物一致性校验通过。\n');

// ── 工具 ────────────────────────────────────────────────────────────────

/** 逐行比对，返回差异条数与前几条（生成物行序稳定，逐行比较足够定位） */
function firstDiffs(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const n = Math.max(a.length, b.length);
  const lines = [];
  let count = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? '';
    const y = b[i] ?? '';
    if (x === y) continue;
    count++;
    if (lines.length < 3) lines.push({ before: brief(x), after: brief(y) });
  }
  return { count, lines };
}

/** 单行摘要：过长截断，空行给个可见占位 */
function brief(s) {
  return s.length > 110 ? s.slice(0, 110) + '…' : s || '(空行)';
}

/** 缩进一段外部输出（生成器的 stderr） */
function indent(s) {
  return s
    .split(/\r?\n/)
    .map((l) => `    ${l}`)
    .join('\n');
}
