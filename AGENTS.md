# AGENTS.md — 本仓库的协作规则

面向在本仓库中工作的 AI 编码助手（以及任何自动化工具）。
**这里的规则是硬性约束，不是建议。违反其中任何一条的改动都不应被提交。**

---

## 一、最高优先级规则：有更新就必须发版

> **任何一次面向用户的代码/文档变更，都必须在同一次改动里完成：提升版本号 → 发布到 npm。**
> 不允许出现「代码已改、版本没动」或「版本已升、包没发」的状态。

执行方式（一条命令走完全流程）：

```bash
npm run release -- minor    # 新增组件 / 新增 props、事件、插槽
npm run release -- patch    # 修 bug / 样式调整 / 文档更新
npm run release -- major    # 删除或重命名 props / 改变默认行为
```

`npm run release` 会自动完成：校验 → 重新生成产物 → 提升版本号 → 提交并打 tag → 推送 → 发布 → 回查 registry。

**不要**手工只改 `package.json` 的 version、也不要手工执行裸的 `npm publish` —— 会跳过校验与产物生成，导致包内容与源码脱节。

版本级别判定：

| 变更内容 | 级别 |
| --- | --- |
| 新增组件、新增 props / 事件 / 插槽 | minor |
| 修复 bug、样式调整、文档更新 | patch |
| 删除或重命名 props、改变默认行为 | major |

---

## 二、红线（禁止事项）

1. **禁止手工编辑自动生成的产物**：`index.js`、`types/index.d.ts`、`docs/API.md`、`README.md`。
   它们全部由脚本生成，手改会在下次生成时被覆盖。改组件后跑 `npm run gen` 重新生成。
2. **禁止把 `.npmrc` 提交进仓库**。它含 npm token 明文，`.gitignore` 已忽略，提交前用 `git check-ignore -v .npmrc` 确认。
3. **禁止破坏组件目录结构**（见第三节），否则用户的 easycom 配置会静默失效。
4. **禁止在 `<template>` 中引用模块级常量/函数**（见第六节）。
5. **禁止跳过校验直接发布**：`prepublishOnly` 钩子失败即中止，不要用 `--no-verify` 之类手段绕过。
6. **禁止用 `v-html` 渲染内容**：小程序端不支持，必须用结构化节点渲染。

**红线由检查执行，不靠记性**：发布前 `npm run check:all` 会拦住其中可自动判定的几条 ——
§2.1 → `check:gen`（`CATEGORY` 白名单本身的不变量由 `check:category` 负责）、§2.2 与 §2.6 → `check:rules`、§2.3 → `prepublish-check`、§2.4 → `check:template`
（§2.5 由 `prepublishOnly` 钩子本身保证）。

---

## 三、组件目录规范（必须严格一致）

```
uni_modules/vui-xxx/
├── package.json          # uni_modules 元信息
├── readme.md             # 组件文档
├── changelog.md          # 变更记录
└── components/
    └── vui-xxx/
        └── vui-xxx.vue   # 组件实现
```

**目录名必须与组件名完全一致**，原因是 easycom 通配规则：

```json
"^vui-(.*)": "vui-uniapp/uni_modules/vui-$1/components/vui-$1/vui-$1.vue"
```

只要出现 `uni_modules/vui-form/components/vui-form-item/` 这种「子组件塞在父组件目录里」的写法，
用户配好 easycom 后 `<vui-form-item>` 就**用不了**。`scripts/prepublish-check.js` 会拦截这种情况。

**同名 `.vue` 这一条也在拦截范围内**：`vui-xxx.vue` 写成了别的名字（例如 `index.vue`）时，
easycom 同样找不到入口，组件等于不在包里。组件集合的唯一来源是 `scripts/lib/components.js`，
它的枚举**不会因为文件缺失就把这个组件从集合里去掉** —— 那种「静默丢弃」会让所有检查同时变绿，
`npm run check:components` 专门盯着这条（在副本里注入坏结构，要求必须拦下）。

组合组件（如 form + form-item）用 `provide/inject` 通信，它是运行时机制，与目录层次无关。

---

## 四、组件写法约定

- **Vue 3 选项式 API**，`<script>`（不用 `<script setup>`）——产物生成脚本依赖显式的 `props: {}` 定义。
- **`v-model` 一律用 `modelValue` / `update:modelValue`**。
  不要用 Vue 2 的 `model: { prop: 'value', event: 'input' }`，它在 Vue 3 下完全失效。
- **首块 JSDoc 必须存在**，且是 `<script>` 中第一个 `/** */` 块：

  ```js
  /**
   * AI 对话消息气泡
   * @description 一句话说明适用场景
   * @property {String} content 消息文本内容
   * @event {Function} click 点击时触发
   */
  ```

  首个非 `@` 行会作为组件描述，`@property` / `@event` 会生成到 `types/index.d.ts` 与 `docs/API.md`。
- **显式声明 `emits`**，避免自定义事件与原生事件双触发。
- 组件内**不允许 import 其他 uni_modules 的组件**（npm 安装后路径不稳定），需要复用就写进组件自身。

本节可自动判定的五条 —— 「不得 `<script setup>`」「v-model 必须 `modelValue`」「用了 `$emit` 必须声明 `emits`」
「首块 JSDoc 必须存在」「不得 import 其它 uni_modules 组件」—— 由 `npm run check:rules` 执行（已并入 `check:all`）。

---

## 五、主题变量（换肤能力的基础）

uni-app 会把项目根 `uni.scss` 自动注入到**每个**组件样式的编译上下文，且顺序在前。
因此组件内用 `!default` 声明兜底值，用户在 `uni.scss` 里重新赋值即可全局覆盖。

每个组件的 `<style lang="scss">` 顶部必须包含主题变量兜底块。新增组件后跑一次：

```bash
python scripts/inject-theme.py     # 幂等，已注入的会自动跳过
```

要求：

- 样式块内的颜色**只能引用 `$vui-*` 变量**，不得硬编码色值。
- `rgba(0,0,0,.x)` 的遮罩与阴影**保持中性、不变量化**——那是视觉层次，不是主题色。
- 脚本/内联样式里的颜色 SCSS 变量够不着，抽成组件内 `const VUI_COLOR = {...}` 语义常量，
  但**该常量不得在 `<template>` 中直接使用**（见下节）。

以上三条由 `npm run check:theme` 强制执行（已并入 `check:all`）。首次建立该检查时已存在的
硬编码色值登记在 `scripts/check-theme.js` 的 `BASELINE` 里，**只减不增**：改好一处就要删掉
对应条目，留着会报「条目已失效」。

---

## 六、Vue 3 模板作用域陷阱（踩过，务必遵守）

**Vue 3 模板只能访问 props / data / computed / methods / inject。**

- 引用模块级 `const VUI_COLOR = {...}` → 运行时 `VUI_COLOR is not defined`。
  正解：改成 prop 默认值（顺带可配置）或 computed 中转。
- 引用根本不存在的名字 → 渲染为 `undefined`，或报
  `Property xxx was accessed during render but is not defined`。

`@vue/compiler-sfc` 只校验语法，**查不出这两类问题**。所以本仓库有专门的静态检查：

```bash
npm run check:template
```

它只做一件事：模板里用到的标识符，在整个 `<script>` 中不存在 → 报错；模块级常量被模板引用 → 报错。
该检查已并入 `prepublish-check`，发布前会自动拦截。

---

## 七、发布凭证

`npm publish` 需要**带 Bypass 2FA** 的 npm token，否则报 `EOTP`。把 token 写入项目级 `.npmrc`：

```
//registry.npmjs.org/:_authToken=<你的 token>
```

三点务必注意：

1. token **必须以 `npm_` 开头**。其他前缀（如 `hqg_`、`ghp_`）不是 npm token，会 401。
2. **不要写进用户级 `~/.npmrc`**——那会影响用户所有 npm 鉴权操作。
3. `publish` 报 `E404 ... is not in this registry` **不等于包名有问题**。
   npm 在鉴权失败时故意返回 404 而非 403，避免泄露包是否存在。排查顺序应为：
   `token 前缀 → npm whoami → publish 的真实错误码（EOTP / E404）`。
4. **`publish` 成功时 registry 返回 `202 Accepted`，不是 `201`**，且 CLI 会提示
   `Your package is being processed and may take a few minutes to become available`。
   这意味着版本**异步落库**：刚发完立刻访问
   `https://registry.npmjs.org/vui-uniapp/<版本>` 或 `npm view` 很可能仍是 **404**，
   `dist-tags.latest` 也还指向上一个版本。**这是正常的，不要因此重复发布**
   （重发会撞「版本号已存在」）。用 `curl` 轮询版本端点直到 200 再下结论，
   实测通常需要几分钟。`scripts/release.js` 的第 7 步已内置轮询。

---

## 八、校验链

发布前必须全部通过。**清单的唯一来源是 `npm run check:all`**——`release.js` 第 1 步、生成后复校、以及 `prepublishOnly` 都调它，不要再在别处手写一份清单（两处写法必然漂移）。

```bash
npm run check:all   # 全部跑（发布链用的就是这条）
npm run check:pack  # 想看用户实际拿到什么时单独跑（check:all 已含）
```

`check:all` 的组成（各自也可单独排查）：

| 命令 | 查什么 |
|------|--------|
| `npm run check` | 结构 / 路径规范 / 类型覆盖 / 模板作用域（`prepublish-check.js`，内含 ⑦） |
| `npm run check:sfc` | 用 `@vue/compiler-sfc` + `sass` 对全部 `.vue` 做 parse / 编译 script / 编译 template / SCSS 编译 |
| `npm run check:entry` | 把 `index.js` 复制为 `.mjs` 后 `node --check`（入口语法 + 是否有 default 导出） |
| `npm run check:types` | `tsc --noEmit` 检查 `types/index.d.ts`（自建 `vue` 模块 stub，`moduleResolution: bundler`；`skipLibCheck` 必须为 false，否则等于没查） |
| `npm run check:gen` | 在临时副本里重新跑生成器，与已提交产物逐文件比对（白名单一致性见下一条） |
| `npm run check:pack` | 取 `npm pack --dry-run --json` 的**真实**打包清单：必需文件是否都在、48 个组件的四件套是否齐全、演示页/脚本/工程文件是否误入包、体积是否超标 |
| `npm run check:theme` | 扫描全部组件的 `<style lang="scss">`：硬编码色值（第五节禁止）、缺主题兜底块、以及基线白名单是否失效 |
| `npm run check:rules` | 执行第二节红线与第四节写法约定里可静态判定的几条：`v-html`、`<script setup>`、Vue2 的 `model:` 选项、跨 uni_modules import、用了 `$emit` 却没声明 `emits`、缺首块 JSDoc、`.npmrc` 是否被 git 跟踪或被忽略 |
| `npm run check:release` | `release.js` 第 0 步发布前置检查的自检：注入假环境跑一遍四类拦截（凭证不可用 / registry 已有该版本 / 本地 tag 已存在 / `.npmrc` 未被忽略），外加三条结构锁（`preflight` 必须在任何写入之前被调用、旧的「只看 `.npmrc` 文件是否存在」判据不得复活） |
| `npm run check:template` | 仅模板作用域（`check:all` 已含，留作单独排查） |
| `npm run check:components` | 组件枚举与结构检查的自检：在仓库副本里注入「`.vue` 名字写错」「缺 `components/` 目录」两种坏结构，`prepublish-check` 必须拦下并点名；外加两条结构锁（组件枚举只有一份、组件数 == `.vue` 数） |
| `npm run check:markdown` | vui-markdown 解析器的**行为测试**（唯一一条真的执行组件代码的检查）：用 `@vue/compiler-sfc` 取出 `<script>` 求值出组件选项，逐个断言表格识别 / 列数补齐 / 对齐标记 / `\|` 转义 / 普通文本不得被误判 / 围栏优先级，外加「模板里的表格必须在 `scroll-view scroll-x` 里」的结构锁 |
| `npm run check:category` | `gen-docs.py` 的 `CATEGORY` 白名单不变量：每个组件**恰好登记一次**（同一分类内写两遍、或跨分类重复，一律失败）、与 `uni_modules/` 双向覆盖、id 命名规范、解析失败即失败；解析器在 `scripts/lib/category.js`（与 `check-gen` 共用同一份） |

- 入口 / 类型声明这两条尤其重要：`index.js` 与 `types/index.d.ts` 都是**发布时由 `scripts/gen-package.py` 重新生成**的，生成脚本出问题时，`check` 的覆盖性校验照样全绿（组件都在），但使用方 import 本包会直接编译报错。
- `check:gen` 补的是上面几条共同的盲区：它们查的都是「产物**自身**是否合法」，没有一条查「产物是否还**反映源码**」。改了组件没跑 `npm run gen` 时，旧产物照样合法；而新组件漏登记 `CATEGORY` 时，重新生成的结果与已提交产物**完全一致**（都缺它），只有组件集合比对能发现 —— 这两种情况都真实发生过。
- `check:category` 补的是**同一份文档里两句话互相矛盾**这类盲区。原来那条白名单检查写在 `check:gen` 里，用 `new Set` 去重，于是**丢掉了「登记了几次」**：实测把 `vui-button` 再加进「媒体组件」（它本来就在「基础组件」里），结果是 README 的 hero 行仍写「48 个开箱即用的组件」、而组件总览表里 `<vui-button>` 出现 **2 行**；docs/API.md 里出现 **2 个 `### vui-button` 小节与 2 条同名锚点**（第二个链接永远跳到第一个）；分类归属也随之二义。而 `check:gen` 照样打印「组件目录与生成器白名单双向一致（48 个组件）」并 exit 0。现在白名单的全部不变量归 `check:category` 一处（解析器与 `check-gen` 共用 `scripts/lib/category.js`，不再各解析一遍），并带两类反向自检（同一分类内重复 / 跨分类重复），证明「恰好登记一次」这条断言不是恒真的。
- `check:pack` 补的是另一层盲区：上面所有检查查的都是**仓库里的文件**，而用户 `npm i` 拿到的是 **tarball**。`files` 字段少写一项（漏 `types/`）时产物全部合法、前面几条全绿，使用方的 TS 却直接找不到声明；`files` 被写成宽匹配时演示页与开发脚本一起进包。这一条是链上唯一盯着「用户真正装到手里的东西」的检查。
- `check:theme` 盯的是**换肤能力**这条产品底线（第五节）：颜色一旦硬编码，组件就永久脱离主题层，换肤时它不变，而且**没有任何报错**。这条规则此前只写在文档里、没人执行 —— 一次手工「统一主题变量」之后，仍有 13 处硬编码散在 8 个组件里（其中 `#f2f3f5` 在 5 个组件里各复制了一遍，而主题层早就定义了同名变量）。该检查同时校验「每个组件都有主题兜底块」，漏跑 `inject-theme.py` 的新组件会被拦下。
- `check:rules` 补齐的是**「写在文档里、没人执行」**那一类规则：第二节 6 条红线里此前只有 4 条有检查，第四节 5 条写法约定一条都没有。它们违反时的共同点是**不会有任何报错**：`v-html` 让组件在小程序端整块不渲染（那边只是空白）、Vue2 的 `model` 选项让 `v-model` 完全失效、缺 `emits` 让事件触发两次、`.npmrc` 进仓库等于把 npm token 明文公开。该脚本的所有文本判定都**先剥注释再扫**（`vui-markdown` 的 JSDoc 里写着「不使用 v-html」、`vui-form` 有一个名为 `model` 的 prop——直接 grep 会把这两个最守规矩的地方报成违规），并且输出「扫描面自证」一行（script / template 块各取到几个、多少组件用到 `$emit`、多少组件 JSDoc 齐备），避免哪天解析失灵导致规则**在空集上全绿**。

`check:all` 全部是静态校验，**不依赖 HBuilderX**。本机已装 HBuilderX（`D:\Program Files\HBuilderX`，可直接复用它自带的 node + vite 构建 H5 产物做浏览器实跑），但校验链必须能在没装的机器上跑，所以不把它接进 `check:all`；由于至今**没有任何一轮做过 H5 / 真机实跑**，改组件后仍必须在提交信息里说明未做实跑验证。

`check:release` 补的是**发布链自身**的盲区：`check:all` 里的其余八条都在看「要发出去的东西对不对」，没有一条看「这台机器现在发不发得出去」。而 `release.js` 的第 3~5 步（改版本号 → commit + tag → push）**不可回退**，tag 一推版本号就被占住。此前第 0 步只判断 `.npmrc` 文件**存不存在**——「文件存在」与「凭证可用」是两件事，一个只写了 registry 换源配置的 `~/.npmrc` 就能骗过它，于是脚本走完 bump → commit → tag → push 才倒在 `npm publish`，留下第一节明令禁止的「版本已升、包没发」，而且下次再跑会跳到下一个版本号。第 0 步因此改为实探（`npm whoami` + 目标版本是否已被 registry 占用 + 本地 tag 是否已存在），改法见 `scripts/release-preflight.js`，自检见 `scripts/check-release.js`。自检里的用案例「只有 registry 配置的 `~/.npmrc`」就是为这个漏洞写的：它必须红。

`check:components` 补的是**枚举自身**的盲区：`check:all` 里其余脚本都要先回答「有哪些组件」，而这个答案此前在 6 个脚本里各算了一遍、语义有三种（只看目录名 / 目录名 + 同名 `.vue` / 所有 `.vue` 文件）。其中「目录名 + 同名 `.vue`」那种写法（`prepublish-check` 与 `check-sfc` 都用过）**会把结构坏掉的组件从集合里静默丢弃**：实测在副本里放一个 `components/vui-probe/index.vue`（名字写错），`prepublish-check` 照样打印「校验通过，可以发布」，而它自己下一行还打印着「模板已查: 49 个组件」——两个数字互相矛盾却没人管；后果就是第三节那条红灯变成绿灯。现在枚举收敛到 `scripts/lib/components.js`（`listComponents()` 永不静默丢弃），`check:components` 用子进程真跑一遍来证明它确实还拦得住，并锁死「枚举只有一份」。
- `check:markdown` 补的是**另一类盲区：没人跑过组件的代码**。上面所有检查看的都是「文件长什么样」——语法、主题变量、产物一致性、tarball 清单、组件枚举——它们可以全绿，而组件渲染出来的东西是错的。vui-markdown 的解析器是纯函数（不碰 DOM、不碰 `uni`、不需要渲染），恰恰最好测，却从建立起一次都没被执行过：它把 Markdown 表格整段吞成普通段落，用户看到的是满屏 `| 模型 | 分数 |` 原文，而十道检查全部通过。表格是模型输出里最常见的一种结构。该脚本用 `@vue/compiler-sfc` 取 `<script>` 块求值出组件选项（不手写正则切字符串——正文里出现 `</script>` 之类就会骗过手写解析器），再组装最小 `this` 直接调 `computed.blocks`；并对「表格必须渲染在 `scroll-view scroll-x` 里」上结构锁——窄屏上宽表撑破整页是移动端最难查的一类故障。同一类缺口后来又在**行内链接 / 图片**上出现了一次（`[文本](地址)` 也被原样吐给用户，链接是模型输出里仅次于表格的常见结构），所以该脚本现在同时覆盖这两组，并带一条**计数不变量**：模板里渲染片段的位置数与挂点击入口的位置数必须相等（只断言「出现过点击入口」是不够的——挂一处也算出现过）。

---

## 九、分阶段提交

大改造过程中**每完成一个阶段就 commit + push**。

真实事故：一次会话中工作目录被意外清空（只剩 1 个文件，连 `.git` 都没了），全部未提交改动丢失，
只能从远端 clone 后重跑脚本重建。**把远端当作唯一可靠的备份点**，并把生成脚本纳入仓库
（`scripts/`），它们是灾难恢复时的重建依据。

---

## 十、新增组件的完整清单

1. 建目录 `uni_modules/vui-xxx/components/vui-xxx/vui-xxx.vue`（含 package.json / readme.md / changelog.md）
2. 写组件，遵守第四节（JSDoc、emits、modelValue、不跨模块 import）
3. `python scripts/inject-theme.py` 注入主题变量兜底块
4. 在 `scripts/gen-docs.py` 的 `CATEGORY` 中登记组件，否则不会出现在 README 与 API 文档里
5. `npm run check:all` 全部通过（校验链的唯一来源，见第八节）
6. `npm run release -- minor`（会重新生成产物、升版本、打 tag、推送、发布）
