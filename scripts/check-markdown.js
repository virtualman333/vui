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
 *  10. 行内定界符的**两侧判据**：`user_name_count` 不许变成 `usernamecount`、
 *      `3 * 4 * 5` 不许变成 `3  4  5`（下划线 / 星号被当成强调定界符吃掉了）
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

/** 把组件的 <style lang="scss"> 真编译一遍，拿编译后的 CSS 做样式断言。
 *  （源码里的嵌套写法与编译结果不是一对一：`&__task { &--done {} }` 与 `&__task--done {}`
 *   编译出来相同，按源码字符串判会误伤其中一种。） */
function compileStyle() {
  const src = fs.readFileSync(FILE, 'utf8');
  const { descriptor } = parse(src, { filename: 'vui-markdown.vue' });
  const style = (descriptor.styles || []).find((s) => s.lang === 'scss');
  if (!style) throw new Error('组件没有 <style lang="scss"> 块 —— 样式断言无从下手');
  // eslint-disable-next-line global-require
  const sass = require('sass');
  return sass.compileString(style.content, {
    syntax: 'scss',
    quietDeps: true,
    logger: { warn() {}, debug() {} }
  }).css;
}

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

// ── 10. 行内链接 / 图片 ───────────────────────────────────────────────────

/**
 * 这一组补的是「解析器认识表格、却不认识链接」那类缺口。
 *
 * 链接是模型输出里第二常见的结构（仅次于表格），此前 `[文档](https://…)` 被**原样吐给用户** ——
 * 满屏方括号加网址，而十一道检查全绿。与「表格被吞成普通段落」是同一类故障：
 * 解析器没覆盖到的语法不会报错，只会把 Markdown 源码直接显示出来。
 *
 * 图片刻意**不内联渲染**，只渲染替代文本并挂上地址（远程图在小程序要域名白名单、
 * 在 App 要额外配置，静默加载失败比干脆不显示更难查）。
 */
const segsOf = (md) => blocks(md)[0].segments;
const segOf = (md, type) => segsOf(md).find((s) => s.type === type);

test('`[文本](地址)` → link 片段（文本与地址分开，不再把原文给用户看）', () => {
  deepEq(segsOf('见 [文档](https://a.com/b) 完'), [
    { type: 'text', text: '见 ' },
    { type: 'link', text: '文档', url: 'https://a.com/b', image: false },
    { type: 'text', text: ' 完' }
  ], '链接没被解析出来');
});

test('`![替代文本](图片地址)` → link 片段 + image 标记', () => {
  const s = segOf('![架构图](https://x/y.png)', 'link');
  ok(s, '图片语法没被识别 —— 用户会看到 `![架构图](…)` 原文');
  eq(s.text, '架构图', '图片的替代文本没渲染出来');
  eq(s.url, 'https://x/y.png');
  eq(s.image, true, '图片没有 image 标记 —— 与普通链接分不开');
});

test('替代文本为空时显示「图片」、链接文本为空时显示地址（不留一片空白）', () => {
  eq(segOf('![](https://x/y.png)', 'link').text, '图片');
  eq(segOf('[](https://a.com/b)', 'link').text, 'https://a.com/b');
});

test('没有 `(地址)` 的方括号不当链接（数组下标 `[0]` 只是文本）', () => {
  deepEq(segsOf('数组 [0] 与 [x]'), [{ type: 'text', text: '数组 [0] 与 [x]' }]);
});

test('行内代码优先：`` `[a](b)` `` 是代码，后面的 [c](d) 才是链接', () => {
  const s = segsOf('`[a](b)` 与 [c](d)');
  eq(s[0].type, 'code', '行内代码里的方括号被当成了链接');
  eq(s[0].text, '[a](b)');
  eq(s[2].type, 'link', '代码后面的链接没解析');
});

test('`**[文档](地址)**` 既加粗又是链接（单遍扫描最容易漏的一种）', () => {
  const s = segOf('**[文档](https://a.com)**', 'link');
  ok(s, '加粗里的链接没解析 —— 用户会看到 `**[文档](…)` 原文，而这在模型输出里极常见');
  eq(s.bold, true, '链接丢了加粗修饰');
  eq(s.text, '文档');
});

test('`*[文档](地址)*` 同理带 italic 修饰', () => {
  const s = segOf('*[文档](https://a.com)* 尾', 'link');
  ok(s && s.italic === true, '斜体里的链接丢了 italic 修饰');
});

test('纯粹的加粗 / 斜体保持原样（这次改动不改变它们的片段形态）', () => {
  deepEq(segsOf('**重点**'), [{ type: 'bold', text: '重点' }]);
  deepEq(segsOf('*斜*'), [{ type: 'italic', text: '斜' }]);
});

test('链接在标题 / 列表 / 表格单元格里同样生效（三处共用同一套行内解析）', () => {
  eq(blocks('## 见 [文档](https://a.com)')[0].segments[1].type, 'link', '标题里的链接没解析');
  eq(blocks('- [文档](https://a.com)')[0].items[0].segments[0].type, 'link', '列表里的链接没解析');
  eq(
    table0(blocks('| A |\n| --- |\n| [x](https://a.com) |')).rows[0][0].segments[0].type,
    'link',
    '表格单元格里的链接没解析'
  );
});

test('地址里的括号在此断句（刻意取舍，改它要连文档一起改）', () => {
  const s = segsOf('[a](b)c)');
  eq(s[0].type, 'link');
  eq(s[0].url, 'b');
  eq(s[1].text, 'c)');
});

test('模板里每个片段渲染点都挂了点击入口（链接点了没反应 = 没做）', () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const tpl = src.slice(0, src.indexOf('</template>'));
  // 计数不变量：渲染片段的地方与挂点击的地方必须一样多。
  // 只断言「出现过 onSegTap」不够 —— 只挂一处也算出现过（第 9 轮的教训：检查要自带计数不变量）。
  const rendered = (tpl.match(/segClass\(seg\)/g) || []).length;
  const tappable = (tpl.match(/onSegTap\(seg\)/g) || []).length;
  ok(rendered > 0, '模板里找不到片段渲染点 —— 模板结构变了，本检查需要同步');
  eq(
    tappable,
    rendered,
    `有 ${rendered} 处渲染片段，却只有 ${tappable} 处挂了点击 —— 漏掉的位置点链接没反应`
  );
});

test('link 片段的样式类与样式块都在（否则链接和普通文字长得一样，没人知道能点）', () => {
  const ctx = Object.assign({}, propsDefault, opts.data(), opts.methods);
  ok(
    String(ctx.segClass({ type: 'link', text: 'x' })).indexOf('vui-markdown__link') > -1,
    'segClass 没给 link 片段样式类'
  );
  ok(
    String(ctx.segClass({ type: 'link', bold: true })).indexOf('vui-markdown__bold') > -1,
    '带 bold 标记的 link 丢了加粗类'
  );
  const style = fs.readFileSync(FILE, 'utf8');
  ok(/&__link\s*\{/.test(style.slice(style.indexOf('<style'))), '样式块里没有 &__link —— 链接没有可辨识的样式');
});

// ── 7. 列表：层级 / 任务框 / 编号 ──────────────────────────────────────────
//
// 这一节覆盖的都是「模型输出里天天出现、而此前渲染结果与原文结构不符」的形态：
// 嵌套清单被拍平成四个同级圆点、待办清单把 `[ ]` 原文吐给用户、空行把编号列表
// 拆成两个各自从 1 开始。三种都不会报错，只是用户看到的和模型写的不是一个东西。

const ctx = () => Object.assign({}, propsDefault, opts.data(), opts.methods);
const items = (md) => blocks(md)[0].items;
const markers = (md) => {
  const c = ctx();
  /* 逐块展开：一份文档可能出多个列表块（类型交替时），只看第一块会漏掉后面那些 */
  const out = [];
  for (const b of blocks(md)) {
    if (b.type !== 'list') continue;
    b.items.forEach((it, i) => out.push(opts.methods.liMarker.call(c, b, it, i)));
  }
  return out;
};
const levels = (md) => items(md).map((it) => it.level);

test('嵌套列表保留层级（此前被拍平成一个扁平列表 —— 层级信息直接丢给用户看）', () => {
  const md = '- 一级 A\n  - 二级 A1\n  - 二级 A2\n- 一级 B';
  eq(blocks(md).length, 1, '嵌套列表被拆成了多个块');
  deepEq(levels(md), [0, 1, 1, 0], '缩进层级没被保留 —— 用户看到四个同一层的圆点');
  deepEq(
    items(md).map((it) => it.text),
    ['一级 A', '二级 A1', '二级 A2', '一级 B'],
    '列表项文本被改动了'
  );
  deepEq(markers(md), ['•', '◦', '◦', '•'], '子层没换标记符号 —— 光有缩进不够直观');
});

test('缩进宽度 → 层级：2 空格一级、tab 记 4 格、超过 3 级封顶', () => {
  deepEq(levels('- a\n  - b\n    - c\n      - d\n        - e'), [0, 1, 2, 3, 3], '层级换算不对');
  deepEq(levels('- a\n\t- b'), [0, 2], 'tab 缩进没按 4 格算');
});

test('任务框：`[ ]` / `[x]` / `[X]` 三态，且文本里不再残留那对方括号', () => {
  const md = '- [ ] 未完成\n- [x] 已完成\n- [X] 也算完成';
  deepEq(
    items(md).map((it) => it.checked),
    [false, true, true],
    '任务框的勾选态识别不对'
  );
  deepEq(
    items(md).map((it) => it.text),
    ['未完成', '已完成', '也算完成'],
    '文本里还残留着 `[ ]` / `[x]` —— 用户看到的就是这些括号'
  );
  deepEq(markers(md), ['•', '•', '•'], '对照：非任务项仍是圆点标记（由模板决定画框还是画点）');
});

test('`[y]`、`[ ]` 后面没有内容的写法不当任务框（别把普通文本吃掉）', () => {
  eq(items('- [y] 不是任务框')[0].checked, null, '`[y]` 被当成了任务框');
  eq(items('- [y] 不是任务框')[0].text, '[y] 不是任务框', '普通文本被吞掉了');
  eq(items('- [x]没有空格')[0].checked, null, '`[x]` 后面没有空白也被当成了任务框');
});

test('有序列表：起始编号按原文（`3.` 起就是 3.），子层各记各的计数器', () => {
  deepEq(markers('3. 第三项\n4. 第四项'), ['3.', '4.'], '起始编号被强行当成 1 —— 接在上一段后面的编号会全错');
  deepEq(
    markers('1. 甲\n  - 甲1\n  - 甲2\n2. 乙'),
    ['1.', '1.', '2.', '2.'],
    '子层的编号没有独立计数（或外层被内层带跑了）'
  );
  deepEq(
    markers('1. 甲\n  1. 甲1\n  2. 甲2\n2. 乙'),
    ['1.', '1.', '2.', '2.'],
    '子层写死了编号时不该再自增'
  );
});

test('松散列表：空行不另起一个列表，编号必须连续往下走', () => {
  const bs = blocks('1. 甲\n\n2. 乙');
  eq(bs.length, 1, '空行把有序列表拆成了两个 —— 第二个列表又从 1 开始编号');
  deepEq(markers('1. 甲\n\n2. 乙'), ['1.', '2.'], '编号没有连续');
  eq(blocks('- 甲\n\n- 乙').length, 1, '无序列表也被空行拆开了');
});

test('不同类型的列表不会被粘成一个（空行之后换成有序，就该另起一块）', () => {
  const bs = blocks('- 甲\n- 乙\n\n1. 丙');
  eq(bs.length, 2, '无序与有序被合并成了同一个列表');
  eq(bs[0].ordered, false);
  eq(bs[1].ordered, true);
  deepEq(markers('1. 甲\n\n2. 乙\n\n- 丙'), ['1.', '2.', '•'], '交替类型时标记错乱');
});

test('围栏代码块里的 `- 项` 不产生列表；单独一行的 `-` 也不是列表项', () => {
  deepEq(types(blocks('```\n- 甲\n- 乙\n```')), ['code'], '代码块里的内容被解析成了列表');
  const bs = blocks('上面的\n\n-\n');
  ok(
    bs.every((b) => b.type !== 'list'),
    '单独一行的 `-` 被当成了列表项 —— 列表标记后面必须有空白（否则 `---` 之类会先被别的规则吃掉）'
  );
  eq(bs[1].text, '-', '单独一行的 `-` 应当原样作为段落文本');
});

test('模板：`itemIndent` 挂上了，且勾选框与标记是二选一（不许两个都画）', () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const tpl = src.slice(0, src.indexOf('</template>'));
  ok(tpl.includes('itemIndent(item)'), '列表项没有挂层级缩进 —— 解析出了层级却不用，等于没做');
  ok(/v-if="item\.checked !== null/.test(tpl), '模板没有按 checked 决定画勾选框');
  /* 「画标记的那个元素必须是 v-else」：按 liMarker( 的位置往前找它所属的标签，
     在标签内部找 v-else。不这么找的话，「同一行里出现过 v-else 与 liMarker(」也能骗过断言。 */
  const at = tpl.indexOf('liMarker(');
  ok(at > -1, '模板里找不到 liMarker —— 标记渲染点没了');
  const open = tpl.lastIndexOf('<', at);
  const tag = tpl.slice(open, at);
  ok(
    /v-else/.test(tag),
    '画标记的那个元素不是 v-else —— 它与勾选框会同时出现在一行（两个都画）'
  );

  /* 样式断言走**编译产物**而不是源码形态：`&__task--done` 与嵌在 `&__task` 里的 `&--done`
     编译出来是同一个选择器，按源码字符串判会误伤其中一种写法。 */
  const css = compileStyle();
  ok(/\.vui-markdown__task\s*\{/.test(css), '编译后的 CSS 里没有 .vui-markdown__task —— 勾选框没有可见的形状');
  ok(
    /\.vui-markdown__task--done/.test(css),
    '编译后的 CSS 里没有 .vui-markdown__task--done —— 勾选与未勾选长得一样'
  );
});

// ── 7.5 列表项的续行 ──────────────────────────────────────────────────────
//
// 「模型把一条长要点折行」是这类语料里最常见的写法之一，此前它会**把列表拦腰截断**：
// 续行掉到列表外面变成独立段落（还带着源文件里的缩进空格），后面的项另起一个列表。
// 结构散掉，一个错都不报。

test('列表项续行接回上一项，列表不再被拦腰截断', () => {
  const md = '- 第一步先装依赖，装完再执行下面那条命令，\n  注意别在 root 下跑\n- 第二步';
  const bs = blocks(md);
  eq(bs.length, 1, '续行把列表拆成了「列表 + 段落 + 列表」三块（此前就是这个症状）');
  eq(bs[0].type, 'list');
  deepEq(
    bs[0].items.map((it) => it.text),
    ['第一步先装依赖，装完再执行下面那条命令，\n注意别在 root 下跑', '第二步'],
    '续行没有接进上一项，或源文件里的缩进空格没被去掉'
  );
  eq(bs[0].items[0].level, 0, '续行把这一项的层级带跑了');
});

test('有序列表的续行不影响编号（还是 1. / 2.，不另起一块）', () => {
  const md = '1. 第一步\n   需要保持缩进继续写\n2. 第二步';
  const bs = blocks(md);
  eq(bs.length, 1, '有序列表被续行拆开了');
  deepEq(markers(md), ['1.', '2.'], '续行让编号错乱');
  deepEq(
    bs[0].items.map((it) => it.num),
    [1, 2],
    '编号被续行带偏'
  );
});

test('续行里的行内语法照常解析（粗体 / 链接与段落同一套）', () => {
  const md = '- 要点：**结论**在这里\n  参考 [文档](https://a.b/c) 第 3 节';
  const segs = items(md)[0].segments;
  ok(
    segs.some((s) => s.type === 'bold' && s.text === '结论'),
    '续行里的粗体没被解析 —— 用户会看到那对星号'
  );
  ok(
    segs.some((s) => s.type === 'link' && s.url === 'https://a.b/c'),
    '续行里的链接没被解析 —— 用户会看到 `[文本](地址)` 原文'
  );
});

test('顶格的非列表行不接（作者有意另起一段，不是续行）', () => {
  const md = '- 一项\n另起一段的正文\n\n- 又一项';
  const bs = blocks(md);
  ok(
    bs.some((b) => b.type === 'p' && b.text === '另起一段的正文'),
    '顶格的那行被吞进列表项了 —— 段落与列表的边界不该靠猜'
  );
});

test('空行之后不接（松散列表的判定不受影响）', () => {
  const md = '- 甲\n\n  这段是独立段落\n\n- 乙';
  const bs = blocks(md);
  ok(
    bs.some((b) => b.type === 'p' && b.text.trim() === '这段是独立段落'),
    '空行之后的缩进行被接进了上一项 —— 松散列表被改坏了'
  );
});

test('缩进的**块级起点**不接：围栏 / 标题 / 分隔线 / 引用 / 表格行都仍是独立块', () => {
  for (const [name, extra, kind] of [
    ['围栏', '  ```js\n  a();\n  ```', 'code'],
    ['标题', '  ## 小标题', 'h'],
    ['分隔线', '  ---', 'hr'],
    ['引用', '  > 引用一句', 'quote'],
    ['表格行', '  | a | b |\n  | --- | --- |\n  | 1 | 2 |', 'table']
  ]) {
    const bs = blocks('- 用法：\n' + extra + '\n- 结束');
    ok(
      bs.some((b) => b.type === kind),
      `缩进的${name}被当成续行吞进列表项了（本组件不支持「列表项里的嵌套块」，宁可少接不可乱接）`
    );
  }
});

test('嵌套列表仍然只认层级：子项不会被上一项的续行吃掉', () => {
  const md = '- 一级 A\n  一级 A 的续行\n  - 二级 A1\n- 一级 B';
  const bs = blocks(md);
  eq(bs.length, 1, '嵌套列表被拆开了');
  deepEq(levels(md), [0, 1, 0], '层级不对（续行不该另起一项）');
  eq(bs[0].items[0].text, '一级 A\n一级 A 的续行', '续行没接在第一个一级项上');
});

// ── 11. 粗斜体（三重定界符） ───────────────────────────────────────────────

/**
 * `***重点***` 此前会**漏出一个多余的星号**。
 *
 * 原因在行内正则的备选顺序：`***重点***` 匹配不上 `\*\*[^*]+\*\*`
 * （`**` 之后紧接着就是 `*`，`[^*]+` 直接失败），也匹配不上 `\*[^*\n]+\*`
 * （同理）。正则于是**从第二个星号起**才匹配上 `**重点**`，多出来的那个 `*`
 * 作为普通文本片段吐给用户 —— 界面上看到的是 `*重点*`。`___重点___` 漏下划线同理。
 *
 * 这类故障与「表格被吞成普通段落」「链接原样吐出」是同一族：**不报错，只在用户那里现形**。
 * 而 `***` 恰恰是模型强调重点时最常用的写法。
 */
test('`***重点***` → 单片段，带 bold + italic 两层修饰', () => {
  deepEq(segsOf('***重点***'), [{ type: 'text', text: '重点', bold: true, italic: true }]);
});

test('`___重点___` 同样（下划线写法）', () => {
  deepEq(segsOf('___重点___'), [{ type: 'text', text: '重点', bold: true, italic: true }]);
});

test('混排 `**粗** *斜* ***粗斜*** ___粗斜___` 各归各位，一个定界符都不许漏', () => {
  /* 按「改坏它」写的：把三重那条备选从正则里删掉，这里立刻红（实测 3 条红）。
     ⚠ 但它**不是**「备选顺序」的锁：把 `***…***` 与 `**…**` 换序是等价改写，
     实测一项都不红 —— 两条备选在任一位置上互斥，顺序不影响结果。 */
  deepEq(segsOf('**粗** *斜* ***粗斜*** ___粗斜___'), [
    { type: 'bold', text: '粗' },
    { type: 'text', text: ' ' },
    { type: 'italic', text: '斜' },
    { type: 'text', text: ' ' },
    { type: 'text', text: '粗斜', bold: true, italic: true },
    { type: 'text', text: ' ' },
    { type: 'text', text: '粗斜', bold: true, italic: true }
  ]);
});

test('残留字符的通用不变量：这批输入渲染出的文本里不许出现 `*` / `_`', () => {
  const cases = [
    '***重点***',
    '___重点___',
    '前 ***重点*** 后',
    '***[文档](https://a.com)***',
    '***`npm i`***',
    '- 列表项里的 ***重点***',
    '> 引用里的 ***重点***',
    '| ***重点*** |\n| --- |\n| a |',
    '## ***重点***'
  ];
  for (const md of cases) {
    const grab = (bs) =>
      bs
        .flatMap((b) =>
          b.type === 'table'
            ? [...b.header, ...b.rows.flat()].map((c) => c.segments)
            : b.type === 'list'
              ? b.items.map((i) => i.segments)
              : [b.segments || []]
        )
        .flat()
        .map((s) => (s && s.text) || '')
        .join('');
    const txt = grab(blocks(md));
    ok(!/[*_]/.test(txt), `「${md}」渲染出了残留定界符：${JSON.stringify(txt)}`);
  }
});

test('三重里的链接 / 行内代码保留原片段类型，并带上两层修饰', () => {
  const a = segsOf('***[文档](https://a.com)***')[0];
  eq(a.type, 'link', '三重里的链接丢了片段类型');
  eq(a.url, 'https://a.com');
  ok(a.bold === true && a.italic === true, '三重里的链接没带上两层修饰');

  const b = segsOf('***`npm i`***')[0];
  eq(b.type, 'code', '三重里的行内代码丢了片段类型');
  ok(b.bold === true && b.italic === true, '三重里的行内代码没带上两层修饰');
});

test('两层修饰都落到样式类上，且两个类在样式块里真有定义', () => {
  const cls = opts.methods.segClass({ type: 'text', text: '重点', bold: true, italic: true });
  ok(cls.includes('vui-markdown__bold') && cls.includes('vui-markdown__italic'),
    `两层修饰没同时落到类上：${JSON.stringify(cls)}`);
  // 类名拼出来是空的没用，必须在编译后的 CSS 里真有形状
  const css = compileStyle();
  ok(/\.vui-markdown__bold\b/.test(css), '编译后的 CSS 里没有 .vui-markdown__bold');
  ok(/\.vui-markdown__italic\b/.test(css), '编译后的 CSS 里没有 .vui-markdown__italic');
});

test('结构锁：块级标记**只有一份** —— 改掉它，主循环与续行判定会一起变', () => {
  /* 这条锁不读源码形态（那种断言会被一行注释或另一处等价写法骗过），而是**真的把
     MD_BLOCK.hr 改成永不匹配**再问两个调用方：
       ① 主循环还认不认分隔线（`---` 那一行会退回普通段落）；
       ② 续行判定还排不排除分隔线（`  ---` 会被当成续行接进列表项）。
     两处都随这一个常量变 = 它们共用同一份判据；任何一处改成内联正则，这里就会红。 */
  const file = path.join(root, 'uni_modules/vui-markdown/components/vui-markdown/vui-markdown.vue');
  const raw = fs.readFileSync(file, 'utf8');
  const { descriptor } = parse(raw, { filename: 'vui-markdown.vue' });
  const code = descriptor.script.content;
  /* 「永不匹配」的正则写 `/(?!)/`。**别写 `/$^/`**：空串同时是其起止位置，`$^` 会匹配空行 ——
     第一版就栽在这（空白行全变成了 hr 块，看起来像「补丁没生效」，实则是补丁选错了哨兵）。 */
  const patched = code.replace(/\thr: \/[^\n]*\n/, '\thr: /(?!)/,\n');
  ok(patched !== code, '没能在源码里找到 MD_BLOCK.hr 的定义 —— 常量被改名了？本条锁需要同步');
  /* 注意别用 `!/hr: \//` 判「补丁生效」：补丁文本本身就带着 `hr: /` 开头，
     那样写必然误红（第一版也栽在这）。改成看补丁后的字面量在不在。 */
  ok(patched.includes('hr: /(?!)/'), '打补丁没生效（MD_BLOCK.hr 还是原样）');
  ok(!patched.includes('(?:\\*\\s*){3,}'), '补丁后原正则片段仍在 —— 打到了别的地方');

  const mod = { exports: {} };
  new Function('module', 'exports', patched.replace(/^export default\b/m, 'module.exports ='))(mod, mod.exports);
  const o = mod.exports;
  const b2 = (md) => {
    const c = Object.assign({}, propsDefault, o.data(), o.methods, { content: md });
    return o.computed.blocks.call(c);
  };

  deepEq(
    types(b2('甲\n\n---\n\n乙')),
    ['p', 'p', 'p'],
    '改掉 MD_BLOCK.hr 之后主循环仍然认分隔线 —— 说明主循环另有一份判据'
  );
  const bs = b2('- 用法：\n  ---\n- 结束');
  eq(bs.length, 1, '改掉 MD_BLOCK.hr 之后 `  ---` 仍被排除在续行之外 —— 续行判定另有一份判据');
  eq(bs[0].items[0].text, '用法：\n---', '续行判定没有随 MD_BLOCK.hr 一起变');
});

// ── 12. 行内定界符的两侧判据 ──────────────────────────────────────────────

/**
 * `user_name_count` 此前渲染成 `usernamecount`，`计算 3 * 4 * 5 的结果` 渲染成
 * `计算 3  4  5 的结果`。
 *
 * 根因同一个：行内正则只管「有没有一对相同符号」，不问这对符号**两侧长什么样**。
 * 于是 `_name_` 被当成斜体定界符吃掉了两个下划线（`user_name_count` 被切成三段），
 * `* 4 *` 被当成斜体定界符吃掉了两个星号。**用户看到的和模型写的不是一个东西**，
 * 而整套检查全绿 —— 与「表格被吞成普通段落」是同一族故障。
 *
 * 这一组用例的形状刻意是**逐字比对**（原文 vs 渲染出的文本），不留「差不多就行」的余地：
 * 这类损坏恰恰是「少了几个字符」而不是「整段没了」，模糊判据抓不住它。
 */
const FIRST = (md) => blocks(md)[0];

test('词中间的下划线不是定界符：snake_case 逐字保留', () => {
  const md = '变量 user_name_count 与 my_var 在这里';
  deepEq(segsOf(md), [{ type: 'text', text: md }], '词中间的下划线被当成了斜体定界符 —— 下划线被吃掉、单词被切开');
  eq(FIRST(md).text, md, '段落原文也被改写了');
});

test('emoji 短代码同理（`:white_check_mark:` 不许变成 `:whitecheckmark:`）', () => {
  const md = '完成 :white_check_mark: 通过';
  deepEq(segsOf(md), [{ type: 'text', text: md }]);
});

test('紧邻空白的星号不是定界符：乘号 `3 * 4 * 5` 逐字保留', () => {
  const md = '计算 3 * 4 * 5 的结果';
  deepEq(segsOf(md), [{ type: 'text', text: md }], '乘号被当成了斜体定界符 —— 两个星号消失、中间的数字变斜体');
});

test('带空格的强调标记不成立（`** 重点 **` 是字面文本）', () => {
  const md = '这是 ** 重点 ** 与 * 斜 *';
  deepEq(segsOf(md), [{ type: 'text', text: md }]);
});

test('各处上下文一致：列表 / 引用 / 标题 / 表格里的乘号与 snake_case 都不被吃', () => {
  eq(FIRST('- 计算 3 * 4 * 5 的结果').items[0].text, '计算 3 * 4 * 5 的结果');
  eq(FIRST('> 字段 is_deleted 为真').text, '字段 is_deleted 为真');
  eq(FIRST('## 关于 is_deleted 字段').text, '关于 is_deleted 字段');
  eq(table0(blocks('| a |\n| --- |\n| is_deleted |')).rows[0][0].text, 'is_deleted');
});

test('反向对照：该生效的强调一条都不许丢', () => {
  /* 为什么必须有这条：把判据收紧到「谁都不成立」也能让上面几条全绿。
     下面那条结构锁会把 delimiterOk 改成恒真，届时**这一条**会红 —— 两边互为对照。 */
  deepEq(segsOf('**重点**'), [{ type: 'bold', text: '重点' }]);
  deepEq(segsOf('*斜*'), [{ type: 'italic', text: '斜' }]);
  deepEq(segsOf('_斜_'), [{ type: 'italic', text: '斜' }]);
  deepEq(segsOf('__粗__'), [{ type: 'bold', text: '粗' }]);
  deepEq(segsOf('***重点***'), [{ type: 'text', text: '重点', bold: true, italic: true }]);
  deepEq(segsOf('___重点___'), [{ type: 'text', text: '重点', bold: true, italic: true }]);
  deepEq(
    segsOf('这是 *重点* 与 **粗体**'),
    [
      { type: 'text', text: '这是 ' },
      { type: 'italic', text: '重点' },
      { type: 'text', text: ' 与 ' },
      { type: 'bold', text: '粗体' }
    ],
    '正常写法（定界符两侧是空格）被误伤了'
  );
  /* `_` 强调前后有空格时照常成立 —— 词边界判据不该误伤这种最常见的写法 */
  deepEq(segsOf('这是 _重点_ 内容').map((s) => s.type), ['text', 'italic', 'text']);
  /* `3*4*5` 是 CommonMark 允许的词内强调（`*` 不受词边界限制），不能跟着一起被禁掉 */
  deepEq(segsOf('3*4*5').map((s) => s.type), ['text', 'italic', 'text']);
  /* 强调里嵌链接 / 行内代码这几条老行为一条都不能少 */
  eq(segOf('**[文档](https://a.com)**', 'link').bold, true);
  eq(segOf('*[文档](https://a.com)*', 'link').italic, true);
  const c = segsOf('***`npm i`***')[0];
  ok(c.type === 'code' && c.bold === true && c.italic === true, '三重里的行内代码丢了标记');
});

test('结构锁：两侧判据只有一份，且 parseInline 真的在用它', () => {
  /* 不读源码形态（那种断言会被一行注释骗过），而是把 delimiterOk 改成**恒真**再问两件事：
       ① 渲染结果**变没变** —— 没变就说明 parseInline 没调用它（判据是死代码）；
       ② 变了之后是不是**恰好变成损坏后的样子** —— 是才说明这两条规则都活在它里面。
     任何一条不成立（改成内联判断、只留一半规则、或干脆不调用），这里就会红。 */
  const file = path.join(root, 'uni_modules/vui-markdown/components/vui-markdown/vui-markdown.vue');
  const raw = fs.readFileSync(file, 'utf8');
  const { descriptor } = parse(raw, { filename: 'vui-markdown.vue' });
  const code = descriptor.script.content;
  const patched = code.replace(
    /(\tdelimiterOk\(src, index, token\) \{)[\s\S]*?(\n\t\t\},)/,
    '$1\n\t\t\treturn true; /* 注入：判据恒真 */$2'
  );
  ok(patched !== code, '没能在源码里找到 delimiterOk 的方法体 —— 方法被改名了？本条锁需要同步');
  ok(patched.includes('判据恒真'), '打补丁没生效（delimiterOk 还是原样）');

  const m = { exports: {} };
  new Function('module', 'exports', patched.replace(/^export default\b/m, 'module.exports ='))(m, m.exports);
  const o = m.exports;
  const grabWith = (mod, md) => {
    const c2 = Object.assign({}, propsDefault, mod.data(), mod.methods, { content: md });
    return mod.computed.blocks.call(c2)[0].segments.map((s) => s.text).join('');
  };
  const IN_WORD = '变量 user_name_count 在这里';
  const TIMES = '计算 3 * 4 * 5 的结果';

  /* ⚠ 这里比的**不是**「补丁后等于某个字面量」，而是「打补丁前后有没有差别」。
     只断言前者是不够的：假如 parseInline 压根没调用 delimiterOk，那么**补丁前的代码
     本身就是损坏后的样子**，那条断言照样绿 —— 判据变成死代码时锁一声不响。
     （第 18 轮负向验证 D3 实测抓到的假绿，改成本写法后 D3 立刻红。） */
  ok(
    grabWith(opts, IN_WORD) !== grabWith(o, IN_WORD),
    '把 delimiterOk 改成恒真之后词内下划线的渲染结果**没变** —— parseInline 没有调用它（判据是死代码）'
  );
  ok(
    grabWith(opts, TIMES) !== grabWith(o, TIMES),
    '把 delimiterOk 改成恒真之后乘号的渲染结果**没变** —— parseInline 没有调用它（判据是死代码）'
  );
  /* 两个方向都钉住：规则**活在这一个方法里**（改它，两处行为一起变） */
  eq(grabWith(o, IN_WORD), '变量 usernamecount 在这里', '恒真之后词内下划线没被吃 —— 这条判据不在 delimiterOk 里');
  eq(grabWith(o, TIMES), '计算 3  4  5 的结果', '恒真之后乘号没被吃 —— 这条判据不在 delimiterOk 里');
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
