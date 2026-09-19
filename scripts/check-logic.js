#!/usr/bin/env node
'use strict';
/**
 * check-logic.js —— 纯函数型组件的**行为**测试：真的把组件代码跑起来
 *
 * 为什么需要它
 * ------------
 * `check:all` 里其余脚本看的都是「文件长什么样」：语法（check:sfc）、主题变量
 * （check:theme）、产物一致性（check:gen）、tarball 清单（check:pack）、组件枚举
 * （check:components）、props/插槽登记（check:api）…… 真正**执行组件代码**的只有
 * `check:markdown` 一条，而它只覆盖 vui-markdown。
 *
 * 于是「纯函数的算法算错了」这一类缺陷在这条链上是**完全隐形**的 —— 它不影响语法、
 * 不影响产物生成、不影响文档登记，只影响用户拿到手的数字。本轮就抓到三处：
 *
 *   1. **vui-slider 的步长网格锚在 0 而不是 min**：`min=10 / max=20 / step=3` 的合法值
 *      是 10、13、16、19，旧实现算出 12 —— 既不在用户设的刻度上，又让**最左边的 min
 *      永远选不中**（拖到 0% 得到 12，拖到 100% 得到 18）。另外精度被写死 2 位，
 *      `step=0.001` 时 0.123 会被抹成 0.12，刻度直接被吃掉。
 *   2. **vui-time-picker 的 min/max 直接比字符串**，而边界允许写成 `HH:mm` 或 `HH:mm:ss`
 *      （见 JSDoc），组件自己的精度又由 `showSeconds` 决定。两边精度不同时字典序会给出
 *      错误结论，并把一个「不显示秒」的组件变成「输出带秒」的实现。
 *   3. **vui-pagination 的 current 只收了下界**：条数变少之后父组件手里的页码可能大于
 *      总页数，这时 `pages` 里没有任何一页等于 `current` —— 用户看到「一页都没选中」。
 *
 * 第 26 轮又加了一个 `vui-upload`：预览时它把「全量列表」与「过滤掉空 url 之后的列表」
 * 当成两个数组各按下标取，于是**点第 3 张会打开别的图**（越界时静默退回第一张）。
 * 同样是静态检查完全隐形的那一类 —— 语法对、产物一致、props 登记齐全。
 *
 * 做法
 * ----
 * 与 `check:markdown` 同一套：用 `@vue/compiler-sfc` 的 `parse()` 取 `<script>`（不手写
 * 正则切字符串），把 `export default` 换成 `module.exports` 后在 `new Function` 里求值，
 * 拿到组件选项对象；再手工组装一个最小 `this`（props 默认值 + methods + data + computed
 * 的 getter + 记录 `$emit`），直接调用方法 / 读 computed。不引 Vue 运行时、不需要 DOM
 * 与小程序环境 —— 渲染差异不在本检查范围内。
 *
 * 「不能静默跳过」是本文件的总原则
 * --------------------------------
 * 加载器解不出组件、解不出方法、断言条数低于下限，一律算**失败**，绝不当作「没有可测的
 * 东西」放过去。每条断言都配一条**自证**：先证明被测入口真的拿到了（`typeof fn === 'function'`）。
 *
 * 用法：node scripts/check-logic.js    （= npm run check:logic，自动进 check:all）
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('@vue/compiler-sfc');

const root = path.resolve(__dirname, '..');

const SLIDER = 'uni_modules/vui-slider/components/vui-slider/vui-slider.vue';
const TIME = 'uni_modules/vui-time-picker/components/vui-time-picker/vui-time-picker.vue';
const PAGINATION = 'uni_modules/vui-pagination/components/vui-pagination/vui-pagination.vue';
const UPLOAD = 'uni_modules/vui-upload/components/vui-upload/vui-upload.vue';

/**
 * 被测组件：`路径 → 入口方法`。**这里是唯一登记处** —— 加载器自证直接遍历它。
 *
 * 为什么要有这张表：原先自证里手抄了一个三元素数组，于是「少抄一个组件」只是让循环
 * 少跑一圈，**静默通过**。实测把 `vui-upload` 那条删掉，全部断言照样绿（V6 注入）。
 * 所以下面除了「表里的每个都能加载出来」，还有一条**反向对账**：
 * 文件里每声明一条 `const X = 'uni_modules/...'`，就必须出现在这张表里。
 */
const SUBJECTS = {
	[SLIDER]: 'updateByClientX',
	[TIME]: 'onChange',
	[PAGINATION]: 'update',
	[UPLOAD]: 'onPreview'
};

/** 断言条数下限：低于它说明加载器/枚举塌了，而不是「缺陷变少了」。 */
const FLOOR = 30;

console.log('\n[vui-uniapp] 纯函数型组件的行为测试（真的跑组件代码）');

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (e) {
    failures.push({ name, error: e && e.message });
    console.log(`  x   ${name}\n      ${e && e.message}`);
  }
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

function eq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}：期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
  }
}

const pad2 = (n) => (n < 10 ? '0' + n : String(n));

/**
 * 用 SFC 解析器取 `<script>` 块并求值，拿到组件选项对象。
 * 手写正则切 `<script>` 会被正文里的 `</script>`、注释里的标签骗过；解析器不会。
 */
function loadOptions(rel) {
  const raw = fs.readFileSync(path.join(root, rel), 'utf8');
  const { descriptor, errors } = parse(raw);
  if (errors && errors.length) throw new Error(`${rel} SFC 解析失败：${errors[0].message}`);
  const script = descriptor.script ? descriptor.script.content : '';
  if (!script) throw new Error(`${rel} 里没有 <script> 块`);
  if (!/^export default\b/m.test(script)) throw new Error(`${rel} 的 <script> 里没有 export default`);
  const code = script.replace(/^export default\b/m, 'module.exports =');
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', code)(mod, mod.exports);
  if (!mod.exports || typeof mod.exports !== 'object') throw new Error(`${rel} 没导出组件选项对象`);
  return mod.exports;
}

/**
 * 最小实例。顺序有讲究：
 *   methods → props → data() → computed（getter） → overrides
 * ① methods 要在 `data()` 之前 —— 组件的 `data()` 会调 `this.someMethod()`
 *    （vui-calendar 的 `data()` 就调了 `this.parseDate`）。
 * ② overrides 放最后，才能盖住 props 与 data 两处的默认值（`rect` 是 data）。
 */
function mount(rel, overrides) {
  const options = loadOptions(rel);
  const vm = { __events: [] };
  for (const [k, fn] of Object.entries(options.methods || {})) vm[k] = fn;
  for (const [k, spec] of Object.entries(options.props || {})) {
    const d = spec && 'default' in spec ? spec.default : undefined;
    vm[k] = typeof d === 'function' ? d() : d;
  }
  Object.assign(vm, typeof options.data === 'function' ? options.data.call(vm) : {});
  for (const [k, fn] of Object.entries(options.computed || {})) {
    Object.defineProperty(vm, k, { get: () => fn.call(vm), enumerable: true, configurable: true });
  }
  Object.assign(vm, overrides || {});
  vm.$emit = (name, ...args) => {
    vm.__events.push({ name, args });
  };
  vm.pickEvent = (name) => vm.__events.filter((e) => e.name === name);
  vm.lastPayload = (name) => {
    const list = vm.pickEvent(name);
    return list.length ? list[list.length - 1].args[0] : undefined;
  };
  return vm;
}

// ── vui-slider：步长网格的锚点（min 而不是 0）与精度（按 step 而不是写死 2 位） ──

/**
 * 拖动探针。`modelValue` 默认给 `null` 是**必须的**：组件里有
 * `if (value === this.modelValue) return;`，而 modelValue 的默认值是 0 ——
 * 拖到 0 那条用例会因此**一次都不 emit**，上一次的结果还留在记录里
 * （第一版就栽在这：断言读到了一个 `undefined`，看着像组件算错，其实是探针没拿到事件）。
 */
const sliderAt = (ratio, props) => {
  const vm = mount(SLIDER, Object.assign({ rect: { left: 0, width: 100 }, modelValue: null }, props));
  ok(
    typeof vm.updateByClientX === 'function',
    'vui-slider 上没有 updateByClientX —— 被测入口不见了（加载器坏了或方法被改名）'
  );
  ok(vm.rect && vm.rect.width, '探针自己没把 rect 塞进去');
  vm.updateByClientX(ratio * 100);
  const payload = vm.lastPayload('update:modelValue');
  ok(payload !== undefined, `拖到 ${ratio} 时组件没有 emit —— 这条断言拿不到判据`);
  return payload;
};

test('slider · 拖到最左边拿到的是 min（旧实现按 0 对齐，返回 12 而不是 10）', () => {
  eq(sliderAt(0, { min: 10, max: 20, step: 3 }), 10, 'min 这个端点被步长网格弄丢了');
});

test('slider · 步长网格锚在 min 上：10/13/16/19，不是 0 的倍数 12/15/18', () => {
  eq(sliderAt(0.3, { min: 10, max: 20, step: 3 }), 13, '这一步不在用户设的刻度上');
  const seen = new Set();
  for (let i = 0; i <= 100; i += 1) seen.add(sliderAt(i / 100, { min: 10, max: 20, step: 3 }));
  const off = [...seen].filter((v) => Math.abs((v - 10) / 3 - Math.round((v - 10) / 3)) > 1e-9);
  ok(off.length === 0, `出现了不在 min + k·step 网格上的值：${JSON.stringify(off)}`);
});

test('slider · 拖到最右边不许越过 max', () => {
  // 20 不是 (10,20,3) 的网格点，最后一个可达网格点是 19 —— 只要求「不越过 max 且落在网格上」
  eq(sliderAt(1, { min: 10, max: 20, step: 3 }), 19, '右端越界或没对齐');
  ok(sliderAt(1.5, { min: 10, max: 20, step: 3 }) <= 20, '超出轨道的触摸位置把值拖过了 max');
});

test('slider · 精度按 step 的小数位取：step=0.1 不许出现浮点尾巴', () => {
  for (let i = 0; i <= 10; i += 1) {
    const v = sliderAt(i / 10, { min: 0, max: 1, step: 0.1 });
    const digits = String(v).split('.')[1] || '';
    ok(digits.length <= 1, `step=0.1 却输出了 ${v}（浮点尾巴没被收掉）`);
    ok(Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, `${v} 不是 0.1 的整数倍`);
  }
});

test('slider · step=0.001 的刻度不许被抹平（旧实现写死 2 位，0.123 变成 0.12）', () => {
  eq(sliderAt(0.1234, { min: 0, max: 1, step: 0.001 }), 0.123, '细步长被精度写死吃掉了');
  eq(sliderAt(0.5, { min: 0, max: 1, step: 0.001 }), 0.5, '中位刻度算错');
});

test('slider · 非 10 的整数次幂步长（0.25）也对齐', () => {
  for (let i = 0; i <= 8; i += 1) {
    const v = sliderAt(i / 8, { min: 0, max: 1, step: 0.25 });
    ok(Math.abs(v / 0.25 - Math.round(v / 0.25)) < 1e-9, `${v} 不是 0.25 的整数倍`);
  }
});

test('slider · 负 min 的网格同样以 min 为锚', () => {
  eq(sliderAt(0, { min: -5, max: 5, step: 2 }), -5, '负区间最左端拿不到 min');
  // 0 恰好落在 -1 与 1 之间：(-5,5,2) 的网格是 -5,-3,-1,1,3,5，中位取哪一个都合法，
  // 这里按实现的实测值写（Math.round(2.5) === 3）。
  eq(sliderAt(0.5, { min: -5, max: 5, step: 2 }), 1, '负区间中位算错');
});

test('slider · trackHeight / barHeight 的 rpx 兜底', () => {
  const vm = mount(SLIDER, { barHeight: 8 });
  eq(vm.trackHeight, '8rpx', '数字型的 barHeight 没被当成 rpx');
  const vm2 = mount(SLIDER, { barHeight: '12px' });
  eq(vm2.trackHeight, '12px', '带单位的 barHeight 被改写了');
});

test('slider · 非法 step（0 / 负数）退化成 1，而不是算出 Infinity 或 NaN', () => {
  const v = sliderAt(0.37, { min: 0, max: 10, step: 0 });
  ok(Number.isFinite(v), `step=0 算出了 ${v}`);
  ok(Math.abs(v - Math.round(v)) < 1e-9, `step=0 时输出 ${v} 不是整数`);
});

test('slider · min===max 时 percent 是 0，不做除零', () => {
  const vm = mount(SLIDER, { min: 5, max: 5, modelValue: 5 });
  eq(vm.percent, 0, 'min===max 时百分比没有兜底');
});

// ── vui-time-picker：min/max 必须先收成组件自己的精度再比 ──

const timePick = (props, hh, mm, ss) => {
  const vm = mount(TIME, Object.assign({ showSeconds: false }, props));
  ok(typeof vm.onChange === 'function', 'vui-time-picker 上没有 onChange —— 被测入口不见了');
  const v = [vm.hours.indexOf(pad2(hh)), vm.minutes.indexOf(pad2(mm))];
  if (vm.showSeconds) v.push(vm.seconds.indexOf(pad2(ss || 0)));
  vm.onChange({ detail: { value: v } });
  return vm.lastPayload('update:modelValue');
};

test('time · 不显示秒时，max 写成 HH:mm:ss 不许把输出变成带秒', () => {
  // 旧实现：next="09:31" > max="09:30:00" → clamp 成 "09:30:00"（一个不显示秒的组件输出带秒）
  eq(timePick({ max: '09:30:00' }, 9, 31), '09:30', '越界 clamp 把秒带进来了');
});

test('time · 不显示秒时，min 的秒要进位（输出必须仍 ≥ min）', () => {
  // min="09:00:30" → 组件最小可表示的时刻是 09:01（09:00 比 min 还早）
  eq(timePick({ min: '09:00:30' }, 8, 0), '09:01', 'clamp 结果早于 min —— prop 契约被违反');
});

test('time · 不显示秒且 min 已到当日最后一分钟：退化为 23:59，不许绕回 00:00', () => {
  eq(timePick({ min: '23:59:30' }, 0, 0), '23:59', '进位绕回了 00:00（比 min 还早）');
});

test('time · 显示秒时，min/max 写成 HH:mm 也要补齐到 HH:mm:ss', () => {
  eq(timePick({ showSeconds: true, min: '09:00', max: '18:00' }, 19, 0, 0), '18:00:00', 'clamp 没补秒');
  eq(timePick({ showSeconds: true, min: '09:00', max: '18:00' }, 10, 20, 30), '10:20:30', '区间内被改写');
});

test('time · 输出精度恒等于组件精度（showSeconds 决定长度）', () => {
  const cases = [
    [{ min: '09:00', max: '18:00' }, 10, 0, 0, 5],
    [{ min: '09:00:30', max: '18:00:30' }, 10, 0, 0, 5],
    [{ showSeconds: true, min: '09:00', max: '18:00' }, 10, 0, 0, 8],
    [{ showSeconds: true, min: '09:00:00', max: '18:00:00' }, 19, 30, 0, 8],
  ];
  for (const [props, hh, mm, ss, len] of cases) {
    const out = timePick(props, hh, mm, ss);
    eq(String(out).length, len, `${JSON.stringify(props)} 的输出 ${out} 精度不对`);
  }
});

test('time · 区间内的值原样通过（不许顺手改格式）', () => {
  eq(timePick({ min: '09:00', max: '18:00' }, 12, 34), '12:34', '区间内的正常选择被改写');
  eq(timePick({ showSeconds: true, min: '09:00:00', max: '18:00:00' }, 12, 34, 56), '12:34:56', '带秒的正常选择被改写');
});

// ── vui-pagination：current 的上界也要收 ──

test('pagination · 页码大于总页数时收窄（否则一页都不高亮）', () => {
  const vm = mount(PAGINATION, { total: 100, pageSize: 10, modelValue: 99 });
  eq(vm.pageCount, 10, '总页数算错');
  eq(vm.current, 10, '越界的当前页码没有被收窄 —— 界面上不会有任何一页高亮');
  ok(vm.pages.indexOf(vm.current) >= 0, `pages=${JSON.stringify(vm.pages)} 里找不到当前页`);
  ok(vm.itemStyle(vm.current) !== '', '当前页没有拿到高亮样式');
});

test('pagination · 下界仍然收窄到 1（0 / 负数）', () => {
  eq(mount(PAGINATION, { total: 100, modelValue: 0 }).current, 1, '0 页没被收窄');
  eq(mount(PAGINATION, { total: 100, modelValue: -3 }).current, 1, '负数页没被收窄');
});

test('pagination · 总条数为 0 时是 1 页而不是 0 页', () => {
  const vm = mount(PAGINATION, { total: 0, modelValue: 1 });
  eq(vm.pageCount, 1, '0 条数据时页数为 0 —— 分页器会渲染成空');
  eq(vm.current, 1);
});

test('pagination · update() 把目标页码夹在 [1, pageCount]', () => {
  eq(mount(PAGINATION, { total: 95, pageSize: 10, modelValue: 1 }).pageCount, 10, '向上取整算错（95/10 应为 10 页）');
  // 两次都单开一份实例：`update()` 里有 `if (target === this.current) return;`，
  // 复用同一个 vm 时第二次会被这条提前返回挡住，读到的还是上一次的事件（第一版就栽在这）。
  const hi = mount(PAGINATION, { total: 95, pageSize: 10, modelValue: 1 });
  hi.update(999);
  eq(hi.lastPayload('update:modelValue'), 10, '超出上界没被夹住');
  const lo = mount(PAGINATION, { total: 95, pageSize: 10, modelValue: 5 });
  lo.update(0);
  eq(lo.lastPayload('update:modelValue'), 1, '低于下界没被夹住');
});

test('pagination · 页码不变时不发事件（宿主不会收到多余的 change）', () => {
  const vm = mount(PAGINATION, { total: 100, pageSize: 10, modelValue: 3 });
  vm.update(3);
  eq(vm.__events.length, 0, '点当前页也发了事件');
});

test('pagination · pagerCount 非法值退化成 5，不会把页面列表算空', () => {
  const vm = mount(PAGINATION, { total: 100, pageSize: 10, modelValue: 5, pagerCount: 0 });
  ok(vm.pages.length > 0, 'pagerCount=0 时页面列表是空的');
  ok(vm.pages.indexOf(5) >= 0, `当前页不在列表里：${JSON.stringify(vm.pages)}`);
});

test('pagination · modelValue 传字符串（很多宿主会这么绑）也能算', () => {
  const vm = mount(PAGINATION, { total: 100, pageSize: 10, modelValue: '4' });
  eq(vm.current, 4, "字符串 '4' 没被当成第 4 页");
});

test('pagination · 页面列表：页数够少时全列，够多时首尾都在', () => {
  const few = mount(PAGINATION, { total: 30, pageSize: 10 });
  eq(JSON.stringify(few.pages), JSON.stringify([1, 2, 3]), '页数少时不该出现省略号');
  const many = mount(PAGINATION, { total: 100, pageSize: 10, modelValue: 5, pagerCount: 5 });
  ok(many.pages[0] === 1 && many.pages[many.pages.length - 1] === 10, '首尾页被省略掉了');
  ok(many.pages.indexOf('...') >= 0, '中间省略号不见了（页数明明很多）');
});

test('pagination · 点省略号不触发任何事件', () => {
  const vm = mount(PAGINATION, { total: 100, pageSize: 10, modelValue: 5 });
  vm.onJump('...');
  eq(vm.__events.length, 0, '点省略号也发了事件 —— 宿主会收到一个假页码');
});

// ── vui-upload：预览列表与「被点的那一项」必须按同一套下标对齐 ──
//
// 这一组是第 26 轮加的。原实现把「全量列表」与「过滤掉空 url 之后的列表」当成两个
// 数组各按下标取 —— 只要有一个条目拿不到 url，`.filter()` 就把后面的下标整体前移：
// 点第 3 张会打开别的图（或越界退回第一张），**且不报错**。上面那些静态检查一条都
// 看不见（语法对、产物一致、props 登记齐全），只有真的把方法跑起来才看得见。

/** 要打桩的 `uni` API（`withUni` 逐个装上并记录入参）。 */
const UNI_API = ['previewImage', 'chooseImage', 'uploadFile'];

/** 装一份假的 `uni`，把三个 API 的入参记下来；跑完无论如何都还原。 */
function withUni(fn) {
  const calls = { previewImage: [], chooseImage: [], uploadFile: [] };
  const saved = global.uni;
  global.uni = {};
  for (const api of UNI_API) {
    global.uni[api] = (o) => {
      calls[api].push(o);
      // uploadFile 的返回值得能被 `.onProgressUpdate` 探测，否则组件里那句
      // `typeof task.onProgressUpdate === 'function'` 会抛在 undefined 上
      return api === 'uploadFile' ? {} : undefined;
    };
  }
  try {
    fn(calls);
  } finally {
    global.uni = saved;
  }
  return calls;
}

test('upload · 预览时「被点的那一张」按原始下标对齐（中间有空 url 也不许错位）', () => {
  const list = [{ url: 'a.png' }, { url: '' }, { url: 'c.png' }];
  const calls = withUni(() => mount(UPLOAD, { modelValue: list }).onPreview(2));
  eq(calls.previewImage.length, 1, '没有调用 previewImage');
  const arg = calls.previewImage[0];
  eq(JSON.stringify(arg.urls), JSON.stringify(['a.png', 'c.png']), '空 url 没被筛掉');
  eq(arg.current, 'c.png', '点第 3 张却打开的不是它 —— 过滤后的下标与原始下标错位了');
});

test('upload · 预览第一张时也不受中间空 url 影响', () => {
  const list = [{ url: 'a.png' }, { url: '' }, { url: 'c.png' }];
  const calls = withUni(() => mount(UPLOAD, { modelValue: list }).onPreview(0));
  eq(calls.previewImage[0].current, 'a.png', '第一张对不上');
});

test('upload · 点的那一张自己就没有 url 时，退回第一张（刻意的兜底，不是错位）', () => {
  const list = [{ url: 'a.png' }, { url: '' }, { url: 'c.png' }];
  const calls = withUni(() => mount(UPLOAD, { modelValue: list }).onPreview(1));
  eq(calls.previewImage[0].current, 'a.png', '无 url 的那一项没有被兜底');
});

test('upload · 全都没有 url 时不弹预览（而不是弹一个空列表）', () => {
  const calls = withUni(() => mount(UPLOAD, { modelValue: [{ url: '' }, { path: '' }] }).onPreview(0));
  eq(calls.previewImage.length, 0, '空的 url 列表也调了 previewImage');
});

test('upload · preview=false 时一次都不弹', () => {
  const calls = withUni(() =>
    mount(UPLOAD, { preview: false, modelValue: [{ url: 'a.png' }] }).onPreview(0)
  );
  eq(calls.previewImage.length, 0, 'preview=false 没被遵守');
});

test('upload · fileUrl 的兜底顺序是 url → path → 空串', () => {
  const vm = mount(UPLOAD, {});
  eq(vm.fileUrl({ url: 'u', path: 'p' }), 'u', '有 url 时不该用 path');
  eq(vm.fileUrl({ path: 'p' }), 'p', '没有 url 时没退回 path');
  eq(vm.fileUrl({}), '', '两者都没有时应当是空串（调用方靠它判空）');
});

test('upload · onRemove(i) 删掉的是第 i 项，且发的是 update:modelValue + change 两份', () => {
  const vm = mount(UPLOAD, { modelValue: [{ url: 'a' }, { url: 'b' }, { url: 'c' }] });
  vm.onRemove(1);
  const next = vm.lastPayload('update:modelValue');
  eq(JSON.stringify(next.map((f) => f.url)), JSON.stringify(['a', 'c']), '删错了一项');
  const change = vm.lastPayload('change');
  eq(JSON.stringify(next), JSON.stringify(change), 'change 与 update:modelValue 的载荷不一致');
});

test('upload · 已满时不再弹选择器（max 到了就不该让用户白选一次）', () => {
  const full = withUni(() => mount(UPLOAD, { max: 2, modelValue: [{ url: 'a' }, { url: 'b' }] }).onChoose());
  eq(full.chooseImage.length, 0, '已经到 max 了还弹了选择器');
  const room = withUni(() => mount(UPLOAD, { max: 5, modelValue: [{ url: 'a' }] }).onChoose());
  eq(room.chooseImage[0].count, 4, '剩余可选数量算错');
});

test('upload · 单次可选数量取 min(剩余, count)：count 比剩余大时听剩余的', () => {
  // 夹紧的方向要挑对：`count` 必须**大于**剩余，否则 min() 两边相等，这条断言不具判别力
  // （第一版用的 max=9/count=2，注入「不再夹紧」照样绿 —— 被负向验证当场抓出）。
  const calls = withUni(() =>
    mount(UPLOAD, { max: 3, count: 9, modelValue: [{ url: 'a' }] }).onChoose()
  );
  eq(calls.chooseImage[0].count, 2, 'count 比剩余大时应当听剩余的（否则一次就能选爆 max）');
});

// ── 收尾：条数下限 + 加载器自证 ──

if (passed + failures.length < FLOOR) {
  failures.push({
    name: '断言条数下限',
    error: `只跑了 ${passed + failures.length} 条断言（下限 ${FLOOR}）—— 枚举/加载器塌了，这次「通过」不可信`,
  });
}

// 加载器自证：每个被测组件必须都能加载出对应入口，否则上面的「通过」可能是在空集上绿的。
// 遍历的是 `SUBJECTS`（唯一登记处），并配一条**反向对账** —— 只遍历登记表时，
// 「表里少了一条」只会让循环少跑一圈、静默通过（V6 注入实测红 0 条）。
test('自证 · 每个登记组件的被测入口都真的加载出来了', () => {
  const names = Object.keys(SUBJECTS);
  ok(names.length >= 4, `SUBJECTS 只有 ${names.length} 条 —— 登记表塌了`);
  for (const [rel, method] of Object.entries(SUBJECTS)) {
    const vm = mount(rel, {});
    ok(typeof vm[method] === 'function', `${rel} 上找不到 ${method}`);
  }
});

test('自证 · 声明了组件路径就必须登记进 SUBJECTS（反向对账，防「少列一个」静默通过）', () => {
  // 从本文件**现算**路径常量，而不是再抄一份清单
  const self = fs.readFileSync(__filename, 'utf8');
  const declared = [...self.matchAll(/^const ([A-Z][A-Z0-9_]*) = '(uni_modules\/[^']+)';$/gm)].map((m) => ({
    name: m[1],
    rel: m[2]
  }));
  ok(declared.length >= 4, `只解析出 ${declared.length} 条路径常量 —— 解析面塌了，这条对账会变成空话`);
  const missing = declared.filter((d) => !(d.rel in SUBJECTS)).map((d) => d.name);
  eq(JSON.stringify(missing), '[]', `这些组件声明了路径却没进 SUBJECTS，加载器自证漏掉了它们：${missing.join(', ')}`);
  const ghost = Object.keys(SUBJECTS).filter((rel) => !declared.some((d) => d.rel === rel));
  eq(JSON.stringify(ghost), '[]', `SUBJECTS 里有指向不存在常量的条目：${ghost.join(', ')}`);
});

console.log(`\n[vui-uniapp] check:logic —— ${passed} / ${passed + failures.length} 条通过`);
if (failures.length) {
  console.log(`\n${failures.length} 条未通过：`);
  failures.forEach((f) => console.log(`  x ${f.name}\n    ${f.error}`));
  console.log('');
  process.exit(1);
}
console.log('');
