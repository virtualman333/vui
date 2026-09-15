#!/usr/bin/env node
/**
 * 模板作用域校验（零依赖，Node 原生）
 *
 * 为什么需要它：`vue-tsc` / `@vue/compiler-sfc` 只能校验语法，查不出模板引用了
 * 错误作用域的标识符。这类问题在运行时才暴露，且表现隐蔽：
 *
 *   类型一：模板引用了 script 中根本不存在的名字
 *          → 渲染时得到 undefined，或报 "Property xxx was accessed during render
 *            but is not defined"
 *   类型二：模板引用了模块级常量 / 函数
 *          → Vue3 模板作用域只有 props/data/computed/methods/inject，
 *            访问模块级 `const VUI_COLOR = {...}` 会直接报 "VUI_COLOR is not defined"
 *
 * 判定策略刻意做得极稳：模板表达式里用到的标识符，如果在整个 <script> 中
 * 一次都没出现过，那它必然是错的；模块级常量另有专门规则。
 * 不依赖括号配对或 AST——早期实现用括号计数解析成员列表，会被正则字面量里的
 * `[.)]`、反引号等字符带偏，产生大量假问题，故弃用。
 *
 * 用法：
 *   node scripts/check-template-refs.js        # 独立运行
 *   const { checkTemplateRefs } = require('./check-template-refs');   // 被 prepublish-check 复用
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// 模板中天然可用的名字（Vue 内置、JS 全局、关键字）
const RESERVED = new Set(
  `true false null undefined new typeof instanceof in of void delete
   Math JSON Date Number String Boolean Array Object RegExp Error Promise Set Map
   parseInt parseFloat isNaN Infinity NaN
   encodeURIComponent decodeURIComponent setTimeout clearTimeout setInterval clearInterval
   $slots $scopedSlots $emit $attrs $refs $props $el $options $parent $root
   $nextTick $forceUpdate $watch $set $delete`
    .split(/\s+/)
    .filter(Boolean)
);

// 属性：name="value"，覆盖普通属性、:bind、@event、v-xxx、#slot
const ATTR = /([A-Za-z_:@#][A-Za-z0-9_.\-:\[\]]*)\s*=\s*"([^"]*)"/g;

// 需要取表达式求值的属性前缀
const EXPR_PREFIX = [':', 'v-bind:', '@', 'v-on:', 'v-if', 'v-else-if', 'v-show', 'v-model'];

function stripLiterals(expr) {
  return expr
    .replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, ' ') // 字符串 / 模板字符串
    .replace(/\/(?:\\.|\[[^\]]*\]|[^/\n\\])+\/[gimsuy]*/g, ' ') // 正则字面量
    .replace(/([A-Za-z_$][\w$]*)\s*:/g, ' '); // 对象字面量的 key
}

/** 收集模板中的标识符引用，以及 v-for / 作用域插槽引入的局部变量 */
function collectRefs(tpl) {
  const exprs = [];
  const local = new Set();

  for (const m of tpl.matchAll(/\{\{([\s\S]*?)\}\}/g)) exprs.push(m[1]);

  ATTR.lastIndex = 0;
  let m;
  while ((m = ATTR.exec(tpl)) !== null) {
    const name = m[1];
    const val = m[2];
    const low = name.toLowerCase();

    if (low.startsWith('v-for')) {
      const am = val.match(/^\s*\(?\s*([A-Za-z_$][\w$]*)\s*(?:,\s*([A-Za-z_$][\w$]*))?\s*\)?\s+(?:in|of)\b/);
      if (am) {
        local.add(am[1]);
        if (am[2]) local.add(am[2]);
      }
      const rx = val.match(/\b(?:in|of)\s+([\s\S]+)$/);
      if (rx) exprs.push(rx[1]);
      continue;
    }

    if (name.startsWith('#')) {
      for (const part of val.matchAll(/([A-Za-z_$][\w$]*)/g)) local.add(part[1]);
      continue;
    }

    if (EXPR_PREFIX.some((p) => name.startsWith(p))) exprs.push(val);
  }

  const refs = new Map();
  const keywords = new Set(['in', 'of', 'typeof', 'instanceof', 'new', 'return', 'void', 'delete']);
  for (const e of exprs) {
    const cleaned = stripLiterals(e);
    for (const idm of cleaned.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)/g)) {
      const n = idm[1];
      if (keywords.has(n)) continue;
      if (!refs.has(n)) refs.set(n, e.trim().slice(0, 70));
    }
  }
  return { refs, local };
}

function walkVueFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkVueFiles(p, out);
    else if (entry.name.endsWith('.vue')) out.push(p);
  }
  return out;
}

function checkTemplateRefs(options = {}) {
  const quiet = !!options.quiet;
  const errors = [];
  const warns = [];
  const base = path.join(root, 'uni_modules');

  const vueFiles = fs.existsSync(base) ? walkVueFiles(base) : [];

  for (const file of vueFiles) {
    const src = fs.readFileSync(file, 'utf8');
    const tm = src.match(/<template>([\s\S]*?)<\/template>/);
    const sm = src.match(/<script>([\s\S]*?)<\/script>/);
    if (!tm || !sm) continue;

    const tpl = tm[1];
    const script = sm[1];
    const rel = file.replace(root + path.sep, '').replace(/\\/g, '/');
    const { refs, local } = collectRefs(tpl);

    // 类型一：模板引用了 script 中不存在的标识符
    const missing = [];
    for (const [name, frag] of [...refs.entries()].sort()) {
      if (RESERVED.has(name) || local.has(name)) continue;
      const re = new RegExp(`(?<![.\\w$])${name.replace(/[$]/g, '\\$&')}(?![\\w$])`);
      if (re.test(script)) continue;
      missing.push(`${name}  <-  ${frag}`);
    }
    if (missing.length) {
      errors.push(`[${rel}] 模板引用了 script 中不存在的标识符：\n      ${missing.join('\n      ')}`);
    }

    // 类型二：模板引用了模块级常量 / 函数（Vue3 模板作用域访问不到）
    const dm = script.search(/\bexport\s+default/);
    const head = dm >= 0 ? script.slice(0, dm) : '';
    const moduleNames = new Set();
    for (const mm of head.matchAll(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) moduleNames.add(mm[1]);
    for (const mm of head.matchAll(/^\s*function\s+([A-Za-z_$][\w$]*)/gm)) moduleNames.add(mm[1]);

    const scopeBad = [];
    for (const name of [...moduleNames].sort()) {
      if (RESERVED.has(name) || local.has(name)) continue;
      const re = new RegExp(`(?<![.\\w$])${name.replace(/[$]/g, '\\$&')}(?![\\w$])`);
      if (re.test(tpl)) scopeBad.push(name);
    }
    if (scopeBad.length) {
      errors.push(
        `[${rel}] 模板引用了模块级常量/函数（运行时不可访问）：${scopeBad.join(', ')}\n` +
          '      请改为 props 默认值或 computed 中转'
      );
    }
  }

  if (!quiet) {
    console.log('\n[vui-uniapp] 模板作用域校验');
    console.log(`  扫描文件数: ${vueFiles.length}`);
    if (errors.length) {
      console.log('\n  错误:');
      errors.forEach((e) => console.log(`    x ${e}`));
    } else {
      console.log('  未发现作用域问题。');
    }
    console.log('');
  }

  return { errors, warns, stats: { files: vueFiles.length } };
}

module.exports = { checkTemplateRefs, collectRefs, stripLiterals };

if (require.main === module) {
  const { errors } = checkTemplateRefs();
  process.exit(errors.length ? 1 : 0);
}
