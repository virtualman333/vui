#!/usr/bin/env node
/**
 * 组件枚举与结构检查的自检（零依赖，Node 原生）
 *
 * 为什么需要它
 * ------------
 * `scripts/lib/components.js` 收敛了 6 处重复的组件枚举，其中最关键的一条是
 * **枚举不得静默丢弃结构坏掉的组件**。这条不变量无法靠「读一遍代码」保住：
 * 旧实现（`if (fs.existsSync(vue)) out.push(...)`）读起来完全正常，直到你真的放一个
 * 名字写错的 `.vue` 进去，才会发现 `prepublish-check` 打印的是「校验通过，可以发布」、
 * 而同一段输出里两个组件数（48 / 49）互相矛盾。
 *
 * 因此这里用**子进程真跑一遍**：在仓库副本里注入一个结构坏掉的组件，
 * `prepublish-check` 必须非 0 退出，且必须点名那个组件。
 * 同时锁住「枚举只有一份」这条结构约束 —— 被删掉的闸门不会让任何行为断言变红。
 *
 * 用例：
 *   1. 行为锁 · 目录在、同名 .vue 不在（`.vue` 名字写错）→ 必须拦下
 *   2. 行为锁 · 整个 components/ 目录缺失 → 必须拦下
 *   3. 反向对照 · 未注入时副本里的 prepublish-check 必须是绿的（否则上两条是假红）
 *   4. 不变量 · 组件数 == uni_modules 下的 .vue 数
 *   5. 结构锁 · scripts/ 下只有 lib/components.js 会去 readdir 'uni_modules'
 *
 * 用法：
 *   node scripts/check-components.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { listComponents, componentIds, vueFiles } = require('./lib/components');

const root = path.resolve(__dirname, '..');
let failed = false;

function ok(name, note) {
  console.log(`  ok  ${name}${note ? `  —— ${note}` : ''}`);
}
function bad(name, note) {
  failed = true;
  console.log(`  x   ${name}${note ? `  —— ${note}` : ''}`);
}

/** 复制仓库到临时目录（跳过 node_modules / .git / dist —— prepublish-check 零依赖） */
function copyRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vui-components-'));
  const skip = new Set(['node_modules', '.git', 'dist', '.hbuilderx']);
  fs.cpSync(root, tmp, {
    recursive: true,
    filter: (src) => !src.split(path.sep).some((seg) => skip.has(seg)),
  });
  return tmp;
}

function runPrepublish(dir) {
  const r = spawnSync(process.execPath, [path.join('scripts', 'prepublish-check.js')], {
    cwd: dir,
    encoding: 'utf8',
  });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

/** 在副本里造一个结构坏掉的组件；kind = 'no-vue'（名字写错）| 'no-dir'（缺 components/） */
function injectBroken(dir, kind) {
  const id = 'vui-probe';
  fs.mkdirSync(path.join(dir, 'uni_modules', id), { recursive: true });
  fs.writeFileSync(path.join(dir, 'uni_modules', id, 'package.json'), '{"id":"vui-probe"}\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'uni_modules', id, 'readme.md'), '# probe\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'uni_modules', id, 'changelog.md'), '# 1.0.0\n', 'utf8');
  if (kind === 'no-dir') return id;
  // 目录在、但入口文件名不对（easycom 找不到它）
  const compDir = path.join(dir, 'uni_modules', id, 'components', id);
  fs.mkdirSync(compDir, { recursive: true });
  fs.writeFileSync(
    path.join(compDir, 'index.vue'),
    '<template><view /></template>\n<script>export default { name: "vui-probe" };</script>\n',
    'utf8'
  );
  return id;
}

// ── 4. 不变量：组件数 == .vue 数 ──────────────────────────────────────────
const comps = listComponents();
const vues = vueFiles();
if (comps.length === vues.length && comps.length > 0) {
  ok('组件数与 uni_modules 下的 .vue 数一致', `${comps.length} = ${vues.length}`);
} else {
  bad('组件数与 .vue 数不一致', `组件 ${comps.length} 个、.vue ${vues.length} 个`);
}

// ── 5. 结构锁：枚举只有一份 ───────────────────────────────────────────────
const scriptFiles = fs
  .readdirSync(path.join(root, 'scripts'), { recursive: true, encoding: 'utf8' })
  .filter((p) => p.endsWith('.js'))
  .map((p) => path.join(root, 'scripts', p));
const outOfLib = scriptFiles.filter(
  (f) => !f.endsWith(path.join('lib', 'components.js')) && /readdirSync\([^)]*uni_modules/.test(fs.readFileSync(f, 'utf8'))
);
if (!outOfLib.length) {
  ok('组件枚举只有一份（scripts/lib/components.js）', `扫了 ${scriptFiles.length} 个脚本`);
} else {
  bad(
    'scripts/ 下又出现了自己 readdir uni_modules 的实现',
    outOfLib.map((f) => path.relative(root, f).replace(/\\/g, '/')).join(', ')
  );
}

// ── 1/2/3. 行为锁：在副本里注入坏结构，prepublish-check 必须拦下 ─────────
let tmp = null;
try {
  tmp = copyRepo();

  const base = runPrepublish(tmp);
  if (base.code === 0) {
    ok('反向对照 · 未注入时副本里是绿的', '否则下面两条会是假红');
  } else {
    bad('反向对照失败：未注入时副本里 prepublish-check 就不通过', `exit=${base.code}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;

  for (const [kind, name] of [
    ['no-vue', '目录在、同名 .vue 不在（.vue 文件名写错）'],
    ['no-dir', '组件缺 components/ 目录'],
  ]) {
    const dir = copyRepo();
    try {
      const id = injectBroken(dir, kind);
      const r = runPrepublish(dir);
      if (r.code !== 0 && r.out.includes(id)) {
        ok(`注入「${name}」被拦下`, `exit=${r.code}，点名了 ${id}`);
      } else if (r.code === 0) {
        bad(`注入「${name}」没被拦下`, 'prepublish-check 照样通过了');
      } else {
        bad(`注入「${name}」被拦下但没点名 ${id}`, '报错必须指出是哪个组件');
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
} catch (e) {
  bad('自检执行失败', e.message);
} finally {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('');
if (failed) {
  console.log('  组件枚举 / 结构检查自检未通过。\n');
  process.exit(1);
}
console.log('  组件枚举 / 结构检查自检通过。\n');
