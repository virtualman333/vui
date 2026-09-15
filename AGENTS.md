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

---

## 八、校验链

发布前必须全部通过：

```bash
npm run check            # 结构 / 路径规范 / 类型覆盖 / 模板作用域
npm run check:template   # 仅模板作用域（可单独排查）
npm run pack             # 核对实际打包内容与体积
```

- `check-sfc` 类语法校验：用 `@vue/compiler-sfc` + `sass` 对全部 `.vue` 做
  parse / 编译 script / 编译 template / SCSS 编译。
- 类型声明：`tsc --noEmit`（需自建 `vue` 模块 stub，`moduleResolution` 用 `bundler`）。
- 入口语法：把 `index.js` 复制为 `.mjs` 后 `node --check`。

环境里没有 HBuilderX 时无法真机/H5 实跑，因此**必须**用上述静态校验替代，并在提交信息里说明未做实跑验证。

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
5. `npm run check` + `npm run check:template` 全部通过
6. `npm run release -- minor`（会重新生成产物、升版本、打 tag、推送、发布）
