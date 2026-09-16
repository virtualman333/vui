#!/usr/bin/env node
/**
 * vui-markdown 解析器行为测试 —— 组件库里**第一条真的执行组件代码**的检查。
 *
 * 为什么需要它
 * ------------
 * `check:all` 里其余脚本看的都是「文件长什么样」：语法（check:sfc）、主题变量
 * （check:theme）、产物一致性（check:gen）、tarball 清单（check:pack）、组件枚举
 * （check:components）…… **没有一条会真的跑一遍组件的代码**。
 * 而 vui-markdown 的解析器是纯函数（不碰 DOM、不碰 uni、不需要渲染），
 * 写成什么样用户就看到什么样 —— 它此前把 Markdown 表格整段吞成普通段落，
 * 用户看到的是满屏 `| 模型 | 分数 |` 原文，而十道检查全绿。
 * 表格恰恰是模型输出里最常见的一种结构。
 *
 * 做法
 * ----
 * 用 `@vue/compiler-sfc` 的 `parse()` 取 `<script>` 块（不自己按正则切字符串 ——
 * 正文里出现 `</script>` 之类就会骗过手写解析器），把 `export default` 换成
 * `module.exports` 后在 `new Function` 里求值，拿到组件选项对象；再手工组装一个
 * 最小 `this`（props 默认值 + data + methods），直接调用 `computed.blocks`。
 * 不引 Vue 运行时、不需要 DOM：小程序端的渲染差异不在本检查范围内。
 *
 * 覆盖的坑（每一条都属于「改坏了不会报错，只会在用户那里现形」）
 * ---------------------------------------------------------------
 *   1. 表头/分隔行/数据行的识别，以及「没有数据行」的表格
 *   2. 列数不齐时补齐（不补就会整张表错位）
 *   3. 对齐标记 `:--` / `:-:` / `--:` 落到单元格上
 *   4. `\|` 转义（单元格里出现竖线时不能多拆一列）
 *   5. **`A | B` 这样的普通文本不许被当成表格**（表格行必须首字符是 `|`）
 *   6. 分隔行不合法时退回普通段落
 *   7. 单元格走与段落同一套行内解析（粗体 / 行内代码）
 *   8. 表格不会吃掉后面的内容（代码块、段落仍是独立块；围栏内的表格不解析）
 *   9. 结构锁：模板里的表格必须在 `scroll-view scroll-x` 里（否则窄屏上宽表
 *      会把整页撑破 —— 这是移动端最难看的一类故障）
 *
 * 用法：
 *   npm run check:markdown
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('@vue/compiler-sfc');

const root = path.resolve(__dirname, '..');
const FILE = path.join(root, 'uni_modules/vui-markdown/components/vui-markdown/vui-markdown.vue');

console.log('\n[vui-uniapp] vui-markdown 解析器行为测试');

let passed = 0;
const failures = [];

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

function eq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg} —— 实际 ${JSON.stringify(actual)}，期望 ${JSON.stringify(expected)}`);
  }
}

function deepEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg} —— 实际 ${a}，期望 ${b}`);
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  √ ${name}`);
  } catch (err) {
    failures.push(`${name}\n      ${err.message}`);
    console.log(`  x ${name}`);
  }
}

// ── 载入组件选项 ──────────────────────────────────────────────────────────

let opts;
try {
  const src = fs.readFileSync(FILE, 'utf8');
  const { descriptor, errors } = parse(src, { filename: 'vui-markdown.vue' });
  ok(errors.length === 0, `SFC 解析失败：${errors.map((e) => e.message).join('; ')}`);
  ok(descriptor.script, '组件没有 <script> 块（选项式 API 的写法变了？）');

  const code = descriptor.script.content;
  const hits = code.match(/^export default\b/m);
  ok(hits, '脚本里找不到顶格的 `export default` —— 本检查的求值方式需要它');

  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  const factory = new Function('module', 'exports', code.replace(/^export default\b/m, 'module.exports ='));
  factory(mod, mod.exports);
  opts = mod.exports;
  ok(opts && typeof opts === 'object', '组件选项求值后不是对象');
} catch (err) {
  console.log(`  x 无法载入组件脚本: ${err.message}\n`);
  process.exit(1);
}

const propsDefault = {};
for (const key of Object.keys(opts.props || {})) {
  const def = opts.props[key];
  propsDefault[key] = def && typeof def === 'object' && 'default' in def ? def.default : undefined;
}

const computedOf = (name) => {
  const c = (opts.computed || {})[name];
  if (!c) return null;
  return typeof c === 'function' ? c : c.get;
};

const blocksComputed = computedOf('blocks');
if (!blocksComputed) {
  console.log('  x 组件没有 computed.blocks —— 解析入口变了，本检查需要同步\n');
  process.exit(1);
}

/** 用一段 Markdown 跑出界面真正渲染的 blocks */
function blocks(md, extraProps) {
  const ctx = Object.assign(
    {},
    propsDefault,
    typeof opts.data === 'function' ? opts.data() : {},
    opts.methods,
    extraProps || {}
  );
  ctx.content = md;
  return blocksComputed.call(ctx);
}

const types = (bs) => bs.map((b) => b.type);
const table0 = (bs) => bs.find((b) => b.type === 'table');
const cellText = (cell) => cell.text;

// ── 1. 识别 ───────────────────────────────────────────────────────────────

test('表头 + 分隔行 + 数据行 → 一个 table 块', () => {
  const bs = blocks('| 模型 | 得分 |\n| --- | --- |\n| A | 91 |\n| B | 87 |');
  deepEq(types(bs), ['table'], '应当只解析出一个 table 块');
  const t = table0(bs);
  deepEq(t.header.map(cellText), ['模型', '得分'], '表头解析错');
  deepEq(
    t.rows.map((r) => r.map(cellText)),
    [
      ['A', '91'],
      ['B', '87']
    ],
    '数据行解析错'
  );
});

test('只有表头没有数据行也渲染（不退回段落）', () => {
  const bs = blocks('| 列一 | 列二 |\n| --- | --- |');
  deepEq(types(bs), ['table'], '空表也该是 table');
  const t = table0(bs);
  deepEq(t.header.map(cellText), ['列一', '列二'], '表头解析错');
  deepEq(t.rows, [], '没有数据行时 rows 应为空数组');
});

test('尾竖线可省（`| a | b`）', () => {
  const bs = blocks('| a | b\n| --- | ---\n| 1 | 2 |');
  deepEq(types(bs), ['table'], '缺尾竖线的表格没被识别');
  deepEq(table0(bs).header.map(cellText), ['a', 'b'], '表头解析错');
});

test('单列表格', () => {
  const bs = blocks('| 唯一 |\n| --- |\n| X |');
  deepEq(types(bs), ['table'], '单列表格没被识别');
  deepEq(table0(bs).rows.map((r) => r.map(cellText)), [['X']], '单列表格数据行解析错');
});

// ── 2. 列数不齐 ───────────────────────────────────────────────────────────

test('数据行列数不齐 → 补齐到表头列数（否则整张表错位）', () => {
  const bs = blocks('| a | b | c |\n| --- | --- | --- |\n| 1 |\n| 1 | 2 | 3 | 4 |');
  const t = table0(bs);
  deepEq(t.rows[0].map(cellText), ['1', '', ''], '少列没补齐');
  deepEq(t.rows[1].map(cellText), ['1', '2', '3'], '多列没截断');
  eq(t.rows[1].length, 3, '每行列数必须等于表头列数');
});

test('表头列数少于分隔行时，以表头为准（多出的对齐标记忽略）', () => {
  const bs = blocks('| a |\n| --- | --- |\n| 1 | 2 |');
  const t = table0(bs);
  eq(t.align.length, 1, '对齐数组长度必须等于表头列数');
  deepEq(t.rows[0].map(cellText), ['1'], '多余列只按表头截断');
});

// ── 3. 对齐 ───────────────────────────────────────────────────────────────

test('对齐标记 `:--` / `:-:` / `--:` 逐列生效', () => {
  const bs = blocks('| l | c | r |\n| :--- | :--: | ---: |\n| 1 | 2 | 3 |');
  deepEq(table0(bs).align, ['left', 'center', 'right'], '对齐解析错');
});

test('左对齐不写 inline style（默认值不必落地到 style 属性）', () => {
  const md = '| l | c |\n| --- | :-: |\n| 1 | 2 |';
  const ctx = Object.assign({}, propsDefault, opts.methods);
  const t = table0(blocks(md));
  eq(opts.methods.cellStyle.call(ctx, t, 0), '', '左对齐不该产生 style');
  eq(opts.methods.cellStyle.call(ctx, t, 1), 'text-align:center;', '居中对齐没落到 style');
});

// ── 4. 转义与误判 ─────────────────────────────────────────────────────────

test('`\\|` 是转义：单元格里的竖线不多拆一列', () => {
  const bs = blocks('| 表达式 | 说明 |\n| --- | --- |\n| `a \\| b` | 位或 |');
  const t = table0(bs);
  eq(t.rows[0].length, 2, '转义竖线被当成了列分隔符');
  eq(t.rows[0][0].text, '`a | b`', '转义后的文本不对');
});

test('普通文本里的竖线（`A | B`）绝不能被当成表格', () => {
  // 关键用例：后一行**真的是**合法分隔行，只是前一行不以 `|` 开头 ——
  // 只有这种输入才真正压住「表格行必须首字符是 |」这条判据
  // （GFM 允许省首竖线，这里刻意不跟：本组件渲染的是模型自由文本，
  // 把散文里的一行竖线吃成表格，比少支持一种写法贵得多）
  const guard = blocks('A | B 是一条普通文本\n--- | ---\n1 | 2');
  deepEq(types(guard), ['p'], '不以 | 开头的行被误判成表格头');

  // 常规流不受影响：普通段落 + 真正的表格仍是两个块
  const bs = blocks('A | B 是一条普通文本\n\n| a | b |\n| --- | --- |\n| 1 | 2 |');
  deepEq(types(bs), ['p', 'table'], '普通文本与表格混排时解析错');
  eq(bs[0].text, 'A | B 是一条普通文本', '普通文本被改写');
});

test('分隔行不合法 → 退回普通段落（不半解析）', () => {
  const bs = blocks('| a | b |\n| --- | x |\n| 1 | 2 |');
  deepEq(types(bs), ['p'], '不合法的分隔行没有退回段落');
});

test('引用块里的表格不当表格（不做半吊子支持）', () => {
  const bs = blocks('> | a | b |\n> | --- | --- |');
  deepEq(types(bs), ['quote'], '引用里的内容被拆成了表格');
});

// ── 5. 行内解析与边界 ─────────────────────────────────────────────────────

test('单元格走与段落同一套行内解析', () => {
  const bs = blocks('| a |\n| --- |\n| **粗** 与 `码` |');
  const segs = table0(bs).rows[0][0].segments;
  deepEq(segs.map((s) => s.type), ['bold', 'text', 'code'], '行内片段类型不对');
  eq(segs[0].text, '粗', '粗体文本不对');
  eq(segs[2].text, '码', '行内代码文本不对');
});

test('表格不吃掉后面的内容（代码块 / 段落仍是独立块）', () => {
  const bs = blocks('| a |\n| --- |\n| 1 |\n\n```js\nconst x = 1;\n```\n\n结尾段落');
  deepEq(types(bs), ['table', 'code', 'p'], '表格后的内容被吞了');
  eq(bs[1].lang, 'js', '代码块语言没读出来');
});

test('代码围栏里的表格不解析（围栏优先）', () => {
  const bs = blocks('```md\n| a | b |\n| --- | --- |\n```');
  deepEq(types(bs), ['code'], '围栏内的表格被解析了');
  eq(bs[0].text, '| a | b |\n| --- | --- |', '围栏内容不对');
});

test('空表格单元格不炸、也不产生 undefined', () => {
  const bs = blocks('| a | b |\n| --- | --- |\n|  |  |');
  const t = table0(bs);
  deepEq(t.rows[0].map(cellText), ['', ''], '空单元格应为空字符串');
  deepEq(t.rows[0][0].segments, [], '空单元格不该产生片段');
});

test('内容为 null / undefined / 非字符串时不抛异常', () => {
  eq(blocks(null).length, 0, 'null 内容应产出空数组');
  eq(blocks(undefined).length, 0, 'undefined 内容应产出空数组');
  eq(blocks('').length, 0, '空串应产出空数组');
});

// ── 6. 结构锁：模板与样式 ─────────────────────────────────────────────────

test('模板里的表格在 `scroll-view scroll-x` 里（窄屏不撑破整页）', () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const tpl = src.slice(0, src.indexOf('</template>'));
  ok(/vui-markdown__table/.test(tpl), '模板里没有表格分支 —— 解析出来也没人渲染');
  const idx = tpl.indexOf("block.type === 'table'");
  ok(idx > -1, '模板缺少 table 分支');
  const seg = tpl.slice(idx, idx + 600);
  ok(/<scroll-view[^>]*scroll-x/.test(seg), '表格没有放在横向 scroll-view 里 —— 宽表会把整页撑破');
  ok(/block\.header/.test(seg) && /block\.rows/.test(seg), '表头 / 数据行没渲染');
});

test('表格样式只引用主题变量（硬编码色值由 check:theme 兜底，这里先拦一道）', () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const style = src.slice(src.indexOf('<style'));
  const start = style.indexOf('&__table');
  ok(start > -1, '样式里找不到 &__table 段（样式名改了？）');
  // 表格段是样式表里最后一块，截到最外层规则的收尾花括号为止
  const seg = style.slice(start, style.lastIndexOf('}'));
  ok(seg.length > 100, '样式里找不到表格段（样式名改了？）');
  const hex = seg.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  deepEq(hex, [], '表格样式里出现硬编码色值');
});

// ── 汇总 ──────────────────────────────────────────────────────────────────

console.log('');
if (failures.length) {
  console.log(`  ${failures.length} 项失败：\n`);
  for (const f of failures) console.log(`    - ${f}\n`);
  console.log('vui-markdown 解析器行为测试未通过。\n');
  process.exit(1);
}

console.log(`  ${passed} 项全部通过。\n`);
