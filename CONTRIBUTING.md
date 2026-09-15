# 贡献指南

感谢你对 Virtual UI (VUI) 的关注。本文档说明本仓库的协作流程。

> 如果你是 AI 编码助手，请阅读 [AGENTS.md](AGENTS.md)，那里有更完整的约束与踩坑清单。

---

## 核心规则

**本仓库不接受「只改代码不发版」的提交。**

任何面向用户的变更（新组件、新属性、修 bug、改样式、改文档）都必须在同一次改动里完成
**提升版本号 + 发布到 npm** 两件事。不允许出现「代码已改、版本没动」或「版本已升、包没发」的状态。

---

## 提交流程

### 1. Fork 与分支

```bash
git clone https://github.com/virtualman333/vui.git
cd vui
git checkout -b feature/your-feature
```

### 2. 修改代码

新增组件请严格遵守目录结构（目录名必须与组件名一致，否则用户的 easycom 配置会失效）：

```
uni_modules/vui-xxx/
├── package.json
├── readme.md
├── changelog.md
└── components/vui-xxx/vui-xxx.vue
```

组件写法约定：

- Vue 3 选项式 API（`<script>`，不用 `<script setup>`）
- `v-model` 用 `modelValue` / `update:modelValue`
- `<script>` 首块 JSDoc 必填，`@property` / `@event` 会生成到类型声明与 API 文档
- 样式中的颜色一律引用 `$vui-*` 变量，不要硬编码
- 不要在模板里引用模块级常量（Vue 3 模板作用域访问不到）

### 3. 新增组件的额外步骤

```bash
# 注入主题变量兜底块（幂等）
python scripts/inject-theme.py
```

然后在 `scripts/gen-docs.py` 的 `CATEGORY` 里登记该组件，否则它不会出现在 README 与 API 文档中。

### 4. 本地校验

```bash
npm run check            # 结构 / 路径规范 / 类型覆盖 / 模板作用域
npm run check:template   # 仅模板作用域检查
npm run pack             # 核对打包内容与体积
```

三项都必须通过。

### 5. 发布

```bash
npm run release -- minor    # 新增组件、新增属性/事件/插槽
npm run release -- patch    # 修 bug、样式调整、文档更新
npm run release -- major    # 删除或重命名属性、改变默认行为
```

这条命令会自动完成：校验 → 重新生成产物 → 提升版本号 → 提交并打 tag → 推送 → 发布 → 回查 registry。

想先看看会发生什么，可以加 `--dry-run`（只校验和生成，不写入任何内容）：

```bash
npm run release -- minor --dry-run
```

### 6. 提交 Pull Request

推送分支后在 GitHub 上创建 PR，说明变更内容与版本级别。

---

## 发布凭证

`npm publish` 需要**带 Bypass 2FA** 的 npm token（普通 token 会报 `EOTP`）。
把 token 写入**项目级** `.npmrc`：

```
//registry.npmjs.org/:_authToken=<你的 token>
```

`.npmrc` 已在 `.gitignore` 中，不会被提交。token 格式必须以 `npm_` 开头。

---

## 不要手工编辑的文件

以下文件全部由脚本生成，手工修改会在下次生成时被覆盖：

| 文件 | 生成方式 |
| --- | --- |
| `index.js` | `python scripts/gen-package.py` |
| `types/index.d.ts` | `python scripts/gen-package.py` |
| `docs/API.md` | `python scripts/gen-docs.py` |
| `README.md` | `python scripts/gen-docs.py` |

改组件后跑 `npm run gen` 重新生成即可。

---

## 报告问题

- Bug / 功能建议：<https://github.com/virtualman333/vui/issues>
- 邮箱：virtualman@yeah.net
- 微信：virtualman2001
