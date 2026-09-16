#!/usr/bin/env node
/**
 * 规则执行器校验（零依赖，Node 原生）—— 把 AGENTS.md 里**只写在文档里、没人执行**的
 * 红线变成可执行检查。
 *
 * 为什么需要它
 * ------------
 * 第二节「红线」写着 6 条、第四节「组件写法约定」写着 5 条，措辞都是「禁止 / 不得 / 必须」。
 * 但发布前的检查链只覆盖了其中一部分：
 *
 *   §2.1 禁止手工编辑自动生成的产物        → check:gen（重跑生成器逐文件比对）
 *   §2.3 禁止破坏组件目录结构（easycom）   → prepublish-check
 *   §2.4 禁止模板引用模块级常量/函数       → check:template
 *   §2.5 禁止跳过校验直接发布              → prepublishOnly 钩子
 *   第五节 颜色只能引用主题变量            → check:theme
 *
 * 剩下这些一条检查都没有，全部靠人记：
 *
 *   §2.2 禁止把 .npmrc 提交进仓库
 *   §2.6 禁止用 v-html 渲染内容（小程序端不支持）
 *   §4   Vue3 选项式 API（不得用 <script setup> —— 产物生成依赖显式 props）
 *   §4   v-model 一律 modelValue（不得用 Vue2 的 model:{prop,event}）
 *   §4   显式声明 emits（否则自定义事件与原生事件双触发）
 *   §4   首块 JSDoc 必须存在（产物里的描述、@property、@event 都由它生成）
 *   §4   组件内不得 import 其他 uni_modules 的组件（npm 安装后路径不稳定）
 *
 * 这些规则的共同点是：**违反了不会有任何报错**，只会在用户那里现形 ——
 * v-html 让组件在小程序端整块不渲染；Vue2 的 model 选项让 v-model 完全失效；
 * 缺 emits 让事件触发两次；.npmrc 进仓库等于把 npm token 明文公开。
 *
 * 判定范围与「先剥注释」这条硬规则
 * --------------------------------
 * 只扫 `uni_modules/**\/*.vue`（发布出去的组件本体；`pages/` 是只跑 H5 的演示页，
 * 不受小程序限制，不纳入）。
 *
 * **所有文本判定一律先剥注释（含 HTML 注释）**。这不是洁癖，是踩过的坑：
 *  - `vui-markdown` 的 JSDoc 里写着「不使用 v-html，全部通过结构化节点渲染」——
 *    直接 grep `v-html` 会把它报成违规，而它恰恰是守规矩的那个；
 *  - `vui-form` 有一个**名为 `model` 的 prop**（表单数据对象），
 *    直接匹配 `model:` 会把 prop 定义误判成 Vue2 的 `model` 选项。
 * 用正则读源码的检查，第一件事就是把注释和字符串剥掉再说。
 *
 * 历史遗留基线
 * ------------
 * 与 check-theme 一样是**只减不增**的棘轮：新增违规 → 失败；基线里的条目已修好却没删
 * → 也失败（防止白名单烂成永久豁免）。
 *
 * 用法：
 *   npm run check:rules
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const MODULES = path.join(root, 'uni_modules');

/**
 * 历史遗留基线：`组件名|规则id` → 处置说明。**只减不增**。
 * 修掉一处就把条目删掉（留着会报「条目已失效」）。
 */
const BASELINE = {};

/** 剥掉 `//` 行注释、`/* *\/` 块注释与 `<!-- -->` HTML 注释，并保护字符串字面量。 */
function stripComments(src) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (quote) {
      if (c === '\\') {
        out += c + (n === undefined ? '' : n);
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      out += c;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // HTML 注释（模板块里）
    if (c === '<' && src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** 取 `<script>` 块（保留注释，供 JSDoc 判定用）；取不到返回 null */
function scriptBlock(raw) {
  const m = /<script[^>]*>([\s\S]*?)<\/script>/.exec(raw);
  return m ? m[1] : null;
}

/**
 * 取根 `<template>` 块。不能简单用非贪婪匹配到第一个 `</template>`：
 * 组件里普遍有 `<template v-if>` 子块，那样会截断。根块固定在最外层，
 * 因此取「第一个 `<template`」到「`<script` 之前的最后一个 `</template>`」。
 */
function templateBlock(raw) {
  const start = raw.indexOf('<template');
  if (start === -1) return null;
  const scriptAt = raw.indexOf('<script');
  const region = scriptAt === -1 ? raw : raw.slice(0, scriptAt);
  const end = region.lastIndexOf('</template>');
  if (end === -1 || end <= start) return null;
  return raw.slice(start, end + '</template>'.length);
}

/** 行号：在原文里找第 n 次出现的位置 */
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

/** 规则定义：id → { name, scope, desc, fix, run(ctx) } */
const RULES = [
  {
    id: 'no-v-html',
    rule: '§2.6',
    name: '禁止用 v-html 渲染内容',
    why: '小程序端不支持 v-html，组件在那边会整块不渲染（不报错，只是空白）',
    fix: '改为结构化节点渲染（参考 vui-markdown：解析出节点树后用 v-for + 条件渲染）',
    run: ({ tpl }) => {
      if (!tpl) return [];
      const t = stripComments(tpl);
      const out = [];
      const re = /(^|\s)v-html\s*=/g;
      let m;
      while ((m = re.exec(t)) !== null) out.push({ idx: m.index, evidence: 'v-html' });
      return out.map((v) => ({ ...v, line: 1 }));
    },
  },
  {
    id: 'no-script-setup',
    rule: '§4',
    name: '必须用 Vue3 选项式 API（<script>），不得用 <script setup>',
    why: '产物生成脚本依赖显式的 props / emits 定义，script setup 会让生成的 d.ts 与 API.md 缺项',
    fix: '改回 <script> + export default { props, emits, methods }',
    run: ({ raw }) => {
      const re = /<script\b[^>]*\bsetup\b/g;
      const m = re.exec(raw);
      return m ? [{ idx: m.index, line: lineOf(raw, m.index), evidence: m[0] }] : [];
    },
  },
  {
    id: 'no-vue2-model',
    rule: '§4',
    name: 'v-model 必须用 modelValue / update:modelValue，不得用 Vue2 的 model: 选项',
    why: 'Vue 3 已移除 model 选项，写上它等于 v-model 完全失效（且没有任何报错）',
    fix: "props 用 modelValue，改动时 this.$emit('update:modelValue', v)",
    run: ({ script }) => {
      if (!script) return [];
      const s = stripComments(script);
      // 必须同时看到 prop 键，否则会把「名为 model 的 prop」误判成 Vue2 选项
      const re = /(^|\n)[ \t]*model[ \t]*:[ \t]*\{[^}]*\bprop[ \t]*:/g;
      const out = [];
      let m;
      while ((m = re.exec(s)) !== null) out.push({ idx: m.index, line: lineOf(s, m.index) });
      return out;
    },
  },
  {
    id: 'no-cross-import',
    rule: '§4',
    name: '组件内不得 import 其他 uni_modules 的组件',
    why: 'npm 安装后路径不稳定，用户侧会直接解析失败',
    fix: '需要复用就写进组件自身（或抽成组件内的小函数/子节点）',
    run: ({ script }) => {
      if (!script) return [];
      const s = stripComments(script);
      const re = /(^|\n)[ \t]*import\s[^;]*?from\s*['"]([^'"]+)['"]/g;
      const out = [];
      let m;
      while ((m = re.exec(s)) !== null) {
        const spec = m[2];
        if (spec.includes('uni_modules/') || /^\.\.\/vui-/.test(spec)) {
          out.push({ idx: m.index, line: lineOf(s, m.index), evidence: spec });
        }
      }
      return out;
    },
  },
  {
    id: 'declare-emits',
    rule: '§4',
    name: '使用了 $emit 就必须显式声明 emits',
    why: '不声明时自定义事件与同名原生事件会双触发（父级 handler 被调用两次）',
    fix: "在 export default 里加 emits: ['update:modelValue', 'change', ...]",
    run: ({ script }) => {
      if (!script) return [];
      const s = stripComments(script);
      if (!/this\s*\.\s*\$emit\s*\(/.test(s)) return [];
      if (/\bemits\s*:/.test(s)) return [];
      const m = /this\s*\.\s*\$emit\s*\(/.exec(s);
      return [{ idx: m.index, line: lineOf(s, m.index), evidence: 'this.$emit(...) 但整份 script 里没有 emits:' }];
    },
  },
  {
    id: 'jsdoc-first',
    rule: '§4',
    name: '<script> 里必须有首块 JSDoc（描述 / @property / @event 的来源）',
    why: '产物里的组件描述、props 说明、事件说明全部由它生成，缺了会静默生成空描述',
    fix: '在 export default 之前补 /** ... @description ... @property {Type} p 说明 */',
    run: ({ script, raw }) => {
      if (!script) return [];
      const at = script.indexOf('export default');
      if (at === -1) return [];
      if (script.slice(0, at).includes('/**')) return [];
      const abs = raw.indexOf('export default');
      return [{ idx: at, line: abs === -1 ? 1 : lineOf(raw, abs), evidence: 'export default 之前没有 /** 块' }];
    },
  },
];

/**
 * §2.2：`.npmrc` 含 npm token 明文，既不能入库、也不能落在 .gitignore 之外
 * （不在 .gitignore 里迟早会被 `git add -A` 带进去）。
 */
function checkNpmrc() {
  const problems = [];
  try {
    const tracked = execFileSync('git', ['ls-files', '--error-unmatch', '.npmrc'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString().trim();
    if (tracked) problems.push(`.npmrc 已被 git 跟踪（token 明文入库）：${tracked}`);
  } catch {
    /* 未被跟踪 —— 正常 */
  }
  try {
    execFileSync('git', ['check-ignore', '-q', '.npmrc'], { cwd: root, stdio: 'ignore' });
  } catch {
    problems.push('.npmrc 没有被 .gitignore 忽略 —— 一次 `git add -A` 就会把 npm token 提交上去');
  }
  return problems;
}

// ── 扫描 ────────────────────────────────────────────────────────────────

const components = fs
  .readdirSync(MODULES, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith('vui-'))
  .map((e) => e.name)
  .sort();

const found = [];
let scanned = 0;
/** 扫描面覆盖统计：某一类块取不到时，对应规则就变成「在空集上全绿」——必须显式报出来 */
const coverage = { noScript: [], noTemplate: [], emitUsers: 0, emitsDeclared: 0, jsdocOk: 0 };

for (const c of components) {
  const dir = path.join(MODULES, c, 'components', c);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.vue'))) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    scanned++;
    const script = scriptBlock(raw);
    const tpl = templateBlock(raw);
    if (!script) coverage.noScript.push(`${c}/${f}`);
    if (!tpl) coverage.noTemplate.push(`${c}/${f}`);
    if (script) {
      const s = stripComments(script);
      if (/this\s*\.\s*\$emit\s*\(/.test(s)) coverage.emitUsers++;
      if (/\bemits\s*:/.test(s)) coverage.emitsDeclared++;
      const at = script.indexOf('export default');
      if (at > -1 && script.slice(0, at).includes('/**')) coverage.jsdocOk++;
    }
    for (const r of RULES) {
      for (const v of r.run({ raw, script, tpl }) || []) {
        found.push({ comp: c, file: `${c}/${f}`, rule: r, ...v, key: `${c}|${r.id}` });
      }
    }
  }
}

const covered = [
  '§2.1 禁止手工编辑产物 → check:gen',
  '§2.3 禁止破坏组件目录结构 → prepublish-check',
  '§2.4 禁止模板引用模块级常量 → check:template',
  '§2.5 禁止跳过校验发布 → prepublishOnly',
  '§5 颜色只能走主题变量 → check:theme',
];

console.log('\n[vui-uniapp] 规则执行器校验（AGENTS.md 第二节红线 + 第四节写法约定）');
console.log(`  组件: ${components.length}   扫描组件文件: ${scanned}`);
console.log(`  由其它检查覆盖、本脚本不重复的规则: ${covered.join('   ')}`);
// 扫描面自证：这些数字为 0 就说明规则在空集上「全绿」，等于没查
console.log(
  `  扫描面: script 块 ${scanned - coverage.noScript.length}/${scanned}   ` +
    `template 块 ${scanned - coverage.noTemplate.length}/${scanned}   ` +
    `用到 $emit 的组件 ${coverage.emitUsers}（其中已声明 emits ${coverage.emitsDeclared}）   ` +
    `首块 JSDoc 齐备 ${coverage.jsdocOk}/${scanned}`
);

const npmrcProblems = checkNpmrc();

// 基线核对：条目必须仍然命中，否则说明已修好却没删条目（白名单会烂掉）
const hit = new Set();
const fresh = [];
for (const v of found) {
  if (Object.prototype.hasOwnProperty.call(BASELINE, v.key)) hit.add(v.key);
  else fresh.push(v);
}
const stale = Object.keys(BASELINE).filter((k) => !hit.has(k));

if (hit.size) {
  console.log(`\n  基线内（历史遗留，随下个版本一并修）: ${hit.size} 处`);
  for (const k of [...hit].sort()) console.log(`      - ${k}   ${BASELINE[k] || ''}`);
}

const byRule = new Map();
for (const v of fresh) {
  if (!byRule.has(v.rule.id)) byRule.set(v.rule.id, { rule: v.rule, items: [] });
  byRule.get(v.rule.id).items.push(v);
}

if (byRule.size) {
  console.log(`\n  x ${fresh.length} 处违规：`);
  for (const { rule, items } of byRule.values()) {
    // 规则 id 一并打出来：写 BASELINE 条目时要用它作键（`组件名|规则id`）
    console.log(`\n    ${rule.rule} ${rule.name}   [${rule.id}]   （${items.length} 处）`);
    console.log(`      为什么：${rule.why}`);
    for (const v of items) console.log(`      ${v.file}:${v.line}   ${v.evidence || ''}`);
    console.log(`      改法：${rule.fix}`);
  }
}

if (npmrcProblems.length) {
  console.log(`\n  x .npmrc 凭证保护（AGENTS.md 第二节第 2 条）：`);
  for (const p of npmrcProblems) console.log(`      ${p}`);
  console.log(`      改法：确认 \`.gitignore\` 含 \`.npmrc\`（token 只放本机，见 AGENTS.md 第七节）`);
}

if (stale.length) {
  console.log(`\n  x ${stale.length} 条基线条目已失效（对应违规已修复或已改写法）—— 白名单只减不增，请删除：`);
  for (const k of stale) console.log(`      - ${k}`);
  console.log('    删除位置：scripts/check-rules.js 的 BASELINE');
}

if (coverage.noScript.length || coverage.noTemplate.length) {
  console.log(`\n  x 有组件文件解析不出 script / template 块 —— 这几条规则在它身上等于没查：`);
  for (const f of coverage.noScript) console.log(`      ${f}: 取不到 <script> 块`);
  for (const f of coverage.noTemplate) console.log(`      ${f}: 取不到根 <template> 块`);
  console.log('      改法：确认文件结构正常（AGENTS.md 第三节），或同步修本脚本的块提取');
}

if (fresh.length || npmrcProblems.length || stale.length || coverage.noScript.length || coverage.noTemplate.length) {
  console.log('\n规则执行器校验未通过。\n');
  process.exit(1);
}

console.log('\n  规则执行器校验通过。\n');
