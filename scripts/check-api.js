#!/usr/bin/env node
/**
 * check-api.js —— props / 插槽 两面契约的对账（第 23 轮新增）
 *
 * 这一轮要回答的问题
 * ------------------
 * 仓库里有两句话是在**声称覆盖面**的：
 *
 *   · `gen-docs.py` 开头：「API 内容直接取自各组件实际的 props 定义，**保证与代码同步**」
 *   · `types/index.d.ts` 开头：「由各组件实际的 props 定义自动生成，**与源码保持同步**」
 *
 * 问一句「谁在扛这句话」—— 在这之前，答案是**没有人**。`check-gen` 只是把生成器
 * 重跑一遍、逐字节比对：两边跑的是**同一份有 bug 的解析器**，产物再错也自洽。
 *
 * 三个当场被抓到的实例
 * --------------------
 * ① **生成器静默丢 prop**：`parse_props` 按顶层逗号切段，于是「prop 上面单独一行写
 *    `// 说明`」会让那行注释跟着下一个 prop 进同一段，旧代码 `if seg.startswith('//'):
 *    continue` 把**整个 prop 一起丢掉**。实测 `vui-tag` 的 `text` 就这么从
 *    `types/index.d.ts` 与 `docs/API.md` 里消失了：TS 用户写 `<vui-tag text="x">`
 *    没有类型提示、文档里查不到这个属性，而 13 条检查一路全绿。
 * ② **插槽契约整个缺失**：20 个组件模板里有 28 个 `<slot>`，JSDoc 里 `@slot` **一个都没有**；
 *    `gen-docs.py` 从第 1 天起就支持 `@slot`、也支持渲染「插槽」小节，于是
 *    `docs/API.md` 里 0 个插槽小节 —— 而 README 明写「完整 API（属性 / 事件 / 插槽）
 *    见 docs/API.md」。用户没法从文档知道哪个组件能插、插进去叫什么名字。
 * ③ **带修饰的事件名被切成两半**：`@event` 的名字字符类不含 `:`，于是
 *    `update:modelValue` / `update:value` 被读成 名字 `update` + 说明 `:modelValue …`。
 *    9 个组件受了影响：`docs/API.md` 与 `types/index.d.ts` 都印着事件名 `update`，
 *    宿主按 `@update:modelValue` 写处理器时文档里查不到、类型也对不上。
 *    而 `gen-package.py` 里那句「名字不是合法标识符就加引号」的兜底**一次都没被走到** ——
 *    它是为这种名字准备的，却因为上游解析拿不到它们而永远沉默。
 *
 * 判据（四组，A–C 两向）
 * ----------------------
 *   A `props-no-dead`    声明的 prop，全库剥注释的代码里必须有人读 —— 否则文档/类型/
 *                        API.md 都承诺了它，用户设了没反应（实测 `vui-chat-input.stopText`）
 *   B `property-missing` prop 必须有 `@property`（否则产物里那条说明是空的）
 *     `property-ghost`   `@property` 写的名字必须真有对应 prop（否则是文档承诺了不存在的属性）
 *   C `slot-missing-doc` 模板里每个 `<slot>` 必须有 `@slot` 登记
 *     `slot-ghost-doc`   `@slot` 登记的名字必须在模板里真的出现
 *     `dynamic-slot-*`   `<slot :name="expr">` 静态对账抓不到 —— 必须写进 DYNAMIC_SLOTS
 *                        登记表（不许静默漏掉），登记表条目反过来也必须仍然命中
 *   D `artifact-*`       **产物 ↔ 源码**：`types/index.d.ts` 的 `<Pascal>Props` 字段集合、
 *                        `docs/API.md` 的属性表行集合与插槽表行集合，必须与源码**逐位相等**。
 *                        这一组是真正拦住「生成器丢 prop」的那一道 —— 它不重跑生成器，
 *                        而是直接拿源码当基准问产物。事件表是**单向 + 指纹**（见 D-3 注释）。
 *
 * A 组的诚实说明
 * --------------
 * A 用的是**必要条件的近似**：名字在整库代码里一次都不出现 = 一定没人读（真死）；
 * 出现 = 可能只是同名巧合（比如 `vui-form.labelWidth` 其实是被 `vui-form-item` 通过
 * `inject('vuiForm')` 读的，而它恰好在 vui-input 里也出现过）。要做更强的判据得上
 * 数据流分析，超出本脚本的范围。**近似方向是「偏保守」**：它只报真死的，宁可漏报
 * 也不误报 —— 一个会误报的检查最后一定会被加白名单加到失效。
 *
 * 扫描面自证
 * ----------
 * 四组判据全是「集合相等」类断言，**空集上恒真**。所以下面每一组的计数都会打出来，
 * 任一为 0 直接判失败 —— 「不会响的检查」比「没有检查」更坏。
 * 另外 `selfTest()` 每次运行都无条件跑一遍：拿几段**当场构造的**输入分别验
 * `propsOf` / `slotDocs` / `templateSlots` / `stripComments`，守卫自己坏掉不会静默通过。
 *
 * 用法：
 *   npm run check:api
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { listComponents } = require('./lib/components');
const {
  eventNames,
  firstJsDoc,
  markdownTables,
  propertyNames,
  propsOf,
  scriptBlock,
  slotDocs,
  stripComments,
  templateBlock,
  templateSlots,
  withoutPropsBlock,
} = require('./lib/source');

const root = path.resolve(__dirname, '..');
const API_MD = path.join(root, 'docs', 'API.md');
const DTS = path.join(root, 'types', 'index.d.ts');

console.log('\n[vui-uniapp] props / 事件 / 插槽契约对账（API.md · types · 源码三面）');

/**
 * 模板里 name 不是字符串字面量的插槽（`<slot :name="column.key">`）—— 静态对账抓不到名字，
 * 必须在这里登记，否则「插槽名对不上」会**静默漏过这一处**。
 *
 * 每条 = `{ expr, doc, why }`：
 *   · `expr` 模板里写的那段表达式（对账「模板 ↔ 登记表」用）；
 *   · `doc`  该插槽在文档里的名字（对账「@slot ↔ 登记表」用）。两者可以不同 ——
 *            `:name="column.key"` 是**每个 key 都是插槽名**，文档里约定写成 `column.key`；
 *   · 条目反过来也必须仍然命中（登记表不许烂成永久豁免）。
 */
const DYNAMIC_SLOTS = {
  'vui-table': [
    {
      expr: 'column.key',
      doc: 'column.key',
      why: '插槽名由每列的 column.key 决定，运行期才知道',
    },
  ],
};

/** 扫描面下限：低于它说明解析塌了，集合相等的断言会在缩小的集合上判绿 */
const FLOORS = { components: 40, props: 200, propertyDocs: 200, eventDocs: 70, slots: 20, slotDocs: 20 };

const groups = new Map();
function addRule(id, name, why, fix) {
  if (!groups.has(id)) groups.set(id, { id, name, why, fix, items: [] });
  return groups.get(id);
}

/** 记录一条不一致；`where` 形如 `vui-card` 或 `vui-card:12` */
function fail(id, where, evidence) {
  groups.get(id).items.push({ where, evidence });
}

const RULES = {
  'props-no-dead': addRule(
    'props-no-dead',
    '声明的 prop 必须有人读 —— 否则「设了没反应」',
    'props 是给宿主的契约：文档、类型声明、API.md 都按它生成。声明了却全库没人读，' +
      '等于承诺了一个不存在的属性 —— 宿主写了不报错，只是什么都不发生',
    '要么让组件真的用上它（模板 / script 里读 this.xxx），要么从 props 与 JSDoc 的 @property 里删掉'
  ),
  'property-missing': addRule(
    'property-missing',
    '每个 prop 都必须有 @property 文档',
    '产物里的属性说明、类型注释全部由 JSDoc 生成。缺了不会报错，只会在 API.md 里留一格空白，' +
      '用户看不出这个属性是干什么的',
    '在首块 JSDoc 里补 `@property {类型} 属性名 说明`'
  ),
  'property-ghost': addRule(
    'property-ghost',
    '@property 文档必须真有对应的 prop',
    '这是反向的漏：文档承诺了一个不存在的属性，用户在 API.md 里查到、写上去，没有任何效果',
    '要么补上这个 prop，要么把这行 @property 删掉（真是插槽内容就写成 @slot）'
  ),
  'slot-missing-doc': addRule(
    'slot-missing-doc',
    '模板里每个插槽都必须有 @slot 登记',
    'gen-docs.py 支持的「插槽」小节完全由 @slot 生成。不登记则不渲染 —— ' +
      '用户无从知道这个组件能插、插进去叫什么名字，而 README 明写「完整 API（属性 / 事件 / 插槽）」',
    '在首块 JSDoc 里补 `@slot 名称 说明`（默认插槽写 `@slot default 说明`；' +
      '有作用域参数就写 `@slot 名称 {参数} 说明`）'
  ),
  'slot-ghost-doc': addRule(
    'slot-ghost-doc',
    '@slot 登记的名字必须在模板里真的有',
    '反向的漏：宿主按文档写 `<template #x>`，组件里没有任何 <slot name="x">，那段内容**静默消失**',
    '要么在模板里补上这个具名插槽，要么把这条 @slot 删掉'
  ),
  'dynamic-slot-unregistered': addRule(
    'dynamic-slot-unregistered',
    '模板里的动态插槽名必须写进 DYNAMIC_SLOTS 登记表',
    '`<slot :name="expr">` 的名字是运行期算出来的，静态对账抓不到 —— ' +
      '不登记就等于这个插槽**静默退出**了整张对账表',
    '在 scripts/check-api.js 的 DYNAMIC_SLOTS 里登记：组件 id → 该插槽在文档里的名字'
  ),
  'dynamic-slot-stale': addRule(
    'dynamic-slot-stale',
    'DYNAMIC_SLOTS 里的条目必须仍然命中',
    '登记表一旦烂成永久豁免，新增的动态插槽会继续静默漏过 —— 登记表只减不增',
    '删掉这条登记（模板里已经没有动态 name 的插槽了）'
  ),
  'artifact-props': addRule(
    'artifact-props',
    '产物里的属性必须与源码 props 逐位相等（types/index.d.ts 与 docs/API.md 都对）',
    '「与源码保持同步」这句话此前没有任何东西在扛：check-gen 只是把生成器重跑一遍，' +
      '两边跑的是同一份解析器，产物再错也自洽。vui-tag 的 text 就是这么丢的',
    '先修生成器（scripts/gen-package.py / gen-docs.py 的 parse_props），再跑 npm run gen'
  ),
  'artifact-slots': addRule(
    'artifact-slots',
    'docs/API.md 的插槽表必须与源码 @slot 逐位相等（名称与作用域参数都要对）',
    '同上：插槽表由 gen-docs.py 生成，生成器的解析与这里的解析必须一致，' +
      '否则文档会安静地错下去',
    '修 scripts/gen-docs.py 的 SLOT_RE / 渲染，再跑 npm run gen'
  ),
  'artifact-events': addRule(
    'artifact-events',
    'docs/API.md 的事件表必须与源码 @event 逐位相等（名字不许被从冒号处切断）',
    '@event 的名字字符类一度不含 `:`，于是 `@event {Function} update:modelValue 值变化时触发`' +
      '被切成 名字 `update` + 说明 `:modelValue 值变化时触发`：API.md 与 types/index.d.ts ' +
      '里那个事件就叫 `update`，宿主按 `@update:modelValue` 写处理器时文档里查不到、' +
      '类型也对不上。而 check:gen 只是把生成器重跑一遍（产物再错也自洽）、' +
      '事件名此前又不在对账范围内，所以它一路全绿地错到了 9 个组件',
    '修 scripts/gen-docs.py / gen-package.py 的 @event 正则（名字里要允许 `:`），再跑 npm run gen'
  ),
  'artifact-missing': addRule(
    'artifact-missing',
    '每个组件都必须能在 types 与 docs/API.md 里找到自己的段',
    '段找不到时，「产物 ↔ 源码对账」会**跳过这个组件**、在缩小的集合上判绿',
    '跑 npm run gen；仍缺就检查 scripts/gen-docs.py 的 CATEGORY 白名单'
  ),
  'scan-dead': addRule(
    'scan-dead',
    '扫描面不许为空',
    '本脚本四组判据都是「集合相等」类断言 —— 解析不出来时全都在空集上恒真，等于没查',
    '先修 scripts/lib/source.js 的解析，别去改组件'
  ),
};

// ── 自证：拿当场构造的输入验解析器自己 ─────────────────────────────────────
//
// 这一段是必要的，因为下面所有判据都建立在「解析器读得出东西」之上。
// 守卫坏掉时，最坏的结果不是报错，而是**安静地全绿**。
function selfTest() {
  const cases = [];
  const check = (name, got, want) => {
    const g = JSON.stringify(got);
    const w = JSON.stringify(want);
    cases.push({ name, ok: g === w, got: g, want: w });
  };

  // ① prop 上面单独一行注释 —— 这正是 vui-tag.text 丢掉的那个形状
  check(
    'propsOf · 带行首注释的 prop 不能丢',
    propsOf('export default {\n\tprops: {\n\t\ttype: {\n\t\t\t// 类型\n\t\t\ttype: String\n\t\t},\n\t\t// 标签内容\n\t\ttext: {\n\t\t\ttype: String\n\t\t}\n\t}\n}'),
    ['type', 'text']
  );
  // ② 注释不能吃掉它后面的 prop（段首空行的形状）
  check(
    'propsOf · 段首空行 + 注释',
    propsOf('props: {\n\t\ta: {\n\t\t\ttype: String\n\t\t},\n\n\t\t// 说明\n\t\tb: { type: String }\n\t}'),
    ['a', 'b']
  );
  // ③ props 块外面的同名字符串不许带进来
  check('propsOf · 没有 props 块就是空', propsOf('export default { data() { return { text: 1 }; } }'), []);
  // ④ @slot 三态：默认名 / 显式名 / 带作用域 / 点号名
  check('slotDocs · @slot default {item} 说明', [...slotDocs('@slot default {item} 每一项')], [['default', 'item']]);
  check('slotDocs · @slot 无名称记作 default', [...slotDocs('@slot 默认内容')], [['default', '']]);
  check(
    'slotDocs · @slot column.key {row, index} 说明',
    [...slotDocs('@slot column.key {row, index} 自定义单元格')],
    [['column.key', 'row, index']]
  );
  // ⑤ 模板插槽三态
  check('templateSlots · 字面量 / 动态 / 无 name', (() => {
    const r = templateSlots('<slot name="a"></slot><slot :name="k"></slot><slot></slot>');
    return [r.literal.get('a'), r.literal.get('default'), r.dynamic];
  })(), [1, 1, ['k']]);
  // ⑥ 剥注释不能把字符串里的内容也剥掉
  check(
    'stripComments · 只剥注释，不动字符串',
    stripComments("const a = 'http://x//y'; // 注释\nconst b = 1;").includes('http://x//y'),
    true
  );
  // ⑦ 表格解析：单元格去反引号、跳过对齐行
  check('markdownTables · 表头与数据行', (() => {
    const t = markdownTables('| 属性 | 类型 |\n| --- | --- |\n| `a` | `string` |\n')[0];
    return [t.header, t.rows];
  })(), [['属性', '类型'], [['a', 'string']]]);
  // ⑧ @event 名里的 `:` —— `update:modelValue` 是一整个名字，不是「update + 说明」。
  //    这条自证就是为「字符类漏了 `:`」那个缺陷钉的：把 `:` 从字符类里去掉，它立刻红。
  check(
    'eventNames · update:modelValue 是一个完整事件名',
    eventNames('@event {Function} update:modelValue 值变化时触发（v-model）'),
    ['update:modelValue']
  );
  check(
    'eventNames · 普通事件名与带修饰事件名混排（顺序即文档顺序）',
    eventNames('@event {Function} change 改变时触发\n@event {Function} update:value 选中项变化'),
    ['change', 'update:value']
  );

  let bad = 0;
  console.log('\n  解析器自证（每次运行都跑，构造输入当场验）');
  for (const c of cases) {
    if (c.ok) console.log(`    ok  ${c.name}`);
    else {
      bad += 1;
      console.log(`    x   ${c.name}\n        期望 ${c.want}\n        实际 ${c.got}`);
    }
  }
  return bad === 0;
}

// ── 收集事实 ──────────────────────────────────────────────────────────────

const entries = listComponents();
const comps = entries.filter((e) => e.hasVue);
/** 全库代码：剥注释 + 去掉所有 props 声明块 —— A 组的判据面 */
let LIB = '';

const facts = [];
for (const e of entries) {
  if (!e.hasVue) continue;
  const raw = fs.readFileSync(e.vue, 'utf8');
  const script = scriptBlock(raw) || '';
  const tpl = templateBlock(raw);
  const doc = firstJsDoc(script);

  const props = propsOf(script);
  const jprops = propertyNames(doc);
  const jevents = eventNames(doc);
  const jslots = slotDocs(doc);
  const { literal, dynamic } = templateSlots(tpl);

  /** 模板里实际存在的插槽名集合（动态的那些按登记表折算成文档里的名字） */
  const tplSlots = new Set(literal.keys());
  const registered = DYNAMIC_SLOTS[e.id] || [];

  for (const expr of dynamic) {
    const hit = registered.find((r) => r.expr === expr);
    if (!hit) {
      fail(
        'dynamic-slot-unregistered',
        `${e.id}:${lineOf(raw, `<slot :name="${expr}"`)}`,
        `模板里有 <slot :name="${expr}">，但 DYNAMIC_SLOTS 里没有登记它 —— 这一处会静默退出对账`
      );
    } else {
      tplSlots.add(hit.doc);
    }
  }
  for (const r of registered) {
    if (!dynamic.includes(r.expr)) {
      fail(
        'dynamic-slot-stale',
        e.id,
        `DYNAMIC_SLOTS 登记了 "${r.expr}"，但模板里已经找不到 <slot :name="${r.expr}">`
      );
    }
  }

  facts.push({ id: e.id, raw, props, jprops, jevents, jslots, tplSlots, literal, dynamic });
  LIB += '\n' + stripComments(withoutPropsBlock(raw));
}

/** 组件 id 在原文里的行号（找不到给 1，不编造） */
function lineOf(raw, needle) {
  const at = raw.indexOf(needle);
  return at === -1 ? 1 : raw.slice(0, at).split('\n').length;
}

/** 某 prop 的声明行：`xxx: {` 或 `xxx:` 在 props 块里的位置 */
const propLine = (raw, name) => {
  const m = new RegExp('(^|[\\s,{])' + name.replace(/[$]/g, '\\$&') + '\\s*:').exec(raw);
  return m ? lineOf(raw, m[0].trimStart().length ? m[0] : m[0]) : 1;
};

// ── A. prop 必须有人读 ────────────────────────────────────────────────────

let deadChecked = 0;
for (const f of facts) {
  for (const p of f.props) {
    deadChecked += 1;
    const re = new RegExp('\\b' + p.replace(/[$]/g, '\\$&') + '\\b');
    if (!re.test(LIB)) {
      fail(
        'props-no-dead',
        `${f.id}:${propLine(f.raw, p)}`,
        `props 声明了 "${p}"，但全库（剥注释、去掉 props 块之后）没有一处读它`
      );
    }
  }
}

// ── B. props ↔ @property 双向 ────────────────────────────────────────────

for (const f of facts) {
  const jp = new Set(f.jprops);
  const pn = new Set(f.props);
  for (const p of f.props) {
    if (!jp.has(p)) {
      fail(
        'property-missing',
        `${f.id}:${propLine(f.raw, p)}`,
        `props 里有 "${p}"，JSDoc 里没有对应的 @property —— API.md 与类型注释里这条说明是空的`
      );
    }
  }
  for (const d of f.jprops) {
    if (!pn.has(d)) {
      fail('property-ghost', `${f.id}:${lineOf(f.raw, `@property {String} ${d}`)}`, `@property 写了 "${d}"，但 props 里没有这个属性`);
    }
  }
}

// ── C. 模板 <slot> ↔ @slot 双向 ──────────────────────────────────────────

for (const f of facts) {
  for (const s of f.tplSlots) {
    if (!f.jslots.has(s)) {
      fail(
        'slot-missing-doc',
        `${f.id}:${lineOf(f.raw, s === 'default' ? '<slot>' : `<slot name="${s}"`)}`,
        `模板里有插槽 "${s}"，JSDoc 里没有 @slot 登记 —— API.md 不会渲染它，用户查不到怎么写`
      );
    }
  }
  for (const s of f.jslots.keys()) {
    if (!f.tplSlots.has(s)) {
      fail(
        'slot-ghost-doc',
        `${f.id}:${lineOf(f.raw, `@slot ${s}`)}`,
        `@slot 登记了 "${s}"，但模板里没有对得上的 <slot> —— 宿主写了它内容会静默消失`
      );
    }
  }
}

// ── D. 产物 ↔ 源码 ───────────────────────────────────────────────────────

const dts = fs.existsSync(DTS) ? fs.readFileSync(DTS, 'utf8') : '';
const api = fs.existsSync(API_MD) ? fs.readFileSync(API_MD, 'utf8') : '';
if (!dts) fail('artifact-missing', 'types/index.d.ts', '文件不存在 —— 先跑 npm run gen');
if (!api) fail('artifact-missing', 'docs/API.md', '文件不存在 —— 先跑 npm run gen');

/** 把 API.md 按 `### <组件 id>` 切段；返回 Map(id → 段文本) */
function apiSections(text) {
  const out = new Map();
  const lines = text.split('\n');
  let cur = null;
  for (const line of lines) {
    const m = /^### (vui-[a-z0-9-]+)\s*$/.exec(line);
    if (m) {
      cur = m[1];
      out.set(cur, '');
      continue;
    }
    if (/^## /.test(line)) cur = null;
    if (cur) out.set(cur, out.get(cur) + line + '\n');
  }
  return out;
}

const sections = apiSections(api);
const pascalOf = (id) => id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');

/** d.ts 里某个 `<Pascal>Props` 接口的字段名（顺序即生成顺序） */
function dtsPropNames(pascal) {
  const m = new RegExp('export interface ' + pascal + 'Props \\{([\\s\\S]*?)\\n\\}').exec(dts);
  if (!m) return null;
  const out = [];
  for (const x of m[1].matchAll(/^\t([A-Za-z_$][\w$]*)\??:/gm)) out.push(x[1]);
  return out;
}

/**
 * d.ts 里某个 `<Pascal>Emits` 接口的事件名（顺序即生成顺序）；没有这个接口返回 null。
 *
 * 带 `:` 的名字在 d.ts 里是**带引号**的（`'update:modelValue': (...args) => void;`）——
 * gen-package.py 里那句「不是合法标识符就加引号」的判断就是为它写的，
 * 解析这一头必须跟着认，否则断言会在带引号的名字上假红。
 */
function dtsEventNames(pascal) {
  const m = new RegExp('export interface ' + pascal + 'Emits \\{([\\s\\S]*?)\\n\\}').exec(dts);
  if (!m) return null;
  const out = [];
  for (const x of m[1].matchAll(/^\t(?:'([^']+)'|([A-Za-z_$][\w$]*))\??:/gm)) out.push(x[1] || x[2]);
  return out;
}

let artifactPropsChecked = 0;
let artifactApiPropsChecked = 0;
let artifactSlotsChecked = 0;
let artifactEventsChecked = 0;
let artifactDtsEventsChecked = 0;

for (const f of facts) {
  const pascal = pascalOf(f.id);

  // D-1 types/index.d.ts
  const fromDts = dtsPropNames(pascal);
  if (fromDts === null) {
    fail('artifact-missing', f.id, `types/index.d.ts 里找不到 export interface ${pascal}Props`);
  } else {
    artifactPropsChecked += fromDts.length;
    if (fromDts.join(',') !== f.props.join(',')) {
      fail(
        'artifact-props',
        `types/index.d.ts · ${pascal}Props`,
        `与源码 props 不一致：产物 [${fromDts.join(', ')}] / 源码 [${f.props.join(', ')}]` +
          renderDelta(fromDts, f.props)
      );
    }
  }

  // D-1b types/index.d.ts 的 `<Pascal>Emits` —— 事件名在被切断这件事上，d.ts 与 API.md
  // 是**两条独立的路径**（gen-package.py / gen-docs.py 各一份解析器），只查一边的话，
  // 单独改坏 gen-package.py 就会漏过去。
  const evFromDts = dtsEventNames(pascal);
  if (evFromDts === null) {
    if (f.jevents.length) {
      fail(
        'artifact-missing',
        f.id,
        `源码登记了 ${f.jevents.length} 个 @event，但 types/index.d.ts 里没有 ${pascal}Emits 接口`
      );
    }
  } else {
    artifactDtsEventsChecked += evFromDts.length;
    const lostInDts = f.jevents.filter((n) => !evFromDts.includes(n));
    if (lostInDts.length) {
      fail(
        'artifact-events',
        `types/index.d.ts · ${pascal}Emits`,
        `@event 写了 [${lostInDts.join(', ')}]，产物接口里找不到` +
          `（接口里是 [${evFromDts.join(', ')}]）—— 生成器把事件名切断了？`
      );
    }
  }

  // D-2 docs/API.md
  const body = sections.get(f.id);
  if (body === undefined) {
    fail('artifact-missing', f.id, 'docs/API.md 里找不到 `### ' + f.id + '` 段（CATEGORY 白名单漏了它？）');
    continue;
  }
  const tables = markdownTables(body);
  const propTable = tables.find((t) => t.header[0] === '属性');
  const slotTable = tables.find((t) => t.header[0] === '插槽名');

  if (!propTable) {
    fail('artifact-missing', f.id, 'docs/API.md 的该段里没有属性表');
  } else {
    artifactApiPropsChecked += propTable.rows.length;
    const names = propTable.rows.map((r) => r[0]);
    if (names.join(',') !== f.props.join(',')) {
      fail(
        'artifact-props',
        `docs/API.md · ${f.id} 属性表`,
        `与源码 props 不一致：产物 [${names.join(', ')}] / 源码 [${f.props.join(', ')}]` +
          renderDelta(names, f.props)
      );
    }
  }

  const wantSlots = [...f.jslots.keys()];
  if (!slotTable) {
    if (wantSlots.length) {
      fail('artifact-missing', f.id, `源码登记了 ${wantSlots.length} 个 @slot，但 docs/API.md 里没有插槽表`);
    }
  } else {
    artifactSlotsChecked += slotTable.rows.length;
    const names = slotTable.rows.map((r) => r[0]);
    if (names.join(',') !== wantSlots.join(',')) {
      fail(
        'artifact-slots',
        `docs/API.md · ${f.id} 插槽表`,
        `插槽名与 @slot 不一致：产物 [${names.join(', ')}] / @slot [${wantSlots.join(', ')}]` +
          renderDelta(names, wantSlots)
      );
    }
    // 作用域参数也逐位比对 —— 它同样是结构化事实，不是散文
    const gotScope = slotTable.rows.map((r) => (r[1] === '—' ? '' : r[1]));
    const wantScope = wantSlots.map((s) => f.jslots.get(s));
    if (gotScope.join('|') !== wantScope.join('|')) {
      fail(
        'artifact-slots',
        `docs/API.md · ${f.id} 插槽作用域`,
        `作用域参数不一致：产物 [${gotScope.join(' | ')}] / @slot [${wantScope.join(' | ')}]`
      );
    }
  }

  // D-3 docs/API.md 的事件表
  //
  // 只做**单向 + 指纹**两类断言，不重演生成器的合并规则（JSDoc ∪ (emits \ update:*)）：
  //   · 单向：源码 `@event` 写的每个名字都必须在该组件事件表的名字列里。名字被从冒号处
  //     切断时（`update:modelValue` → `update`），这条立刻红。
  //   · 指纹：说明列不许以 `:` 开头 —— 那正是「名字被切断、说明掉了头」的固定形状。
  // 没查的那一面（产物多出一行）由 check:rules 的 emits ↔ $emit 双向对账覆盖。
  const eventTable = tables.find((t) => t.header[0] === '事件名');
  if (f.jevents.length) {
    if (!eventTable) {
      fail('artifact-missing', f.id, `源码登记了 ${f.jevents.length} 个 @event，但 docs/API.md 里没有事件表`);
    } else {
      artifactEventsChecked += eventTable.rows.length;
      const names = new Set(eventTable.rows.map((r) => r[0]));
      const lost = f.jevents.filter((n) => !names.has(n));
      if (lost.length) {
        fail(
          'artifact-events',
          `docs/API.md · ${f.id} 事件表`,
          `@event 写了 [${lost.join(', ')}]，产物事件表里找不到这些名字` +
            `（表格里是 [${[...names].join(', ')}]）—— 生成器把事件名切断了？`
        );
      }
      for (const row of eventTable.rows) {
        if (row[1].startsWith(':')) {
          fail(
            'artifact-events',
            `docs/API.md · ${f.id} 事件 ${row[0]}`,
            `说明以 ":" 开头（"${row[1].slice(0, 40)}"）—— 事件名被从冒号处切断的指纹：` +
              `真正的事件名应是 "${row[0]}${row[1].split(/\s/)[0]}"`
          );
        }
      }
    }
  }
}

/** 集合差的可读表述：只在数量不同或顺序不同时补一句，避免噪音 */
function renderDelta(got, want) {
  const g = new Set(got);
  const w = new Set(want);
  const missing = want.filter((x) => !g.has(x));
  const extra = got.filter((x) => !w.has(x));
  if (!missing.length && !extra.length) return '（同一批名字，只是顺序不同）';
  const parts = [];
  if (missing.length) parts.push(`产物缺 ${missing.join(', ')}`);
  if (extra.length) parts.push(`产物多 ${extra.join(', ')}`);
  return `（${parts.join('；')}）`;
}

// ── 汇总 ──────────────────────────────────────────────────────────────────

const totalProps = facts.reduce((n, f) => n + f.props.length, 0);
const totalJProps = facts.reduce((n, f) => n + f.jprops.length, 0);
const totalJEvents = facts.reduce((n, f) => n + f.jevents.length, 0);
const totalSlots = facts.reduce((n, f) => n + f.tplSlots.size, 0);
const totalJSlots = facts.reduce((n, f) => n + f.jslots.size, 0);
const dynamicCount = facts.reduce((n, f) => n + f.dynamic.length, 0);

const scan = [
  ['组件', facts.length, FLOORS.components],
  ['props 声明', totalProps, FLOORS.props],
  ['@property 文档', totalJProps, FLOORS.propertyDocs],
  ['@event 文档', totalJEvents, FLOORS.eventDocs],
  ['模板插槽', totalSlots, FLOORS.slots],
  ['@slot 登记', totalJSlots, FLOORS.slotDocs],
];

console.log(
  `  扫描面: 组件 ${facts.length}   props ${totalProps}（去重后检查 ${deadChecked} 条）   ` +
    `@property ${totalJProps}   @event ${totalJEvents}   ` +
    `模板插槽 ${totalSlots}（其中动态 ${dynamicCount}）   @slot ${totalJSlots}`
);
console.log(
  `  产物对账: types/index.d.ts 字段 ${artifactPropsChecked} / 事件 ${artifactDtsEventsChecked}   ` +
    `docs/API.md 属性行 ${artifactApiPropsChecked} / 事件行 ${artifactEventsChecked} / 插槽行 ${artifactSlotsChecked}`
);

/* 动态插槽名静态抓不到，全靠这张登记表兜着 —— 打出来，别让它隐形 */
const dynNotes = Object.entries(DYNAMIC_SLOTS).flatMap(([id, list]) =>
  list.map((r) => `${id} · 模板里 <slot :name="${r.expr}"> → 文档名 \`${r.doc}\`（${r.why}）`)
);
if (dynNotes.length) {
  console.log(`  动态插槽登记表: ${dynNotes.length} 条`);
  for (const n of dynNotes) console.log(`      - ${n}`);
}

const dead = [];
for (const [label, n, floor] of scan) {
  if (n < floor) dead.push(`${label} 只解析出 ${n}（下限 ${floor}）`);
}
if (dead.length) {
  for (const d of dead) fail('scan-dead', 'scripts/lib/source.js', d);
}

let bad = 0;
if (groups.size) {
  const hit = [...groups.values()].filter((g) => g.items.length);
  if (hit.length) {
    console.log(`\n  x ${hit.reduce((n, g) => n + g.items.length, 0)} 处不一致：`);
    for (const g of hit) {
      console.log(`\n    ${g.name}   [${g.id}]   （${g.items.length} 处）`);
      console.log(`      为什么：${g.why}`);
      for (const it of g.items) console.log(`      ${it.where}   ${it.evidence}`);
      console.log(`      改法：${g.fix}`);
    }
    bad = 1;
  }
}
if (!selfTest()) bad = 1;

if (bad) {
  console.log('\nprops / 插槽契约对账未通过。\n');
  process.exit(1);
}

console.log(`\n  ${facts.length} 个组件的 props / 事件 / 插槽契约与产物一致。\n`);
