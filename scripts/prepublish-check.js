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
 *   7. 模板作用域（模板引用了不存在或不可访问的标识符）
 *   8. 校验链的清单必须是**派生式**的（`check:all` → `scripts/check-all.js`）
 *
 * 任一项失败则以非 0 退出码终止发布。
 */
const fs = require('fs');
const path = require('path');
// 组件枚举的唯一来源。旧实现在本文件里自己写了一份 walk——
// 它会把「目录在、同名 .vue 不在」的组件从集合里**静默丢弃**，于是 prepublishOnly
// 照样打印「校验通过，可以发布」，而 AGENTS.md 第三节那条红线的后果
// （用户的 easycom 配置静默失效）没有任何东西拦得住。详见 scripts/lib/components.js 头部。
const { listComponents, vueFiles, COMPONENT_PARTS } = require('./lib/components');

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

// 1 + 2. 组件结构与路径规范
const comps = listComponents();
if (comps.length === 0) errors.push('uni_modules 下未找到任何组件');

for (const c of comps) {
  for (const f of COMPONENT_PARTS) {
    if (!fs.existsSync(path.join(c.dir, f))) errors.push(`组件 ${c.id} 缺少 ${f}`);
  }
  if (c.problem === 'no-components-dir') {
    errors.push(
      `组件 ${c.id} 缺少 components/${c.id}/ 目录（easycom 通配规则要求 ` +
        `uni_modules/${c.id}/components/${c.id}/${c.id}.vue，见 AGENTS.md 第三节）`
    );
    continue;
  }
  if (!c.hasVue) {
    errors.push(
      `组件 ${c.id} 的目录里没有 ${c.comp}.vue —— easycom 按同名文件找入口，缺它等于这个组件` +
        `根本不在包里（使用方的引入配置会静默失效），而其它检查都会照常通过`
    );
    continue; // 没有源文件，下面的 template / script 检查无从谈起
  }
  const src = readIfExists(c.vue) || '';
  if (!/<template>/.test(src)) errors.push(`组件 ${c.comp} 缺少 <template>`);
  if (!/<script>/.test(src)) errors.push(`组件 ${c.comp} 缺少 <script>`);
  if (c.problem === 'mismatch') {
    errors.push(
      `组件 ${c.id} 的目录结构不符合 easycom 通配规则（应在 uni_modules/${c.id}/components/${c.id}/）：` +
        `当前在 uni_modules/${c.id}/components/${c.comp}/`
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
    // c.comp 在「缺 components/ 目录」时是 null，退回组件 id —— 结构坏掉时这条检查
    // 仍要能报出来，不能因为取不到目录名就整个崩掉（失败路径必须走得通）。
    const p = pascal(c.comp || c.id);
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

// 7. 模板作用域校验
let tmplChecked = 0;
try {
  const { checkTemplateRefs } = require('./check-template-refs');
  const res = checkTemplateRefs({ quiet: true });
  tmplChecked = res.stats.files;
  errors.push(...res.errors);
  warns.push(...res.warns);
} catch (e) {
  warns.push(`模板作用域校验未能执行: ${e.message}`);
}

// 7.5 两个「组件数」必须一致
// 旧实现里它们来自两套 walk（本文件按「有名同 .vue 的目录」、模板校验按「所有 .vue」），
// 于是在一个 .vue 名字写错时，同一个脚本会同时打印「组件数量: 48」和「模板已查: 49 个组件」——
// 矛盾摆在输出里，却没有任何东西把它当成问题。一个组件恰好一个入口 .vue，不一致就是结构坏了。
const vueCount = vueFiles().length;
if (vueCount !== comps.length) {
  errors.push(
    `组件枚举与 uni_modules 下的 .vue 数量不一致：组件 ${comps.length} 个、.vue 文件 ${vueCount} 个。` +
      '一个组件恰好一个入口 .vue；不一致说明有组件的目录结构坏了，或存在游离的 .vue 文件。'
  );
}

// 8. 校验链的清单必须是派生式的
// 这条自证刻意放在这里、而不是放在 `scripts/check-all.js` 里面 —— **守卫不能住在被守卫的
// 东西里**：有人把 `check:all` 改回手写的 `&&` 串时，`check-all.js` 根本不会被调用，
// 它内部那套自证（含「清单不少于 12 条」的不变量）也就无从运行，于是发布链会在
// 少跑若干条检查的情况下打印「全绿」。而 `prepublish-check` 是任何形态的链都会跑到的一环。
//
// 为什么手写链一定漂移：AGENTS.md 第八节写着「不要再在别处手写一份清单」，但手写链与
// `check:*` 独立入口本来就是同一件事的两份写法 —— 新加一条检查时忘了接进链里，
// 没有任何东西会报错。这件事真实发生过：`check:sfc` 建立后长期没进发布链（第 2 轮才补上）。
{
  const pkgRaw = readIfExists(path.join(root, 'package.json'));
  let chain = null;
  try {
    chain = String((JSON.parse(pkgRaw || '{}').scripts || {})['check:all'] || '').trim();
  } catch (e) {
    chain = null;
  }
  if (chain !== 'node scripts/check-all.js') {
    errors.push(
      `\`check:all\` 不再是派生式入口（实际：${JSON.stringify(chain)}）。` +
        '它必须指向 `scripts/check-all.js`，由该脚本从 package.json 现算清单；' +
        '手写 `&&` 串与 `check:*` 入口是同一件事的两份写法，必然漂移（见 AGENTS.md 第八节）。'
    );
  }
}

// 输出
console.log('\n[vui-uniapp] 发布前校验');
console.log(`  组件数量: ${comps.length}   .vue 文件: ${vueCount}`);
console.log(`  包版本:   ${pkg.version}`);
console.log(`  模板已查: ${tmplChecked} 个组件`);

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
