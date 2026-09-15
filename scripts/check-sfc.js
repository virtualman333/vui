#!/usr/bin/env node
/**
 * SFC 语法校验（AGENTS.md 第八节）
 *
 * 为什么需要它
 * ------------
 * 本仓库有 47 个手写组件，但环境里没有 HBuilderX，无法真机 / H5 实跑。现有两道静态
 * 检查都够不到「语法」这一层：
 *
 *   - scripts/check-template-refs.js  只查模板里引用的标识符是否存在
 *   - scripts/prepublish-check.js     只查目录结构、easycom 路径、类型覆盖
 *
 * 于是一个写错的结束标签、一段少了大括号的 SCSS、一句非法的模板表达式，可以一路
 * 通过校验并发布出去，直到用户真机上才炸——AGENTS.md 第六节记录的「模板作用域」
 * 事故就是这么来的，而语法级事故连专门的检查都没有。
 *
 * 本脚本用真正的编译器把这一环补齐，对每个 .vue 依次做：
 *
 *   parse（SFC 块结构）→ compileScript（JS 语法）→ compileTemplate（模板表达式）
 *   → sass 编译（SCSS 语法与变量引用）
 *
 * 关于依赖
 * --------
 * 本仓库其余脚本都是「零依赖，Node 原生」，这里刻意引入 @vue/compiler-sfc 与 sass。
 * 原因是手写解析器已被证明不可靠——见 check-template-refs.js 头部：早期用括号计数
 * 解析成员列表，会被正则字面量里的 `[.)]`、反引号带偏，产生大量假问题，最终弃用。
 * 语法校验只该交给编译器。
 *
 * 两者都是 devDependencies：不进入发布产物（package.json 的 files 不含 scripts/），
 * 使用者 npm install 时也不会被安装。未安装时本脚本给出可操作提示并非 0 退出。
 *
 * 用法
 * ----
 *   npm run check:sfc                     # 校验全部组件
 *   node scripts/check-sfc.js vui-button  # 只校验指定组件（排查用）
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// ---------- 依赖加载 ----------
let sfc;
let sass;
try {
  sfc = require('@vue/compiler-sfc');
} catch (e) {
  console.error('\n  x 缺少 @vue/compiler-sfc，无法执行 SFC 语法校验。');
  console.error('    请先安装开发依赖：npm install\n');
  process.exit(1);
}
try {
  sass = require('sass');
} catch (e) {
  console.error('\n  x 缺少 sass，无法校验组件的 SCSS。');
  console.error('    请先安装开发依赖：npm install\n');
  process.exit(1);
}

// ---------- 组件收集 ----------
function walkComponents() {
  const base = path.join(root, 'uni_modules');
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const mod of fs.readdirSync(base)) {
    const compsDir = path.join(base, mod, 'components');
    if (!fs.existsSync(compsDir)) continue;
    for (const comp of fs.readdirSync(compsDir)) {
      const vue = path.join(compsDir, comp, comp + '.vue');
      if (fs.existsSync(vue)) out.push({ comp, vue, rel: `uni_modules/${mod}/${comp}/${comp}.vue` });
    }
  }
  return out;
}

/** compileTemplate / parse 的错误项可能是字符串或对象，统一降成可读文本。 */
function errText(e) {
  if (typeof e === 'string') return e;
  if (e && e.message) return e.message;
  return JSON.stringify(e);
}

const filter = process.argv.slice(2).filter((a) => !a.startsWith('-'));
let comps = walkComponents();
if (filter.length) comps = comps.filter((c) => filter.includes(c.comp));

const errors = [];
let parsed = 0;
let scriptsCompiled = 0;
let templatesCompiled = 0;
let stylesCompiled = 0;

for (const c of comps) {
  const source = fs.readFileSync(c.vue, 'utf8');
  const id = c.comp.replace(/-/g, '_');

  // ① SFC 块结构
  let descriptor;
  try {
    const res = sfc.parse(source, { filename: c.vue });
    if (res.errors && res.errors.length) {
      for (const e of res.errors) errors.push(`${c.rel}\n      parse: ${errText(e)}`);
      continue;
    }
    descriptor = res.descriptor;
    parsed += 1;
  } catch (e) {
    errors.push(`${c.rel}\n      parse 抛错: ${errText(e)}`);
    continue;
  }

  // ② <script> JS 语法
  if (descriptor.script || descriptor.scriptSetup) {
    try {
      sfc.compileScript(descriptor, { id, inlineTemplate: false });
      scriptsCompiled += 1;
    } catch (e) {
      errors.push(`${c.rel}\n      compileScript: ${errText(e)}`);
    }
  } else {
    errors.push(`${c.rel}\n      缺少 <script> 块`);
  }

  // ③ <template> 模板表达式
  if (descriptor.template) {
    try {
      const res = sfc.compileTemplate({
        source: descriptor.template.content,
        filename: c.vue,
        id,
        scoped: descriptor.styles.some((s) => s.scoped),
      });
      if (res.errors && res.errors.length) {
        for (const e of res.errors) errors.push(`${c.rel}\n      compileTemplate: ${errText(e)}`);
      } else {
        templatesCompiled += 1;
      }
    } catch (e) {
      errors.push(`${c.rel}\n      compileTemplate 抛错: ${errText(e)}`);
    }
  } else {
    errors.push(`${c.rel}\n      缺少 <template> 块`);
  }

  // ④ <style lang="scss"> SCSS 语法
  for (const style of descriptor.styles) {
    if (style.lang !== 'scss') continue;
    try {
      sass.compileString(style.content, {
        syntax: 'scss',
        // scoped 只是编译期属性选择器，与 SCSS 编译无关；这里只校验样式源码本身
        quietDeps: true,
        logger: { warn() {}, debug() {} }, // 弃用提示不阻断校验
      });
      stylesCompiled += 1;
    } catch (e) {
      errors.push(`${c.rel}\n      SCSS: ${e.sassMessage || errText(e)}`);
    }
  }
}

// ---------- 输出 ----------
console.log('\n[vui-uniapp] SFC 语法校验');
console.log(`  扫描文件数:   ${comps.length}`);
console.log(`  parse 通过:   ${parsed}`);
console.log(`  script 通过:  ${scriptsCompiled}`);
console.log(`  template 通过:${templatesCompiled}`);
console.log(`  SCSS 通过:    ${stylesCompiled}`);

if (errors.length) {
  console.log('\n  错误:');
  errors.forEach((e) => console.log(`    x ${e}`));
  console.log(`\n共 ${errors.length} 处语法问题，校验未通过。\n`);
  process.exit(1);
}
console.log('\n  SFC 语法校验通过。\n');
