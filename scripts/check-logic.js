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
 * 第 27 轮再补三个（vui-steps / vui-count-to / vui-progress），三处是同一族：
 * **宿主传进来的入参没有先收敛就直接用**。
 *
 *   4. **vui-steps 的 `modelValue` 直接参与比较**：宿主绑字符串（`'1'` —— v-model 挂在
 *      data 上、或 index 从接口来，很常见）时 `index === modelValue` 恒 false →
 *      **没有任何一步是当前态**；而 `index < modelValue` 靠隐式转换照旧成立 →
 *      前面打勾、当前步被跳过。越界（99）与负数（-3）同样没有当前态，全都不报错。
 *      这与 vui-pagination 第 24 轮修掉的是**同一个形状**（宿主把索引绑成字符串）。
 *   5. **vui-count-to 的 `decimals` 没收敛**：`toFixed(d)` 对 `d > 100` **抛 RangeError**，
 *      而它是在 `display` 计算属性里调的 —— 直接让整个组件渲染崩掉（页面白屏，报错还挂在
 *      Vue 的计算属性栈上）。同一个 `format()` 里的千分位用的是**字符串式 replace**，
 *      分隔符含 `$&` 时会被当成替换模式：实测 `separator="$&"` 输出 `"1234567"`，
 *      千分位静默消失。
 *   6. **vui-progress 的 `format` 只替换第一个占位符**：`replace('{value}', …)` 不是全局
 *      替换，`format="{value}%（{value} 项）"` 会把第二个 `{value}` 原样吐给用户。
 *
 * 第 29 轮接进 `vui-region-picker`（四个层级）。它此前挂了两轮，卡点是加载器接不住
 * JSON import（`import city from './data/city.json'` 在 `new Function` 里是 ESM 语法）。
 * 加载器补上「默认导入 + JSON」之后当场跑出四件事：
 *
 *   7. **`level=4`（省市区镇）是文档承诺、代码里没有落点**：`case 4:` 空的，
 *      `lists` 停在 `[[],[],[]]` → picker 三列全空；而 `town.json`（2980 个街道）
 *      一直在包里、`docs/API.md` 也一直写着「4：省市区镇」。
 *   8. **宿主导参不收敛就取 `.id`**（第 4 次同族）：`:value="[2]"`、`:value="[]"`、
 *      越界 `[99,0,0]` 三种写法都会在 `created` 里抛 TypeError（整页白屏）。
 *   9. `OnColumnchange` 里 `this.value[col] = idx` **就地改写宿主数组**（静默改父状态）。
 *  10. 显示文本那段表达式在模板里按 level 各写一遍（三处）。
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
const STEPS = 'uni_modules/vui-steps/components/vui-steps/vui-steps.vue';
const COUNT = 'uni_modules/vui-count-to/components/vui-count-to/vui-count-to.vue';
const PROGRESS = 'uni_modules/vui-progress/components/vui-progress/vui-progress.vue';
const TABS = 'uni_modules/vui-tabs/components/vui-tabs/vui-tabs.vue';
const TYPING = 'uni_modules/vui-typing/components/vui-typing/vui-typing.vue';
const REGION = 'uni_modules/vui-region-picker/components/vui-region-picker/vui-region-picker.vue';

/**
 * 被测组件：`路径 → 入口`。**这里是唯一登记处** —— 加载器自证直接遍历它。
 *
 * 入口写法：方法名（`typeof vm[x] === 'function'`）；`computed:xxx` 表示该组件没有方法，
 * 入口是一个计算属性（vui-progress 全是 computed，连一个 method 都没有）。
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
	[UPLOAD]: 'onPreview',
	[STEPS]: 'isCurrent',
	[COUNT]: 'format',
	[PROGRESS]: 'computed:text',
	[TABS]: 'computed:currentIndex',
	[TYPING]: 'computed:targetText',
	[REGION]: 'getData'
};

/**
 * 断言条数下限：低于它说明加载器/枚举塌了，而不是「缺陷变少了」。
 * 现网实测 78 条（登记 10 个组件，第 29 轮把 vui-region-picker 接进来后从 67 → 78；
 * 这里的计数发生在「条数下限」与两条自证之前，别把自证算进来）；留 8 条余量，
 * 只挡住「整片没跑」级别的塌陷。
 */
const FLOOR = 70;

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
 *
 * 为什么额外支持 **JSON 默认导入**（第 29 轮加）
 * -------------------------------------------
 * `vui-region-picker` 用 `import city from './data/city.json'` 带四张数据表
 * （省 / 市 / 区 / 街道，共 3361 条），`new Function` 求值时这是 ESM 语法，直接
 * SyntaxError —— 于是「想测它」这件事被一句加载器报错拦住挂了整轮。现在把 JSON
 * 默认导入就地内联成 `__json('<相对路径>')`，由读盘时解析（这样数据表**不进**本文件）。
 *
 * **接不住的导入一律抛错，不静默跳过**（本文件的总原则）：报错要说出是哪个 import，
 * 而不是让组件「加载不出来」变成一条看不懂的 TypeError。
 */
function loadOptions(rel) {
  const raw = fs.readFileSync(path.join(root, rel), 'utf8');
  const { descriptor, errors } = parse(raw);
  if (errors && errors.length) throw new Error(`${rel} SFC 解析失败：${errors[0].message}`);
  const script = descriptor.script ? descriptor.script.content : '';
  if (!script) throw new Error(`${rel} 里没有 <script> 块`);
  // 允许整块缩进（vui-region-picker 的 `<script>` 内容就是制表符缩进的）
  if (!/^[ \t]*export default\b/m.test(script)) throw new Error(`${rel} 的 <script> 里没有 export default`);
  let code = script.replace(/^[ \t]*export default\b/m, 'module.exports =');
  code = code.replace(
    /^[ \t]*import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+(['"])(.+?)\2[ \t]*;?[ \t]*$/gm,
    (_m, name, _q, spec) => `const ${name} = __json(${JSON.stringify(spec)});`
  );
  const left = code.match(/^[ \t]*import\b.*$/m);
  if (left) {
    throw new Error(
      `${rel} 还有接不住的 import：${left[0].trim()} —— 加载器只支持「默认导入 + JSON 数据表」`
    );
  }
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', '__json', code)(mod, mod.exports, (spec) =>
    JSON.parse(fs.readFileSync(path.resolve(path.dirname(path.join(root, rel)), spec), 'utf8'))
  );
  if (!mod.exports || typeof mod.exports !== 'object') throw new Error(`${rel} 没导出组件选项对象`);
  return mod.exports;
}

/**
 * 最小实例。顺序有讲究：
 *   methods → props → data() → computed（getter） → overrides
 * ① methods 要在 `data()` 之前 —— 组件的 `data()` 会调 `this.someMethod()`
 *    （vui-calendar 的 `data()` 就调了 `this.parseDate`）。
 * ② overrides 放最后，才能盖住 props 与 data 两处的默认值（`rect` 是 data）。
 * ③ `runCreated`（第 29 轮加，默认 false 保持既有调用点不变）：`vui-region-picker` 的
 *    初始化在 `created()` 里（`this.getData()`），那是它的**主路径**，不跑就等于没测。
 *    默认关掉是因为别的组件 `created` 里是副作用，跑来只会把日志弄脏。
 */
function mount(rel, overrides, runCreated) {
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
  if (runCreated && typeof options.created === 'function') options.created.call(vm);
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

// ── vui-steps：宿主传进来的 modelValue 必须先收敛成整数索引 ──
//
// 这一组是第 27 轮加的。宿主把索引绑成字符串是很常见的事（v-model 挂在 data 上、
// index 从接口来），而旧实现里 `isCurrent(index)` 用的是 `===`：
// `'1' === 1` 为假 → **一步都不高亮**，同时 `'1' > 0` 为真 → 第 0 步照样打勾，
// 界面上看起来「当前步被跳过」。越界与负数同样没有当前态，且全都不报错。

const stepsVm = (modelValue, items) =>
	mount(STEPS, { items: items || [{ title: 'A' }, { title: 'B' }, { title: 'C' }], modelValue });

test('steps · 每一步恰好处于「完成 / 当前 / 待办」三者之一（不许一步都不高亮）', () => {
  const vm = stepsVm(1);
  const states = [0, 1, 2].map((i) => (vm.isCurrent(i) ? 'current' : vm.isFinish(i) ? 'finish' : 'todo'));
  eq(JSON.stringify(states), JSON.stringify(['finish', 'current', 'todo']), '正常索引的三种状态不对');
  eq(states.filter((s) => s === 'current').length, 1, '当前态不是恰好一个');
});

test('steps · modelValue 传字符串（宿主常这么绑）也要能定位当前步', () => {
  const vm = stepsVm('1');
  eq(vm.currentIndex, 1, "字符串 '1' 没被当成第 2 步");
  eq(vm.isCurrent(1), true, '当前步没有高亮 —— 旧实现里 `index === modelValue` 恒 false');
  eq(vm.isFinish(0), true, '第一步应当已完成');
  eq(vm.isFinish(1), false, '当前步不该被算成已完成');
});

test('steps · 越界收窄到「全部完成」，负数收窄到第一步', () => {
  eq(stepsVm(99).currentIndex, 3, '越界的 modelValue 没有收窄（列表 3 步时上界是 3 = 全部完成）');
  eq(stepsVm(3).currentIndex, 3, '「已走完」是合法状态，不该被收窄成 2');
  const neg = stepsVm(-3);
  eq(neg.currentIndex, 0, '负数没被收窄到第一步');
  eq(neg.isCurrent(0), true, '负值时没有任何一步是当前态');
});

test('steps · 非数值（undefined / NaN / 字符串）都不许算出 NaN 索引', () => {
  for (const mv of [undefined, null, NaN, 'abc']) {
    const vm = stepsVm(mv);
    ok(Number.isFinite(vm.currentIndex), `modelValue=${String(mv)} 算出了 ${vm.currentIndex}`);
    eq(vm.currentIndex, 0, `modelValue=${String(mv)} 应退化成第一步`);
  }
});

test('steps · 空列表时索引是 0 而不是 NaN', () => {
  eq(stepsVm(0, []).currentIndex, 0, '空列表的 currentIndex 不是 0');
});

test('steps · items 传字符串数组时也能正常编号', () => {
  const vm = stepsVm(1, ['甲', '乙', '丙']);
  eq(vm.list.length, 3, '字符串数组没被规整成 {title}');
  eq(vm.dotText(0), '✓', '已完成的圆点应当打勾');
  eq(vm.dotText(1), '2', '当前步的圆点应当是序号');
});

test('steps · onClick 发的是原始下标（update:modelValue + change 两份）', () => {
  const vm = stepsVm(0);
  vm.onClick(2);
  eq(vm.lastPayload('update:modelValue'), 2, 'update:modelValue 的载荷不对');
  eq(vm.lastPayload('change'), 2, 'change 的载荷不对');
  eq(vm.__events.length, 2, '事件条数不对（应当恰好两份）');
});

// ── vui-count-to：decimals 与 separator 的入参收敛 ──
//
// 第 27 轮加的。`format()` 是 `display` 计算属性唯一的依赖，它抛错 = 组件渲染崩。

const countVm = (props) => mount(COUNT, props);
/** `display` 读的是 `current`（动画当前值），格式化断言要把它显式钉住，否则量到的是 start。 */
const countAt = (value, props) => {
  const vm = countVm(props);
  vm.current = value;
  return vm.display;
};

test('count-to · decimals 超过 100 不许抛错（toFixed 对 >100 会抛 RangeError）', () => {
  for (const d of [101, 1000, -5, 2.5, NaN, 'x', undefined]) {
    let out;
    try {
      // 走 display 而不是直接调 format：抛错真正发生的地方就是这条计算属性链
      out = countAt(1234.5678, { start: 0, end: 1.5, decimals: d });
    } catch (e) {
      throw new Error(`decimals=${String(d)} 让 display 抛错（${e.name}: ${e.message}）—— 组件会白屏`);
    }
    ok(typeof out === 'string' && out.length > 0, `decimals=${String(d)} 的输出不是字符串：${out}`);
  }
});

test('count-to · decimals 的正常值不受收敛影响', () => {
  eq(countAt(1234.5678, { decimals: 2 }), '1234.57', '两位小数算错');
  eq(countAt(3.14159, { decimals: 3 }), '3.142', '三位小数算错');
  eq(countAt(7.9, { decimals: 0 }), '8', '零位小数应当四舍五入');
  eq(countAt(5, { decimals: -1 }), '5', '负数小数位应收成 0');
  eq(countAt(5, { decimals: 2.5 }), '5.00', '小数位本身要先取整');
});

test('count-to · 千分位：普通分隔符与 $& 这类替换模式都必须是字面量', () => {
  eq(countAt(1234567, { decimals: 0, separator: ',' }), '1,234,567', '逗号千分位不对');
  eq(countAt(1234567, { decimals: 0, separator: ' ' }), '1 234 567', '空格千分位不对');
  // 旧实现用字符串式 replace，`$&` 被当成「插入匹配到的文本」→ 分隔符全部消失（静默）
  const dollar = countAt(1234567, { decimals: 0, separator: '$&' });
  ok(dollar.indexOf('$&') >= 0, `separator="$&" 被当成替换模式了：实际输出 ${JSON.stringify(dollar)}`);
  const dollar2 = countAt(1234567, { decimals: 0, separator: '$1' });
  ok(dollar2.indexOf('$1') >= 0, `separator="$1" 被当成替换模式了：实际输出 ${JSON.stringify(dollar2)}`);
});

test('count-to · 负数的负号不参与分组，且分隔符照样生效', () => {
  eq(countAt(-1234567, { decimals: 0, separator: ',' }), '-1,234,567', '负号被算进了分组');
  eq(countAt(-0.5, { decimals: 1 }), '-0.5', '负小数算错');
});

test('count-to · 小数位与千分位同时开启时的拼接', () => {
  eq(countAt(1234567.891, { decimals: 2, separator: ',' }), '1,234,567.89', '整数位分组 + 小数位不对');
  eq(countAt(999.999, { decimals: 2, separator: ',' }), '1,000.00', '进位之后的分组不对');
});

test('count-to · prefix / suffix 与 display 的拼接顺序', () => {
  eq(countAt(1234, { decimals: 0, separator: ',', prefix: '¥', suffix: ' USDT' }), '¥1,234 USDT', '前后缀没拼在正确的位置');
});

test('count-to · end 为 0 / 非数值时不抛错，且 duration=0 时直接落在终值', () => {
  const vm = countVm({ start: 5, end: 0, duration: 0 });
  eq(vm.current, 0, 'duration=0 没有直接跳到终值');
  const bad = countVm({ start: 0, end: NaN, duration: 0 });
  eq(bad.current, 0, 'end 非数值时没有兜底成 0');
});

// ── vui-progress：format 占位符必须全部替换 ──

test('progress · format 里的多个 {value} 全部替换（不是只换第一个）', () => {
  const vm = mount(PROGRESS, { percentage: 40, format: '{value}%（{value} 项）' });
  eq(vm.text, '40%（40 项）', '有多余的 {value} 没被替换 —— 旧实现用的是非全局 replace');
});

test('progress · format 无占位符时原样输出，含 $ 时不被当成替换模式', () => {
  eq(mount(PROGRESS, { percentage: 40, format: '加载中' }).text, '加载中', '无占位符的 format 被改写');
  eq(mount(PROGRESS, { percentage: 40, format: '$& {value}' }).text, '$& 40', '$& 被当成替换模式了');
});

test('progress · 不传 format 时是「整数百分比」', () => {
  eq(mount(PROGRESS, { percentage: 40 }).text, '40%', '默认文案不对');
  eq(mount(PROGRESS, { percentage: 33.3 }).text, '33.3%', '小数百分比被抹掉了');
});

test('progress · percentage 越界收窄到 [0,100]，非数值退化成 0', () => {
  eq(mount(PROGRESS, { percentage: 140 }).percent, 100, '上界没收窄');
  eq(mount(PROGRESS, { percentage: -20 }).percent, 0, '下界没收窄');
  eq(mount(PROGRESS, { percentage: 'abc' }).percent, 0, '非数值没退化成 0');
  eq(mount(PROGRESS, { percentage: '60' }).percent, 60, "字符串 '60' 没被当成 60");
});

test('progress · barColor 的优先级：color prop > status > primary 兜底', () => {
  eq(mount(PROGRESS, { color: '#123456', status: 'error' }).barColor, '#123456', 'color 优先级不对');
  eq(mount(PROGRESS, { status: 'success' }).barColor, '#18bc37', 'status 没生效');
  eq(mount(PROGRESS, { status: 'nonsense' }).barColor, '#2979ff', '未知 status 没有兜底成 primary');
});

test('progress · strokeWidth 数字按 rpx，字符串原样', () => {
  eq(mount(PROGRESS, {}).barHeight, '12rpx', '数字型 strokeWidth 没被当成 rpx');
  eq(mount(PROGRESS, { strokeWidth: '6px' }).barHeight, '6px', '带单位的 strokeWidth 被改写了');
});

// ── vui-tabs：宿主传进来的索引必须先收敛 ──
//
// vui-tabs 与 vui-steps 是**同一个形状**（第 27 轮修的是 steps）。旧实现在五个地方
// 各拿 `this.modelValue` 直接比：模板里的 `index === modelValue`，以及
// itemStyle / textStyle / onChange / lineStyle 四处。宿主绑字符串索引时
// 下划线停在正确的标签下、却没有任何标签高亮 —— 不报错，也不缺东西。
// 这次除修组件，还把这类比较变成一条对账（见文件末尾「宿主入参收敛」）。

test('tabs · 宿主绑字符串索引时仍然有「当前标签」', () => {
  const vm = mount(TABS, { items: ['一', '二', '三'], modelValue: '1' });
  eq(vm.currentIndex, 1, "字符串 '1' 没被收敛成 1");
  ok(vm.textStyle(1) !== '', '当前标签没有激活色 —— `index !== this.modelValue` 恒真');
  eq(vm.textStyle(0), '', '非当前标签也拿到了激活色');
  ok(vm.lineStyle.indexOf('translateX(100%)') >= 0, '下划线位置不对：' + vm.lineStyle);
});

test('tabs · 卡片模式的当前项要填充底色（同样走收敛后的索引）', () => {
  const vm = mount(TABS, { items: ['一', '二', '三'], modelValue: '2', type: 'card' });
  ok(vm.itemStyle(2).indexOf('background-color') >= 0, '卡片当前项没有被填充');
  ok(vm.itemStyle(1).indexOf('background-color') < 0, '非当前项也被填充了');
  eq(mount(TABS, { items: ['a'], modelValue: '0', type: 'line' }).itemStyle(0),
    'flex:1;', 'line 模式不该给底色');
});

test('tabs · 越界 / 负数 / 小数 / 非数值都收成合法下标', () => {
  eq(mount(TABS, { items: ['a', 'b', 'c'], modelValue: 99 }).currentIndex, 2, '上界没收');
  eq(mount(TABS, { items: ['a', 'b', 'c'], modelValue: -3 }).currentIndex, 0, '下界没收');
  eq(mount(TABS, { items: ['a', 'b', 'c'], modelValue: 1.7 }).currentIndex, 1, '小数没取整');
  eq(mount(TABS, { items: ['a', 'b', 'c'], modelValue: 'abc' }).currentIndex, 0, '非数值没退化成 0');
  eq(mount(TABS, { items: [], modelValue: 3 }).currentIndex, 0, '空列表时下标越界了');
  const far = mount(TABS, { items: ['a', 'b', 'c'], modelValue: 99 });
  ok(far.lineStyle.indexOf('translateX(200%)') >= 0, '越界时下划线飞出了容器：' + far.lineStyle);
  ok(mount(TABS, { items: [], modelValue: 0 }).lineStyle.indexOf('width:100%') >= 0,
    '空列表的下划线宽度没有兜底成 100%');
  ok(mount(TABS, { items: ['a', 'b', 'c', 'd'] }).lineStyle.indexOf('width:25%') >= 0,
    '4 个标签的下划线宽度不是 25%');
});

test('tabs · 点当前标签不再重复 emit，点别的标签才切', () => {
  const vm = mount(TABS, { items: ['a', 'b', 'c'], modelValue: '1' });
  vm.onChange(1, { title: 'b' });
  eq(vm.pickEvent('update:modelValue').length, 0, "点当前标签又发了一次 update:modelValue（比较的是 '1' 与 1）");
  vm.onChange(2, { title: 'c' });
  eq(vm.lastPayload('update:modelValue'), 2, '点别的标签没切过去');
  eq(vm.pickEvent('change').length, 1, 'change 事件的条数不对');
});

test('tabs · 禁用标签点了不切', () => {
  const vm = mount(TABS, { items: [{ title: 'a' }, { title: 'b', disabled: true }], modelValue: 0 });
  vm.onChange(1, { title: 'b', disabled: true });
  eq(vm.pickEvent('change').length, 0, '禁用标签仍然发出了 change');
});

// ── vui-typing：「完整文本」只能有一个来源 ──
//
// 旧实现把它在三个地方各取一次、口径不同：`watch.text` 收敛成
// `typeof val === 'string' ? val : ''`，而 `play()` / `finishNow()` 用 `this.text || ''`。
// 宿主把非字符串绑进 `:text` 时两条路径理解不同 —— 一个字都不显示，却立刻抛 finish（空串）。

test('typing · 非字符串的 text 不再被静默丢掉', () => {
  eq(mount(TYPING, { text: 12345 }).targetText, '12345', '数字型 text 没被转成字符串');
  eq(mount(TYPING, { text: null }).targetText, '', 'null 应退化成空串');
  eq(mount(TYPING, { text: undefined }).targetText, '', 'undefined 应退化成空串');
  eq(mount(TYPING, { text: '' }).targetText, '', '空串仍是空串');
  eq(mount(TYPING, { text: '今年是 2026 年' }).targetText, '今年是 2026 年', '字符串被改写了');
});

test('typing · watch.text 认的是收敛后的完整文本，不是它自己的入参', () => {
  const vm = mount(TYPING, { text: 12345, shown: 'a', autoplay: false });
  loadOptions(TYPING).watch.text.handler.call(vm);
  eq(vm.shown, 'a', '把「文本变长了」误判成「变短了」，已输出的内容被清掉（旧实现 target 恒为空串）');
  const vm2 = mount(TYPING, { text: 'abcdefgh', shown: 'abcdefghijkl', autoplay: false });
  loadOptions(TYPING).watch.text.handler.call(vm2);
  eq(vm2.shown, '', '文本真的变短了却没有重置');
});

test('typing · text 传数字时 play() 不会以为「已经追上」而空转', () => {
  const vm = mount(TYPING, { text: 12345, shown: '12345', autoplay: false });
  vm.play();
  eq(vm.timer, null, 'play() 起了定时器却没内容可输出（旧实现拿 undefined 比 length，判据恒假）');
  eq(vm.lastPayload('finish'), '12345', 'finish 事件的参数不是完整文本');
});

// 只测 finishNow 这一条路径；play() 那条路径由上面「text 传数字时 play() 不会
// 以为已经追上」负责。名字按实际覆盖面写，别让标题替断言吹牛。
test('typing · finishNow 读的也是收敛后的完整文本', () => {
  const vm = mount(TYPING, { text: 12345, autoplay: false });
  vm.finishNow();
  eq(vm.shown, '12345', 'finishNow 用的还是未收敛的 this.text');
  eq(vm.lastPayload('finish'), '12345', 'finish 的载荷不对');
});

test('typing · speed 收敛成确定的间隔（NaN 不再交给 setInterval）', () => {
  eq(mount(TYPING, { speed: 'fast' }).tickMs, 40, '非数值 speed 没有兜底');
  eq(mount(TYPING, { speed: '60' }).tickMs, 60, "字符串 '60' 没被当成 60");
  eq(mount(TYPING, { speed: 0 }).tickMs, 8, '0 没有收到下限 8');
  eq(mount(TYPING, { speed: 5 }).tickMs, 8, '小于 8 的间隔没有收到下限');
  eq(mount(TYPING, { speed: 40 }).tickMs, 40, '正常值被改坏了');
});

// ── 宿主入参收敛：拿循环下标与宿主入参直接比的组件，必须先收敛 ──
//
// 这条规则的样本是 vui-steps（第 27 轮）与 vui-tabs（第 28 轮）：两者都拿
// `index === this.modelValue` 直接比，宿主绑字符串时**没有任何一项是当前态**。
// 第 27 轮只修了 steps 一个组件，第二次照样长出来 —— 所以这次把它变成一条对账。
//
// **判据的边界（如实写下来）**：只认「循环变量叫 `index`」并且「比的是
// `this.<组件自己的 prop>`」这两种形态。用到别的变量名（`i` / `page`）、或者比的
// 是计算属性而不是 prop 的地方**这条看不到** —— 它盯的是已经出现过两次的那个形状，
// 不是「所有入参都收敛了」。
const INDEX_COMPARE_RE = /(?:^|[^\w.])index\s*(?:===|!==|<=|>=|<|>)\s*this\.[A-Za-z_$][\w$]*|this\.[A-Za-z_$][\w$]*\s*(?:===|!==|<=|>=|<|>)\s*index(?![\w$])/;
const COERCION_RE = /Number\(\s*this\.|parseInt\(\s*this\./;

/** 把每个组件的 `<script>` 剥掉注释后取出来（读源码做判断前一律先剥） */
function componentScripts() {
  const dir = path.join(root, 'uni_modules');
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name, 'components', name, `${name}.vue`);
    if (!fs.existsSync(file)) continue;
    const { descriptor, errors } = parse(fs.readFileSync(file, 'utf8'));
    if (errors && errors.length) throw new Error(`${name} SFC 解析失败：${errors[0].message}`);
    if (!descriptor.script) continue;
    const code = descriptor.script.content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    out.push({ rel: name, code });
  }
  return out;
}

/** 扫描出来的「拿 index 与宿主入参直接比」的组件（宽扫） */
function indexComparers() {
  return componentScripts().filter((s) => INDEX_COMPARE_RE.test(s.code));
}

test('对账 · 拿 index 与宿主入参直接比的组件，脚本里必须能看到入参收敛', () => {
  const all = componentScripts();
  ok(all.length >= 40, `只扫到 ${all.length} 个组件的脚本 —— 扫描面塌了，下面的对账会变成空话`);
  const hits = all.filter((s) => INDEX_COMPARE_RE.test(s.code));
  ok(hits.length >= 2, `只扫到 ${hits.length} 个组件 —— vui-steps 与 vui-tabs 至少两个，判据没在看真东西`);
  const names = hits.map((h) => h.rel);
  ok(names.some((n) => n.indexOf('vui-steps') >= 0), 'vui-steps 不在扫描结果里（已知它就是这么写的）');
  const without = hits.filter((h) => !COERCION_RE.test(h.code)).map((h) => h.rel);
  eq(JSON.stringify(without), '[]',
    `这些组件拿 index 与宿主入参直接比，却全文件没有一处数值收敛：${without.join('、')}`
    + ' —— 宿主绑字符串索引时不会有任何一项是当前态');
});

test('对账 · 判据自证：合成的「没收敛」源码必须被判出来，收敛写法必须放行', () => {
  const bad = 'isCurrent(index) { return index === this.modelValue; }';
  ok(INDEX_COMPARE_RE.test(bad), '合成样本没被认成「直接比」—— 宽扫恒假');
  eq(COERCION_RE.test(bad), false, '合成样本被判成「已收敛」—— 判据恒真');
  const good = 'const i = Number(this.modelValue); return index === i;';
  eq(COERCION_RE.test(good), true, '收敛写法没被认出来');
  eq(INDEX_COMPARE_RE.test(good), false,
    '收敛后的写法仍被认成「直接比」—— 判据过宽，宽扫会把已经修好的组件也算进「没收敛」名单');
});

test('对账 · 模板里也不许拿 index 直接与 prop 比（vui-tabs 的第五处就在这里）', () => {
  // 一个组件的 prop 名单从组件自己**现算**，不手抄
  const propsOf = (rel) => Object.keys(loadOptions(rel).props || {});
  const templateIndexCompares = (rel, template) => {
    const props = propsOf(rel);
    return props.filter((name) =>
      new RegExp(`(?:^|[^\\w.])index\\s*(?:===|!==|<=|>=|<|>)\\s*${name}(?![\\w$])`).test(template)
    );
  };
  const tabs = fs.readFileSync(path.join(root, TABS), 'utf8');
  const tmpl = tabs.slice(0, tabs.indexOf('</template>'));
  eq(JSON.stringify(templateIndexCompares(TABS, tmpl)), '[]',
    'vui-tabs 的模板里又出现了 `index === modelValue` —— 它绕过了脚本侧的收敛（旧的 is-active 就是这一处）');
  ok(tmpl.indexOf('index === currentIndex') >= 0, '模板里的 is-active 没有走 currentIndex');
  // 判据自证：把模板那段换回旧写法，必须报出来
  const old = tmpl.replace("index === currentIndex", "index === modelValue");
  eq(JSON.stringify(templateIndexCompares(TABS, old)), JSON.stringify(['modelValue']),
    '判据抓不到旧写法 —— 这条对账是空话');
});

// ── vui-region-picker：四个层级（省 / 省市 / 省市区 / 省市区镇） ──────────────
//
// 这个组件整整两轮没能进这份检查，卡点是「加载器接不住 JSON import」—— 本轮把加载器
// 补上（见 loadOptions 的注释），顺手把它的四层联动真跑起来，因为读代码看不出下面这些：
//
//   ① `level=4`（省市区镇）从第 1 天起就写在 JSDoc 与 `docs/API.md` 里，`town.json`
//      （2980 个街道）也一直在包里，而代码里 `case 4:` 是**空的** —— 实测 `lists` 停在
//      `[[],[],[]]`，picker 三列全空、一个字都显示不出来。
//   ② 同一族的另一条老路：宿主导参不收敛就取 `.id`。`:value="[2]"`（只想指定省）、
//      `:value="[]"`、下标越界 `[99,0,0]` 三种写法都会**在 created 里抛 TypeError**
//      —— 那是整页白屏，报错还挂在组件的生命周期栈上。
//   ③ 列滚动时 `this.value[col] = idx` 直接就地改写宿主传进来的数组：父组件的状态被
//      改了，却没有任何 emit 通知它（静默改父状态，第 3 轮修过的同一个形状）。
//   ④ 显示文本那段表达式在模板里按 level 各写一遍（三处），加第 4 层就地漏一处。
//
// 判据一律锚在**真实数据**上（北京市/市辖区/东城区/东华门街道这种从头就能手算的链路），
// 不用「非空」这种恒真的话。

const region = (props) => mount(REGION, props, true);

test('region-picker · level 1/2/3 的列数与旧实现一致（不回归）', () => {
  eq(region({ level: 1 }).lists.length, 1, 'level=1 应该是 1 列');
  eq(region({ level: 2 }).lists.length, 2, 'level=2 应该是 2 列');
  const three = region({ level: 3 });
  eq(three.lists.length, 3, 'level=3 应该是 3 列');
  eq(three.lists[0].length, 31, '省这一列应该是 31 个');
  eq(three.displayText, '北京市-市辖区-东城区', '三级联动的显示文本不对');
});

test('region-picker · level=4 真的产出第 4 列（文档承诺的「省市区镇」有落点）', () => {
  const vm = region({ level: 4 });
  eq(vm.lists.length, 4, `level=4 只给了 ${vm.lists.length} 列 —— 文档承诺的「省市区镇」没有落点`);
  eq(vm.lists[3].length, 17, '第 4 列（街道）不是东城区的 17 个街道 —— town.json 没被接进来');
  eq(vm.displayText, '北京市-市辖区-东城区-东华门街道', '四级联动的显示文本不对');
});

test('region-picker · 换省之后下面三级跟着换，且都回到第一项', () => {
  // ⚠ 起点必须让**下级列非零**：[2,1,1,1] = 河北省-唐山市-路南区-友谊街道（真实数据里
  //   三级下标 1 都成立）。从全 0 出发时，「归零」与「不归零」算出来完全一样 ——
  //   断言会恒真。负向验证实测过：把 `kept[c] = 0` 改成 `kept[c] = kept[c]`，旧写法照样绿，
  //   缺陷就这么留在代码里（这才是「不会响的检查」的典型形状）。
  const vm = region({ level: 4, value: [2, 1, 1, 1] });
  eq(vm.sel.join(','), '2,1,1,1', '起点这条链路在真实数据里不存在 —— 测试前提不成立，先修这条');
  vm.OnColumnchange({ detail: { column: 0, value: 10 } }); // 浙江省
  eq(vm.sel[0], 10, '第一列没有跟着滚');
  eq(vm.sel.slice(1).join(','), '0,0,0', '换省后下面三级没有回到第一项');
  eq(vm.lists[1].length, 11, '浙江省的市数量不对（11 个地级市）');
  ok(vm.displayText.indexOf('浙江省-杭州市') === 0, `显示文本没跟着换：${vm.displayText}`);
});

test('region-picker · 换市之后区/镇跟着换（起点同样要让下级非零）', () => {
  // 石家庄市有 25 个区 —— 不归零时下标 1 仍然合法，所以这条断言对「归零」是**真的有判据**的
  const vm = region({ level: 4, value: [2, 1, 1, 1] }); // 河北省-唐山市-路南区-友谊街道
  vm.OnColumnchange({ detail: { column: 1, value: 0 } }); // 换到石家庄市
  eq(vm.sel.slice(0, 2).join(','), '2,0', '省 / 市没有跟着滚');
  eq(vm.sel[0], 2, '换市不该动到省（只有下级该归零）');
  eq(vm.sel.slice(2).join(','), '0,0', '换市后「区」「镇」没有回到第一项');
  ok(vm.displayText.indexOf('河北省-石家庄市') === 0, `显示文本没跟着换：${vm.displayText}`);
});

test('region-picker · 宿主传短数组不再白屏（旧实现在 created 里抛 TypeError）', () => {
  // 三种都是正常写法：只想指定省、绑定还没加载完的空数组、少给一级
  const short = region({ value: [2] });
  eq(short.sel[0], 2, 'value=[2] 时第一列没有选中 2');
  eq(short.lists[1].length, 11, 'value=[2]（河北省）时市那一列不对');
  eq(region({ value: [] }).sel.join(','), '0,0,0', 'value=[] 时下标没有全部退回 0');
  // 河北省（第 3 个省）的第二个市 —— 同一个 `[省, 市]` 写法在「北京」那种只有一个市辖区
  // 的省上会夹回 0，所以期望值必须挑一条省市数都够的链路来写
  eq(region({ value: [2, 1] }).sel.join(','), '2,1,0', 'value=[2,1] 时第三列没有退回 0');
});

test('region-picker · 越界下标被夹回 0，不 deref undefined', () => {
  // ⚠ 边界必须含「刚好等于长度」那一格（`[31, 0, 0]` 的 31 = 省数、`[0, 1, 0]` 的 1 = 北京市的市数）。
  //   只测 99 这种「远在天边」的值时，把上界从 `n < rows.length` 放宽成 `n <= rows.length`
  //   照样绿 —— 负向验证实测：那一格才是真正会 deref undefined 的位置。
  for (const v of [[99, 0, 0], [0, 99, 0], [0, 0, 99], [-1, 0, 0], [31, 0, 0], [0, 1, 0]]) {
    const vm = region({ value: v });
    eq(vm.sel.join(','), '0,0,0', `value=${JSON.stringify(v)} 的越界下标没有被夹回`);
  }
  eq(region({ value: [99, 99, 99] }).displayText, '北京市-市辖区-东城区', '越界时的显示文本不对');
});

test('region-picker · 不再就地改写宿主传进来的数组', () => {
  const host = [0, 0, 0];
  const vm = mount(REGION, { value: host }, true);
  vm.OnColumnchange({ detail: { column: 0, value: 3 } }); // 山西省
  eq(host.join(','), '0,0,0', '宿主的数组被就地改写了 —— 这是静默改父组件状态');
  ok(vm.displayText.indexOf('山西省') === 0, `选中项没跟着换：${vm.displayText}`);
});

test('region-picker · 选中项变化会发 update:value（宿主不必去读被改写过的 prop）', () => {
  const vm = region({});
  vm.OnColumnchange({ detail: { column: 0, value: 1 } }); // 天津市
  const payload = vm.lastPayload('update:value');
  ok(Array.isArray(payload), 'update:value 没发出数组');
  eq(payload.join(','), '1,0,0', 'update:value 的载荷不对');
  vm.onChange({ detail: { value: [1, 0, 0] } });
  eq(vm.lastPayload('update:value').join(','), '1,0,0', '确认时没有带上同一份选中项');
  eq(vm.pickEvent('change').length, 1, 'change 事件没有发出');
});

test('region-picker · level 传字符串 / 非法值一律收敛，不再产出空列', () => {
  eq(region({ level: '4' }).lists.length, 4, "level='4' 应当被收敛成 4");
  eq(region({ level: 9 }).lists.length, 3, '越界的 level 应当退回默认 3');
  eq(region({ level: 0 }).lists.length, 3, 'level=0 应当退回默认 3');
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
  ok(names.length >= 7, `SUBJECTS 只有 ${names.length} 条 —— 登记表塌了`);
  for (const [rel, entry] of Object.entries(SUBJECTS)) {
    const vm = mount(rel, {});
    // 入口两种形态：方法（函数）、计算属性（`computed:x` —— 给连一个 method 都没有的组件，
    // 例如 vui-progress 只有 computed）。
    const isComputed = entry.indexOf('computed:') === 0;
    const key = isComputed ? entry.slice('computed:'.length) : entry;
    if (isComputed) {
      ok(key in vm, `${rel} 上找不到计算属性 ${key}`);
      ok(vm[key] !== undefined, `${rel} 的计算属性 ${key} 求值是 undefined`);
    } else {
      ok(typeof vm[key] === 'function', `${rel} 上找不到方法 ${key}`);
    }
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
