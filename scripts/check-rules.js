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
 *   §4   首块 JSDoc 必须存在，**且必须就是组件描述**（产物里的描述、@property、@event 都由它生成）
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
const { listComponents } = require('./lib/components');
const { firstJsDoc, scriptBlock, stripComments, templateBlock } = require('./lib/source');

const root = path.resolve(__dirname, '..');
const MODULES = path.join(root, 'uni_modules');

/**
 * 历史遗留基线：`组件名|规则id` → 处置说明。**只减不增**。
 * 修掉一处就把条目删掉（留着会报「条目已失效」）。
 */
const BASELINE = {};

/**
 * ⚠ `stripComments` / `scriptBlock` / `templateBlock` 三个解析函数已经搬到
 * `scripts/lib/source.js` —— 第 23 轮的 `check-api.js` 要用同一套，
 * 再抄一份就是「同一事实写两处」。改这里等于同时改两个检查。
 */

/** 行号：在原文里找第 n 次出现的位置 */
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

/**
 * 从 `<script>` 里取 `emits` 声明的**事件名集合**；整份 script 没写 `emits:` 时返回 null。
 *
 * 支持数组与对象两种写法（`emits: ['change']` / `emits: { change: null }`），数组跨行也认。
 *
 * 为什么不能用「有没有 `emits:` 这个键」当判据：那是**形状匹配**，而不是对账。
 * 实测过一处：组件写着 `emits: ['change']`，却 `this.$emit('columnchange')` ——
 * 形状匹配照样放行，而 AGENTS.md §四 明写「用了 `$emit` 必须声明 `emits`」。
 */
function declaredEmits(s) {
  const m = /\bemits\s*:\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/.exec(s);
  if (!m) return null;
  const body = m[1];
  const out = new Set();
  for (const x of body.matchAll(/['"]([^'"]+)['"]/g)) out.add(x[1]);
  // 对象写法的事件名是**键**（值可以是 null 或校验函数），键可以不加引号
  if (body.trim().startsWith('{')) {
    for (const x of body.matchAll(/(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*:/g)) out.add(x[1]);
  }
  return out;
}

/** 真正被 `$emit('x')` 触发过的事件名（script 与 template 都算）；值给出来源块 */
function firedEmits(s, t) {
  const out = new Map();
  const scan = (text, where) => {
    if (!text) return;
    for (const m of text.matchAll(/\$emit\(\s*['"]([^'"]+)['"]/g)) {
      if (!out.has(m[1])) out.set(m[1], where);
    }
  };
  scan(s, 'script');
  scan(t, 'template');
  return out;
}

/** 转义成正则字面量 */
const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 事件名在原文里的行号；找不到就给 1（不编造） */
function eventLine(raw, name) {
  const m = new RegExp("\\$emit\\(\\s*['\"]" + reEsc(name) + "['\"]").exec(raw);
  return m ? lineOf(raw, m.index) : 1;
}

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
    name: '使用了 $emit 就必须显式声明 emits —— **逐个事件名对账**，不是「有没有 emits: 这个键」',
    why: '不声明时自定义事件与同名原生事件会双触发（父级 handler 被调用两次）；而「写了 emits 但漏了某一个名字」同样是漏，形状匹配查不出来',
    fix: "把每个 $emit('x') 的 x 都写进 emits: ['update:modelValue', 'change', ...]",
    run: ({ script, tpl, raw }) => {
      if (!script) return [];
      const s = stripComments(script);
      const fired = firedEmits(s, tpl ? stripComments(tpl) : '');
      if (!fired.size) return [];
      const declared = declaredEmits(s);
      const out = [];
      for (const [name, where] of fired) {
        if (declared && declared.has(name)) continue;
        out.push({
          idx: 0,
          line: eventLine(raw, name),
          evidence: declared
            ? `$emit('${name}')（在 ${where} 里）没有出现在 emits 声明里`
            : `用了 $emit 却整份 script 里没有 emits:（第一个漏的是 '${name}'）`,
        });
      }
      return out;
    },
  },
  {
    id: 'emits-no-dead',
    rule: '§4',
    name: '声明过的 emits 必须真的会被触发 —— 反向对账（登记了却用不到 = 宿主的监听永远不响）',
    why: 'emits 是给宿主的契约：声明了却从不触发，等于承诺了一个不存在的事件。宿主写 @该事件 时不会报错，只是永远不执行；文档里的 @event 也成了假的',
    fix: '要么把该事件真的发出去（this.$emit(...)），要么把它从 emits 与 JSDoc 的 @event 里删掉',
    run: ({ script, tpl, raw }) => {
      if (!script) return [];
      const s = stripComments(script);
      const declared = declaredEmits(s);
      if (!declared || !declared.size) return [];
      const fired = firedEmits(s, tpl ? stripComments(tpl) : '');
      const out = [];
      for (const name of declared) {
        if (fired.has(name)) continue;
        const m = new RegExp("['\"]" + reEsc(name) + "['\"]").exec(raw);
        out.push({
          idx: 0,
          line: m ? lineOf(raw, m.index) : 1,
          evidence: `emits 声明了 '${name}'，但全组件没有一处 $emit('${name}')`,
        });
      }
      return out;
    },
  },
  {
    id: 'jsdoc-first',
    rule: '§4',
    name: '<script> 的首块 JSDoc 必须是组件描述（按 AGENTS.md 第四节：存在，且就是第一个 /** */ 块，含 @description）',
    why:
      '产物里的组件描述（README 与 API.md 那一列）、props 说明、事件说明全部由**首块** JSDoc 生成 —— ' +
      'gen-docs.py / gen-package.py 与 lib/source.js 的 firstJsDoc 都是取首块。' +
      '在组件描述之前给模块级常量或辅助函数写 /** */，首块就变成了那段辅助说明：' +
      '组件描述被挤到第二块，于是 README/API.md 的描述列印出辅助函数的第一行，' +
      '同时每个 prop 都报「JSDoc 里没有对应的 @property」（check:api 一起红）。' +
      '它不影响语法、不影响 props 解析，只在文档里现形。' +
      '⚠ 旧版这条只判「export default 之前有没有 /**」—— 辅助函数的注释同样满足，' +
      '所以真出事时它一次都没响过，是「不会响的检查」。',
    fix: '把排在组件描述**之前**的那块 `/** */` 改成 `/* */` 或 `//`（组件描述之后的 `/** */` 不受影响）；组件描述 JSDoc 留作 <script> 里第一个 `/** */`',
    run: ({ script, raw }) => {
      if (!script) return [];
      /* 定位 <script> 块在原文里的起点，好把「块内偏移」换算成真实的文件行号 */
      const sm = /<script[^>]*>/.exec(raw);
      const base = sm ? sm.index + sm[0].length : 0;
      const jsdocAt = script.indexOf('/**');
      if (jsdocAt === -1) {
        const at = script.indexOf('export default');
        return [
          {
            idx: at === -1 ? 0 : at,
            line: lineOf(raw, base + (at === -1 ? 0 : at)),
            evidence: '<script> 里一块 /** */ 都没有 —— 描述 / @property / @event 无处可生成',
          },
        ];
      }
      const body = firstJsDoc(script);
      if (/@description/.test(body)) return [];
      const head = (body.split('\n').find((l) => l.trim().replace(/^\*+/, '').trim()) || '')
        .trim()
        .replace(/^\*+\s*/, '');
      return [
        {
          idx: jsdocAt,
          line: lineOf(raw, base + jsdocAt),
          evidence:
            `首块 JSDoc 不是组件描述（没有 @description），首行是「${head.slice(0, 60)}」—— ` +
            '它会被当成组件描述写进 README/API.md，真正的描述被挤到第二块、props 对账随之全失配',
        },
      ];
    },
  },
  {
    id: 'jsdoc-desc-is-first',
    rule: '§4',
    name: '反向对账：组件描述 JSDoc 必须在**第一个** /** */ 块，前面不许再插别的 JSDoc 块',
    why:
      '这是上一条的另一面：上一条问「首块是不是描述」，这一条问「描述是不是首块」—— ' +
      '两者看似等价，但把断言只写成其中一面时，另一面就成了盲区（描述存在、也含 @description，' +
      '却排在第二个 /** */ 块，上一条照样判绿）。既然判据来自源码版式，就两面都钉住：' +
      '取「含 @description 的那一块」的位置，它必须与 `/**` 的首次出现位置相同。',
    fix: '把排在组件描述之前的 /** */ 块改成 /* */ 或 //（辅助函数、模块级常量都算）',
    run: ({ script }) => {
      if (!script) return [];
      const all = [...script.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
      if (!all.length) return [];
      const descIdx = all.findIndex((m) => /@description/.test(m[1]));
      if (descIdx <= 0) return []; // 没有描述块由 check:api 与上一条负责；0 就是首块
      const first = all[0][1];
      const head = (first.split('\n').find((l) => l.trim().replace(/^\*+/, '').trim()) || '')
        .trim()
        .replace(/^\*\s*/, '');
      return [
        {
          idx: all[0].index,
          line: 1,
          evidence:
            `组件描述是第 ${descIdx + 1} 个 /** */ 块，它前面还有 ${descIdx} 块 JSDoc；` +
            `第 1 块的首行是「${head.slice(0, 60)}」—— 产物取的是首块，描述会因此错位`,
        },
      ];
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

/* 组件枚举走 scripts/lib/components.js —— 本文件此前自己 readdirSync 拼了一份（第 23 轮收敛）。
   那边的约定是**枚举永不静默丢弃**：目录在、同名 .vue 不在，返回一条 `hasVue: false` 的条目，
   由调用方报错，而不是把它从集合里移走、让分母变小。这里就按这个约定办。 */
const entries = listComponents();
const components = [...new Set(entries.map((e) => e.id))].sort();
/** 结构坏掉的条目（缺 components/ 或缺同名 .vue）—— 不能让它们静默退出扫描面 */
const structProblems = entries
  .filter((e) => !e.hasVue)
  .map((e) => `${e.id}: 取不到 components/${e.comp || e.id}/${e.comp || e.id}.vue（${e.problem}）`);

const found = [];
let scanned = 0;
/** 扫描面覆盖统计：某一类块取不到时，对应规则就变成「在空集上全绿」——必须显式报出来 */
const coverage = {
  noScript: [],
  noTemplate: [],
  emitUsers: 0,
  emitsDeclared: 0,
  jsdocOk: 0,
  /* 事件名级对账的**扫描面自证**：这两个数为 0 就说明「事件名对账」在空集上全绿 */
  emitNamesDeclared: 0,
  emitNamesFired: 0,
};

for (const e of entries) {
  if (!e.hasVue) continue;
  const cid = e.id;
  for (const f of [path.basename(e.vue)]) {
    const raw = fs.readFileSync(e.vue, 'utf8');
    scanned++;
    const script = scriptBlock(raw);
    const tpl = templateBlock(raw);
    if (!script) coverage.noScript.push(`${cid}/${f}`);
    if (!tpl) coverage.noTemplate.push(`${cid}/${f}`);
    if (script) {
      const s = stripComments(script);
      const decl = declaredEmits(s);
      const fired = firedEmits(s, tpl ? stripComments(tpl) : '');
      if (fired.size) coverage.emitUsers++;
      if (decl) coverage.emitsDeclared++;
      coverage.emitNamesFired += fired.size;
      coverage.emitNamesDeclared += decl ? decl.size : 0;
      /* 判据与 jsdoc-first 规则同源（都走 firstJsDoc）：改这里等于同时改那条规则。
         旧版算的是「export default 之前有没有 /**」—— 与规则同样的弱判据，所以两者一起瞎。 */
      if (/@description/.test(firstJsDoc(script))) coverage.jsdocOk++;
    }
    for (const r of RULES) {
      for (const v of r.run({ raw, script, tpl }) || []) {
        found.push({ comp: cid, file: `${cid}/${f}`, rule: r, ...v, key: `${cid}|${r.id}` });
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
    `首块 JSDoc 是组件描述 ${coverage.jsdocOk}/${scanned}`
);
console.log(
  `  事件名对账: 声明 ${coverage.emitNamesDeclared} 个 / 实际触发 ${coverage.emitNamesFired} 个` +
    `（任一为 0 就说明这条对账在空集上全绿）`
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

/* 结构坏掉的组件：枚举按「永不静默丢弃」交出来了，这里必须显式失败 ——
   否则它们会连扫描面一起退出，规则在缩小的集合上照样判绿。 */
if (structProblems.length) {
  console.log(`\n  x 有组件目录结构坏了（枚举没有静默丢弃它们）：`);
  for (const p of structProblems) console.log(`      ${p}`);
  console.log('      改法：目录必须严格一致（AGENTS.md 第三节），细项见 check:components');
}

/* 事件名对账的扫描面：解析不出任何事件名时，双向对账都是恒真 —— 必须当作失败 */
const emitsScanDead = coverage.emitNamesDeclared === 0 || coverage.emitNamesFired === 0;
if (emitsScanDead) {
  console.log(
    `\n  x 事件名对账的扫描面为空（声明 ${coverage.emitNamesDeclared} / 触发 ${coverage.emitNamesFired}）：` +
      `\n      解析不出事件名时，declare-emits 与 emits-no-dead 两条规则都会在空集上判绿。` +
      `\n      改法：先修本脚本的 declaredEmits / firedEmits 解析，别去改组件。`
  );
}

if (
  fresh.length ||
  npmrcProblems.length ||
  stale.length ||
  coverage.noScript.length ||
  coverage.noTemplate.length ||
  structProblems.length ||
  emitsScanDead
) {
  console.log('\n规则执行器校验未通过。\n');
  process.exit(1);
}

console.log('\n  规则执行器校验通过。\n');
