# Virtual UI (VUI)

[![npm version](https://img.shields.io/npm/v/vui-uniapp.svg)](https://www.npmjs.com/package/vui-uniapp)
[![npm downloads](https://img.shields.io/npm/dm/vui-uniapp.svg)](https://www.npmjs.com/package/vui-uniapp)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![uni-app](https://img.shields.io/badge/uni--app-Vue3-41b883.svg)](https://uniapp.dcloud.net.cn/)
[![在线演示](https://img.shields.io/badge/demo-online-7166F0.svg)](https://virtualman333.github.io/vui/)

> 基于 uni-app 的 **Vue 3** 跨端组件库 —— 48 个开箱即用的组件，一套代码同时跑 iOS / Android / H5 / 微信小程序等各家小程序。

**在线演示**：[https://virtualman333.github.io/vui/](https://virtualman333.github.io/vui/) —— 含「组件总览」「AI 组件演示」「开发者测试」三个页面，桌面与手机浏览器直接打开即可，无需安装。

## 目录

- [特性](#特性)
- [环境要求](#环境要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [主题定制](#主题定制)
- [组件总览](#组件总览)
- [TypeScript 支持](#typescript-支持)
- [常见问题](#常见问题)
- [版本与发布](#版本与发布)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 特性

- **跨端一致**：iOS / Android / H5 / 各家小程序，一套代码多端运行
- **AI 场景就绪**：内置对话气泡、流式打字机、推理过程面板、Markdown 渲染、模型选择等 11 个 AI 组件
- **零配置引入**：基于 easycom，配好一次后无需 import，直接写标签
- **可换肤**：全部颜色收敛到 SCSS 变量，改一个 `$vui-primary` 即可全库换色
- **类型友好**：内置 TypeScript 声明，编辑器可提示 props 与事件
- **零第三方依赖**：不依赖任何 UI 框架，包体干净
- **独立成包**：每个组件是独立 uni_module，也可只用其中几个

## 环境要求

| 项 | 要求 |
| --- | --- |
| uni-app | Vue 3 版本（本项目不使用 Vue 2 语法） |
| HBuilderX | 3.1.0 及以上 |
| 或 CLI | `@dcloudio/uni-app` Vue3 模板项目 |

## 安装

### 方式一：npm 安装 + easycom（推荐）

```bash
npm install vui-uniapp --save
# 或
yarn add vui-uniapp
# 或
pnpm add vui-uniapp
```

安装后在项目的 `pages.json` 里加入 `easycom` 配置：

```json
{
  "easycom": {
    "autoscan": true,
    "custom": {
      "^vui-(.*)": "vui-uniapp/uni_modules/vui-$1/components/vui-$1/vui-$1.vue"
    }
  }
}
```

配置完成后 **不需要 import**，在任意页面直接使用：

```html
<template>
  <view class="page">
    <vui-button type="primary" @click="onClick">点我</vui-button>
    <vui-switch v-model="checked" />
  </view>
</template>

<script>
export default {
  data() {
    return { checked: true };
  },
  methods: {
    onClick() {
      console.log('clicked');
    }
  }
};
</script>
```

> **CLI 项目补充**：如果组件没有正常编译，在 `vite.config.js` 中把包排除出预构建：
> ```js
> export default defineConfig({
>   plugins: [uni()],
>   optimizeDeps: { exclude: ['vui-uniapp'] }
> });
> ```

### 方式二：全量注册（Vue3 插件）

不想配 easycom，也可以在入口一次性注册全部组件。

```js
// main.js
import { createSSRApp } from 'vue';
import App from './App.vue';
import VUI from 'vui-uniapp';

export function createApp() {
  const app = createSSRApp(App);
  app.use(VUI); // 一次性注册全部组件
  return { app };
}
```

注册后 `PascalCase` 与 `kebab-case` 两种写法都可用，即 `<VuiButton>` 和 `<vui-button>` 等价。

### 方式三：uni_modules 本地导入

不使用 npm 时，把仓库中的 `uni_modules` 目录整体拷贝到你的项目根目录（或从 HBuilderX 插件市场导入本库）。uni-app 会自动扫描 `uni_modules` 下的组件，**无需任何配置**，直接使用即可。

这种方式不会把包体积算进 npm 依赖，适合只想用其中几个组件的场景。

## 快速开始

下面是一个包含表单校验、弹窗、消息提示的完整页面示例：

```html
<template>
  <view class="page">
    <vui-card title="用户信息" shadow>
      <vui-form ref="formRef" :model="form" :rules="rules">
        <vui-form-item label="用户名" prop="username" required>
          <vui-input v-model="form.username" placeholder="请输入用户名" />
        </vui-form-item>
        <vui-form-item label="手机号" prop="mobile" required>
          <vui-input v-model="form.mobile" placeholder="请输入手机号" />
        </vui-form-item>
        <vui-form-item label="性别">
          <vui-radio-group>
            <vui-radio v-model="form.gender" label="男" :value="1" />
            <vui-radio v-model="form.gender" label="女" :value="2" />
          </vui-radio-group>
        </vui-form-item>
      </vui-form>

      <vui-button type="primary" @click="submit">提交</vui-button>
    </vui-card>

    <vui-message ref="message" />
    <vui-modal v-model="visible" title="提示" content="提交成功" />
  </view>
</template>

<script>
export default {
  data() {
    return {
      visible: false,
      form: { username: '', mobile: '', gender: 1 },
      rules: {
        username: [{ required: true, message: '请输入用户名' }],
        mobile: [
          { required: true, message: '请输入手机号' },
          { pattern: /^1\d{10}$/, message: '手机号格式不正确' }
        ]
      }
    };
  },
  methods: {
    async submit() {
      const ok = await this.$refs.formRef.validate();
      if (!ok) return;
      this.visible = true;
      this.$refs.message.show('提交成功', 'success');
    }
  }
};
</script>
```

## 主题定制

VUI 的所有颜色都收敛为 SCSS 变量，并且在每个组件内部都有 `!default` 兜底。
**你只需要在项目的 `uni.scss` 里重新赋值，即可全库生效**，不需要改任何组件文件。

uni-app 会把 `uni.scss` 自动注入到所有组件的样式编译上下文，因此无需 `@import`。

```scss
/* uni.scss —— 把这部分加到你的项目里，按需修改 */

/* 功能色（品牌主色建议改 $vui-primary） */
$vui-primary: #2979ff;
$vui-success: #18bc37;
$vui-warning: #f3a73f;
$vui-error: #e43d33;
$vui-info: #8f939c;
$vui-region-active-color: #f07b00;

/* 文字色 */
$vui-text-color: #333;
$vui-text-color-regular: #606266;
$vui-text-color-secondary: #909399;
$vui-text-color-placeholder: #c0c4cc;
$vui-text-color-inverse: #fff;

/* 边框色 */
$vui-border-color: #dcdfe6;
$vui-border-color-light: #ebeef5;
$vui-border-color-lighter: #e5e6eb;

/* 填充与背景色 */
$vui-bg-color: #fff;
$vui-bg-color-hover: #f2f3f5;
$vui-fill-color: #f1f1f1;
$vui-fill-color-light: #f5f7fa;
$vui-fill-color-lighter: #fafafa;
$vui-track-color: #ebedf0;
$vui-active-bg-color: #f5f9ff;
$vui-gray-color: #ccc;
$vui-white: #fff;
```

例如只想换品牌主色：

```scss
/* uni.scss */
$vui-primary: #7166f0;
```

保存后重新编译，所有组件的主色（按钮、单选、复选、加载、进度条、步骤条等）会统一变成你设置的颜色。

**说明**：遮罩层与阴影使用的半透明黑 `rgba(0,0,0,.x)` 属于视觉层次而非主题色，因此保持中性、不随主题色变化。

## 组件总览

共 **48** 个组件、**298** 个属性、**74** 个事件。
完整 API（属性 / 事件 / 插槽）见 [docs/API.md](docs/API.md)。

### 基础组件

| 组件 | 说明 | 引入方式 | 主要属性 |
| --- | --- | --- | --- |
| `<vui-button>` | 按钮 | easycom 自动 | `type` |
| `<vui-icon>` | 图标 | easycom 自动 | `name`, `char`, `size`, `color`, `spin` |
| `<vui-tag>` | 标签 | easycom 自动 | `type`, `size`, `disabled`, `inverted`, `circle` |
| `<vui-card>` | 卡片 | easycom 自动 | `title`, `extra`, `shadow`, `border`, `padding` |
| `<vui-image>` | 图片 | easycom 自动 | `src`, `mode`, `width`, `height`, `radius` |
| `<vui-header>` | 头部标题 | easycom 自动 | `title` |

### 表单组件

| 组件 | 说明 | 引入方式 | 主要属性 |
| --- | --- | --- | --- |
| `<vui-input>` | 输入框 | easycom 自动 | `modelValue`, `label`, `labelWidth`, `placeholder`, `type` |
| `<vui-radio>` | 单选框 | easycom 自动 | `modelValue`, `label`, `disabled`, `color`, `shape` |
| `<vui-checkbox>` | 复选框 | easycom 自动 | `modelValue`, `label`, `disabled`, `indeterminate`, `color` |
| `<vui-switch>` | 开关 | easycom 自动 | `modelValue`, `disabled`, `color` |
| `<vui-select>` | 下拉选择 | easycom 自动 | `modelValue`, `options`, `placeholder`, `disabled`, `clearable` |
| `<vui-form>` | 表单 | easycom 自动 | `model`, `rules`, `labelWidth`, `labelPosition` |
| `<vui-form-item>` | 表单项 | easycom 自动 | `label`, `prop`, `required` |
| `<vui-slider>` | 滑块 | easycom 自动 | `modelValue`, `min`, `max`, `step`, `disabled` |
| `<vui-upload>` | 上传 | easycom 自动 | `modelValue`, `action`, `max`, `count`, `deletable` |
| `<vui-region-picker>` | 城市选择器 | easycom 自动 | `value`, `level` |
| `<vui-date-picker>` | 日期选择器 | easycom 自动 | `modelValue`, `minDate`, `maxDate`, `disabled`, `height` |
| `<vui-time-picker>` | 时间选择器 | easycom 自动 | `modelValue`, `showSeconds`, `min`, `max`, `disabled` |

### 数据展示

| 组件 | 说明 | 引入方式 | 主要属性 |
| --- | --- | --- | --- |
| `<vui-table>` | 表格 | easycom 自动 | `columns`, `data`, `border`, `stripe`, `emptyText` |
| `<vui-pagination>` | 分页 | easycom 自动 | `modelValue`, `total`, `pageSize`, `pagerCount`, `showTotal` |
| `<vui-progress>` | 进度条 | easycom 自动 | `percentage`, `strokeWidth`, `color`, `status`, `showText` |
| `<vui-count-to>` | 数字滚动 | easycom 自动 | `start`, `end`, `duration`, `decimals`, `separator` |
| `<vui-steps>` | 步骤条 | easycom 自动 | `items`, `modelValue`, `direction`, `color`, `size` |
| `<vui-tabs>` | 标签页 | easycom 自动 | `items`, `modelValue`, `type`, `color`, `scrollable` |
| `<vui-collapse>` | 折叠面板 | easycom 自动 | `items`, `modelValue`, `accordion`, `arrow` |
| `<vui-calendar>` | 日历 | easycom 自动 | `modelValue`, `startWeek`, `color`, `minDate`, `maxDate` |
| `<vui-scrollbar>` | 滚动条 | easycom 自动 | `height`, `horizontal`, `always`, `barSize`, `color` |
| `<vui-auto-scroll>` | 自动滚动 | easycom 自动 | `list`, `width`, `height`, `scrollViewHeight` |

### 反馈组件

| 组件 | 说明 | 引入方式 | 主要属性 |
| --- | --- | --- | --- |
| `<vui-message>` | 消息提示 | easycom 自动 | `modelValue`, `message`, `type`, `duration`, `offset` |
| `<vui-notification>` | 通知 | easycom 自动 | `modelValue`, `title`, `message`, `type`, `position` |
| `<vui-modal>` | 对话框 | easycom 自动 | `modelValue`, `title`, `content`, `showCancel`, `cancelText` |
| `<vui-drawer>` | 抽屉 | easycom 自动 | `modelValue`, `position`, `title`, `width`, `height` |
| `<vui-loading>` | 加载 | easycom 自动 | `modelValue`, `type`, `size`, `color`, `text` |
| `<vui-tooltip>` | 提示 | easycom 自动 | `content`, `placement`, `trigger`, `modelValue` |
| `<vui-popover>` | 弹出框 | easycom 自动 | `modelValue`, `content`, `placement`, `trigger`, `mask` |
| `<vui-backtop>` | 回到顶部 | easycom 自动 | `scrollTop`, `visibilityHeight`, `right`, `bottom`, `duration` |

### 媒体组件

| 组件 | 说明 | 引入方式 | 主要属性 |
| --- | --- | --- | --- |
| `<vui-carousel>` | 轮播图 | easycom 自动 | `list`, `height`, `autoplay`, `interval`, `duration` |

### AI 组件

| 组件 | 说明 | 引入方式 | 主要属性 |
| --- | --- | --- | --- |
| `<vui-chat-bubble>` | 对话消息气泡 | easycom 自动 | `content`, `placement`, `avatar`, `name`, `showAvatar` |
| `<vui-chat-input>` | 对话输入框 | easycom 自动 | `modelValue`, `placeholder`, `disabled`, `loading`, `autoHeight` |
| `<vui-typing>` | 打字机流式文本 | easycom 自动 | `text`, `speed`, `autoplay`, `typing`, `showCursor` |
| `<vui-thinking>` | 推理过程展示 | easycom 自动 | `modelValue`, `title`, `content`, `loading`, `duration` |
| `<vui-feedback>` | 回答评价 | easycom 自动 | `modelValue`, `likeText`, `dislikeText`, `showText`, `disabled` |
| `<vui-copy>` | 一键复制 | easycom 自动 | `content`, `text`, `showIcon`, `successText`, `duration` |
| `<vui-code>` | 代码块 | easycom 自动 | `code`, `language`, `title`, `showLineNumbers`, `showCopy` |
| `<vui-prompt-card>` | 提示词卡片 | easycom 自动 | `modelValue`, `title`, `content`, `tags`, `icon` |
| `<vui-markdown>` | 轻量 Markdown 渲染 | easycom 自动 | `content`, `selectable`, `showCopy`, `codeMaxHeight` |
| `<vui-model-select>` | 模型选择 | easycom 自动 | `modelValue`, `options`, `title`, `placeholder`, `disabled` |
| `<vui-voice-input>` | 语音输入 | easycom 自动 | `modelValue`, `disabled`, `maxDuration`, `tipText`, `releaseText` |

## TypeScript 支持

包内已包含类型声明（`types/index.d.ts`），无需额外安装 `@types`。

```ts
import { VuiButton, VuiTable } from 'vui-uniapp';
import type { VuiTableProps } from 'vui-uniapp';
```

同时注册了全局组件类型，在 `<template>` 中使用 `<vui-button>` 时也能获得属性提示。

## 常见问题

**Q：组件不渲染 / 提示"未知组件"？**

1. 确认 `pages.json` 的 `easycom.custom` 路径写对了（注意结尾的 `.vue`）；
2. 修改 `pages.json` 后需要**重启**编译器才生效；
3. CLI 项目请参考上面「方式一」的补充配置。

**Q：想只用其中几个组件，怎么减小体积？**

用「方式一 easycom」或「方式三 uni_modules」：easycom 是按需引入的，只有页面里真正用到的组件才会被打包。

**Q：小程序端样式不对？**

小程序对 CSS 选择器支持有限。请确认没有在页面级样式里用后代选择器强行覆盖组件内部结构，
推荐通过 props 或主题变量来定制。另外 `vui-scrollbar` 这类依赖滚动事件的组件在小程序端表现与 H5 略有差异。

**Q：支持 Vue 2 吗？**

不支持。本项目按 Vue 3 编写（`modelValue` / `update:modelValue` 语义），请使用 uni-app 的 Vue 3 项目。

**Q：如何调换某个组件的颜色而不影响其他组件？**

给该实例传 `color` / `activeColor` 之类的 props（具体见 [docs/API.md](docs/API.md)），
或在页面里用更高优先级的作用域样式覆盖。

## 版本与发布

> **本仓库的硬性规则：任何一次面向用户的更新，都必须同步提升版本号并发布到 npm。**
> 不允许出现「代码已改、版本没动」或「版本已升、包没发」的状态。

完整规则见 [AGENTS.md](AGENTS.md)（供 AI 协作助手遵循）与 [CONTRIBUTING.md](CONTRIBUTING.md)（供人阅读）。

### 一键发布

```bash
npm run release            # 修 bug / 样式 / 文档（patch）
npm run release -- minor   # 新增组件、新增 props/事件/插槽
npm run release -- major   # 删除或重命名 props、改变默认行为
```

`npm run release` 会依次完成：

| 步骤 | 动作 |
| --- | --- |
| 1 | 跑 `npm run check:all` 校验（校验链的唯一来源，见 `AGENTS.md` 第八节） |
| 2 | 重新生成 `index.js`、`types/index.d.ts`、`docs/API.md`、`README.md` |
| 3 | 提升 `package.json` 与各组件 `package.json` 的版本号 |
| 4 | 提交并打 `vX.Y.Z` tag |
| 5 | 推送分支与 tag 到远端 |
| 6 | `npm publish --access public` |
| 7 | 回查 registry 确认已上线 |

加 `--dry-run` 可只跑校验与产物生成、不写入任何内容：

```bash
npm run release -- minor --dry-run
```

### 版本号规则

| 变更类型 | 版本级别 | 示例 |
| --- | --- | --- |
| 新增组件、新增 props / 事件 / 插槽 | minor | 1.1.0 -> 1.2.0 |
| 修复 bug、样式调整、文档更新 | patch | 1.1.0 -> 1.1.1 |
| 删除或重命名 props、改变默认行为 | major | 1.1.0 -> 2.0.0 |

### 发布凭证

`npm publish` 需要**带 Bypass 2FA** 的 npm token（普通 token 会报 `EOTP`）。
把 token 写入**项目级** `.npmrc`：

```
//registry.npmjs.org/:_authToken=<你的 token>
```

`.npmrc` 已在 `.gitignore` 中，**不会被提交**。token 格式必须以 `npm_` 开头。

## 贡献指南

我们欢迎任何贡献！完整流程见 [CONTRIBUTING.md](CONTRIBUTING.md)，摘要如下：

1. Fork 本仓库；
2. 创建分支（`git checkout -b feature-name`）；
3. 修改代码。若新增组件，请保持 `uni_modules/vui-xxx/components/vui-xxx/vui-xxx.vue` 的目录结构；
4. 新增组件后跑一次 `python scripts/inject-theme.py` 注入主题变量兜底块，
   并在 `scripts/gen-docs.py` 的 `CATEGORY` 中登记该组件；
5. 运行 `npm run check:all` 确认无误（校验链的唯一来源，见 `AGENTS.md` 第八节）；
6. 按[版本与发布](#版本与发布)提升版本号并发布（`npm run release`）；
7. 推送并创建 Pull Request。

**请勿手工编辑自动生成的产物**：`index.js`、`types/index.d.ts`、`docs/API.md`、`README.md`
均由脚本生成，改组件后跑 `npm run gen` 重新生成即可。

## 许可证

Virtual UI (VUI) 遵循 [MIT](LICENSE) 开源许可证。

## 联系

- GitHub Issues：<https://github.com/virtualman333/vui/issues>
- Email：virtualman@yeah.net
- WeChat：virtualman2001

## 贡献者

感谢以下贡献者对本项目做出贡献：

- [Virtualman](https://github.com/virtualman333)
- [Alexander](https://github.com/alexander12581)
