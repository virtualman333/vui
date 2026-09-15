#!/usr/bin/env node
/**
 * npm publish 前的完整性校验（零依赖，Node 原生）
 *
 * 检查项：
 *   1. uni_modules 下每个组件目录结构完整（.vue / package.json / readme.md / changelog.md）
 *   2. 组件路径符合 easycom 通配规则 uni_modules/vui-x/components/vui-x/vui-x.vue
 *   3. index.js 中每一条 import 路径都真实存在
 *   4. types/index.d.ts 覆盖 index.js 导出的全部组件
 *   5. 必备文件（README.md / LICENSE / docs/API.md）存在
 *   6. package.json 的 files 字段包含 uni_modules/
 *
 * 任一项失败则以非 0 退出码终止发布。
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warns = [];

function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    return null;
  }
}

function pascal(cid) {
  return cid.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
}

function walkComponents() {
  const base = path.join(root, 'uni_modules');
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const mod of fs.readdirSync(base)) {
    const compsDir = path.join(base, mod, 'components');
    if (!fs.existsSync(compsDir)) continue;
    for (const comp of fs.readdirSync(compsDir)) {
      const vue = path.join(compsDir, comp, comp + '.vue');
      if (fs.existsSync(vue)) {
        out.push({ mod, comp, dir: path.join(base, mod), vue, rel: `uni_modules/${mod}` });
      }
    }
  }
  return out;
}

// 1 + 2. 组件结构与路径规范
const comps = walkComponents();
if (comps.length === 0) errors.push('uni_modules 下未找到任何组件');

for (const c of comps) {
  for (const f of ['package.json', 'readme.md', 'changelog.md']) {
    if (!fs.existsSync(path.join(c.dir, f))) errors.push(`组件 ${c.comp} 缺少 ${f}`);
  }
  const src = readIfExists(c.vue) || '';
  if (!/<template>/.test(src)) errors.push(`组件 ${c.comp} 缺少 <template>`);
  if (!/<script>/.test(src)) errors.push(`组件 ${c.comp} 缺少 <script>`);
  if (c.mod !== c.comp) {
    errors.push(
      `组件 ${c.comp} 的目录结构不符合 easycom 通配规则（应在 uni_modules/${c.comp}/components/${c.comp}/）：当前在 uni_modules/${c.mod}/`
    );
  }
}

// 3. index.js 的 import 路径存在性
const indexJs = readIfExists(path.join(root, 'index.js'));
if (!indexJs) {
  errors.push('缺少 index.js（包入口）');
} else {
  const imports = [...indexJs.matchAll(/from\s+'(\.[^']+)'/g)].map((m) => m[1]);
  for (const rel of imports) {
    if (!fs.existsSync(path.join(root, rel))) errors.push(`index.js 引用了不存在的文件: ${rel}`);
  }
  const registered = (indexJs.match(/^\tVui\w+,$/gm) || []).length;
  if (registered !== comps.length) {
    warns.push(
      `index.js 注册了 ${registered} 个组件，实际存在 ${comps.length} 个；` +
      '新增组件后请重新运行生成脚本刷新 index.js 与类型声明'
    );
  }
}

// 4. d.ts 覆盖度
const dts = readIfExists(path.join(root, 'types', 'index.d.ts'));
if (!dts) {
  errors.push('缺少 types/index.d.ts（编辑器补全将会失效）');
} else {
  const declared = new Set([...dts.matchAll(/export const (Vui\w+):/g)].map((m) => m[1]));
  for (const c of comps) {
    const p = pascal(c.comp);
    if (!declared.has(p)) errors.push(`types/index.d.ts 缺少组件 ${p} 的类型声明`);
  }
}

// 5. 必备文件
for (const f of ['README.md', 'LICENSE', 'docs/API.md']) {
  if (!fs.existsSync(path.join(root, f))) errors.push(`缺少 ${f}`);
}

// 6. files 字段
const pkg = JSON.parse(readIfExists(path.join(root, 'package.json')) || '{}');
if (!pkg.files || !pkg.files.some((f) => f.replace(/\/$/, '') === 'uni_modules')) {
  errors.push('package.json 的 files 字段必须包含 uni_modules');
}
if (!pkg.version || !/^\d+\.\d+\.\d+/.test(pkg.version)) {
  errors.push('package.json 的 version 格式不正确');
}
if (!pkg.types) warns.push('package.json 未声明 types 字段，编辑器将无法自动提示');

// 输出
console.log('\n[vui-uniapp] 发布前校验');
console.log(`  组件数量: ${comps.length}`);
console.log(`  包版本:   ${pkg.version}`);

if (warns.length) {
  console.log('\n  警告:');
  warns.forEach((w) => console.log(`    ! ${w}`));
}
if (errors.length) {
  console.log('\n  错误:');
  errors.forEach((e) => console.log(`    x ${e}`));
  console.log('\n校验未通过，已终止发布。\n');
  process.exit(1);
}
console.log('\n  校验通过，可以发布。\n');
