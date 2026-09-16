#!/usr/bin/env node
/**
 * 入口语法校验（零依赖，Node 原生）—— 落实 AGENTS.md 第八节「入口语法」一条。
 *
 * 为什么需要它
 * ------------
 * `index.js` 是 npm 包的 `main` / `module` 入口，由 `scripts/gen-package.py`
 * **每次发布时重新生成**。它此前没有任何语法校验：
 * check-template-refs 查的是模板里的标识符，check-sfc 查的是 *.vue，
 * prepublish-check 查的是结构与类型覆盖 —— 三者都不解析入口文件本身。
 *
 * 入口一旦带上语法错误（生成脚本改坏、组件名带出非法标识符、少一个逗号），
 * 受影响的是**每一个** `import VUI from 'vui-uniapp'` 的使用方：他们的构建
 * 会直接报错，而本仓库这边静态检查全绿。这类错误必须在发布前拦下。
 *
 * 为什么先复制成 .mjs
 * -------------------
 * 本仓库 package.json 没有 `"type": "module"`，`node --check index.js` 会按
 * CommonJS 解析，遇到 `import` 直接判定语法错误（假警报）。复制成 `.mjs` 后
 * 强制 ESM 解析，才能验到真正的入口语法。这正是 AGENTS.md 第八节的写法。
 *
 * 用法：
 *   npm run check:entry
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const ENTRY = path.join(root, 'index.js');

console.log('\n[vui-uniapp] 入口语法校验');

if (!fs.existsSync(ENTRY)) {
  console.log(`  x 找不到入口文件: index.js`);
  console.log('    请先执行 python scripts/gen-package.py 生成入口。\n');
  process.exit(1);
}

const src = fs.readFileSync(ENTRY, 'utf8');
const lines = src.split(/\r?\n/).length;

// 复制到同目录下临时 .mjs：node --check 按扩展名判定模块类型，
// 放在磁盘上（而非管道）才能让 ESM 解析生效。
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vui-entry-'));
const tmpFile = path.join(tmpDir, 'index.mjs');

let res;
try {
  fs.writeFileSync(tmpFile, src, 'utf8');
  res = spawnSync(process.execPath, ['--check', tmpFile], { encoding: 'utf8' });
} finally {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* 清理失败不影响判定 */
  }
}

if (res.error) {
  console.log(`  x 无法执行 node --check: ${res.error.message}\n`);
  process.exit(1);
}

if (res.status !== 0) {
  const detail = (res.stderr || res.stdout || '').trim();
  console.log(`  行数:         ${lines}`);
  console.log('\n  错误:');
  console.log(
    detail
      .split(/\r?\n/)
      .map((l) => `    ${l.replace(new RegExp(escapeRe(tmpFile), 'g'), 'index.js')}`)
      .join('\n')
  );
  console.log('\n入口文件存在语法错误，校验未通过。\n');
  process.exit(1);
}

// 统计信息：入口是「全量注册」的聚合文件，import 数对不上时肉眼可见
const imports = (src.match(/^import\s/gm) || []).length;
const hasDefault = /export\s+default\s/.test(src);
console.log(`  行数:         ${lines}`);
console.log(`  import 条数:  ${imports}`);
console.log(`  default 导出: ${hasDefault ? '有' : '无'}`);

if (!hasDefault) {
  console.log('\n  x 入口未提供 default 导出，`app.use(VUI)` 的用法会失效。\n');
  process.exit(1);
}

console.log('\n  入口语法校验通过。\n');

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
