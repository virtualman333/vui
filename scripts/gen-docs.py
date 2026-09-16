# -*- coding: utf-8 -*-
import os
# 统一以项目根目录为工作目录，保证脚本可从任意位置执行
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
"""生成 README.md（完整使用教程）与 docs/API.md（完整 API 参考）。
API 内容直接取自各组件实际的 props 定义，保证与代码同步。"""
import os
import re
import glob

TYPE_MAP = {'String': 'string', 'Number': 'number', 'Boolean': 'boolean',
            'Array': 'Array', 'Object': 'Object', 'Function': 'Function'}
PASCAL = lambda k: ''.join(w.capitalize() for w in k.split('-'))

CATEGORY = {
    '基础组件': ['vui-button', 'vui-icon', 'vui-tag', 'vui-card', 'vui-image', 'vui-header'],
    '表单组件': ['vui-input', 'vui-radio', 'vui-checkbox', 'vui-switch', 'vui-select',
                 'vui-form', 'vui-form-item', 'vui-slider', 'vui-upload',
                 'vui-region-picker', 'vui-date-picker', 'vui-time-picker'],
    '数据展示': ['vui-table', 'vui-pagination', 'vui-progress', 'vui-count-to', 'vui-steps', 'vui-tabs',
                 'vui-collapse', 'vui-calendar', 'vui-scrollbar', 'vui-auto-scroll'],
    '反馈组件': ['vui-message', 'vui-notification', 'vui-modal', 'vui-drawer',
                 'vui-loading', 'vui-tooltip', 'vui-popover', 'vui-backtop'],
    '媒体组件': ['vui-carousel'],
    'AI 组件': ['vui-chat-bubble', 'vui-chat-input', 'vui-typing', 'vui-thinking',
                'vui-feedback', 'vui-copy', 'vui-code', 'vui-prompt-card',
                'vui-markdown', 'vui-model-select', 'vui-voice-input'],
}


def find_matching_brace(s, start):
    depth, i, in_str = 0, start, None
    while i < len(s):
        ch = s[i]
        if in_str:
            if ch == '\\':
                i += 2
                continue
            if ch == in_str:
                in_str = None
        elif ch in '\'"`':
            in_str = ch
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def split_top_level(body):
    parts, depth, buf, in_str = [], 0, '', None
    for i, ch in enumerate(body):
        if in_str:
            buf += ch
            if ch == '\\':
                continue
            if ch == in_str and body[i - 1] != '\\':
                in_str = None
            continue
        if ch in '\'"`':
            in_str = ch
            buf += ch
            continue
        if ch in '{[(':
            depth += 1
        elif ch in '}])':
            depth -= 1
        if ch == ',' and depth == 0:
            parts.append(buf)
            buf = ''
        else:
            buf += ch
    if buf.strip():
        parts.append(buf)
    return parts


def parse_props(script):
    m = re.search(r'\bprops\s*:\s*\{', script)
    if not m:
        return []
    brace = script.index('{', m.start())
    end = find_matching_brace(script, brace)
    if end < 0:
        return []
    out = []
    for seg in split_top_level(script[brace + 1:end]):
        seg = seg.strip()
        if not seg or seg.startswith('//'):
            continue
        mm = re.match(r'^([A-Za-z_$][\w$]*)\s*:\s*(.+)$', seg, re.S)
        if not mm:
            continue
        name, val = mm.group(1), mm.group(2).strip()
        default = ''
        if val.startswith('{'):
            b2 = val.index('{')
            e2 = find_matching_brace(val, b2)
            inner = val[b2 + 1:e2] if e2 > 0 else ''
            tm = re.search(r'\btype\s*:\s*([A-Za-z]+)', inner)
            vm = re.search(r'\bdefault\s*:\s*(.+?)(?:,\s*$|$)', inner.strip(), re.S)
            ts = TYPE_MAP.get(tm.group(1), 'any') if tm else 'any'
            if vm:
                dv = vm.group(1).strip().rstrip(',').strip()
                if dv.startswith('()'):
                    dm = re.search(r'=>\s*(.+)$', dv, re.S)
                    dv = dm.group(1).strip().rstrip(',') if dm else '—'
                default = dv
        else:
            ts = TYPE_MAP.get(val.split('(')[0].strip(), 'any')
        out.append((name, ts, default))
    return out


def parse_jsdoc(t):
    m = re.search(r'/\*\*(.*?)\*/', t, re.S)
    if not m:
        return '', {}, [], []
    doc = m.group(1)
    desc = ''
    for line in doc.split('\n'):
        s = line.strip().lstrip('*').strip()
        if s and not s.startswith('@'):
            desc = s
            break
    props = {}
    for pm in re.finditer(r'@property\s*\{[^}]*\}\s*([A-Za-z_$][\w$]*)\s*(.*)', doc):
        props[pm.group(1)] = pm.group(2).strip()
    events = []
    for em in re.finditer(r'@event\s*\{[^}]*\}\s*([A-Za-z_$][\w$-]*)\s*(.*)', doc):
        events.append((em.group(1), em.group(2).strip()))
    slots = []
    for sm_ in re.finditer(r'@slot\s*([A-Za-z_$][\w$-]*)?\s*(.*)', doc):
        slots.append((sm_.group(1) or 'default', sm_.group(2).strip()))
    return desc, props, events, slots


COMPS = {}
for f in sorted(glob.glob('uni_modules/*/components/*/*.vue')):
    f = f.replace('\\', '/')
    cid = f.split('/')[-1][:-4]
    t = open(f, encoding='utf-8').read()
    sm = re.search(r'<script>(.*?)</script>', t, re.S)
    script = sm.group(1) if sm else ''
    desc, jprops, events, slots = parse_jsdoc(script)
    em = re.search(r"emits\s*:\s*\[(.*?)\]", script, re.S)
    if em:
        for e in re.findall(r"['\"]([^'\"]+)['\"]", em.group(1)):
            if e.startswith('update:'):
                continue
            if not any(x[0] == e for x in events):
                events.append((e, ''))
    # readme.md 首段作为补充说明
    rm = os.path.join(os.path.dirname(os.path.dirname(f)), 'readme.md')
    COMPS[cid] = {'desc': desc or cid, 'props': parse_props(script), 'jprops': jprops,
                  'events': events, 'slots': slots}


def cn(desc):
    """'Carousel 轮播图' -> '轮播图'"""
    parts = desc.split(' ', 1)
    return parts[1] if len(parts) > 1 and re.match(r'^[A-Za-z]+$', parts[0]) else desc


def en(cid):
    return ' '.join(w.capitalize() for w in cid.replace('vui-', '').split('-'))


# ============ 生成 docs/API.md ============
api = ['# VUI 组件 API 参考', '',
       '> 本文档由各组件的实际 props / emits 定义自动生成，与源码保持同步。',
       '> 所有组件均支持 uni-app 的 `v-model` 双向绑定（使用 `modelValue` / `update:modelValue`）。',
       '']
api.append('## 目录')
for cat, ids in CATEGORY.items():
    api.append('- **%s**' % cat)
    for cid in ids:
        if cid in COMPS:
            api.append('  - [%s %s](#%s)' % (en(cid), cn(COMPS[cid]['desc']), cid))
api.append('')

for cat, ids in CATEGORY.items():
    api.append('---')
    api.append('')
    api.append('## %s' % cat)
    api.append('')
    for cid in ids:
        if cid not in COMPS:
            continue
        c = COMPS[cid]
        api.append('### %s' % cid)
        api.append('')
        api.append('**%s %s**' % (en(cid), cn(c['desc'])))
        api.append('')
        api.append('| 属性 | 类型 | 默认值 | 说明 |')
        api.append('| --- | --- | --- | --- |')
        for name, ts, default in c['props']:
            note = c['jprops'].get(name, '').replace('|', '\\|')
            dv = ('`%s`' % default) if default else '—'
            api.append('| %s | `%s` | %s | %s |' % (name, ts, dv, note))
        api.append('')
        if c['events']:
            api.append('**事件**')
            api.append('')
            api.append('| 事件名 | 说明 |')
            api.append('| --- | --- |')
            for en_, ec in c['events']:
                api.append('| `%s` | %s |' % (en_, ec or '—'))
            api.append('')
        if c['slots']:
            api.append('**插槽**')
            api.append('')
            api.append('| 插槽名 | 说明 |')
            api.append('| --- | --- |')
            for sn, sc in c['slots']:
                api.append('| `%s` | %s |' % (sn, sc or '—'))
            api.append('')

os.makedirs('docs', exist_ok=True)
open('docs/API.md', 'w', encoding='utf-8', newline='\n').write('\n'.join(api) + '\n')
print('docs/API.md 行数:', len(api))

# ============ 生成组件总览表 ============
overview = []
for cat, ids in CATEGORY.items():
    overview.append('### %s' % cat)
    overview.append('')
    overview.append('| 组件 | 说明 | 引入方式 | 主要属性 |')
    overview.append('| --- | --- | --- | --- |')
    for cid in ids:
        if cid not in COMPS:
            continue
        c = COMPS[cid]
        keys = [p[0] for p in c['props']][:5]
        keymsg = ', '.join('`%s`' % k for k in keys) if keys else '—'
        overview.append('| `<%s>` | %s | easycom 自动 | %s |'
                        % (cid, cn(c['desc']), keymsg))
    overview.append('')

total_props = sum(len(c['props']) for c in COMPS.values())
total_events = sum(len(c['events']) for c in COMPS.values())

README = """# Virtual UI (VUI)

[![npm version](https://img.shields.io/npm/v/vui-uniapp.svg)](https://www.npmjs.com/package/vui-uniapp)
[![npm downloads](https://img.shields.io/npm/dm/vui-uniapp.svg)](https://www.npmjs.com/package/vui-uniapp)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![uni-app](https://img.shields.io/badge/uni--app-Vue3-41b883.svg)](https://uniapp.dcloud.net.cn/)
[![官网](https://img.shields.io/badge/site-online-7166F0.svg)](https://virtualman333.github.io/vui/)
[![在线演示](https://img.shields.io/badge/demo-online-7166F0.svg)](https://virtualman333.github.io/vui/demo/)

> 基于 uni-app 的 **Vue 3** 跨端组件库 —— %(comp_count)d 个开箱即用的组件，一套代码同时跑 iOS / Android / H5 / 微信小程序等各家小程序。

**官网**：[https://virtualman333.github.io/vui/](https://virtualman333.github.io/vui/)

**在线演示**：[https://virtualman333.github.io/vui/demo/](https://virtualman333.github.io/vui/demo/) —— 含「组件总览」「AI 组件演示」「开发者测试」三个页面，桌面与手机浏览器直接打开即可，无需安装。

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
          { pattern: /^1\\d{10}$/, message: '手机号格式不正确' }
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

共 **%(comp_count)d** 个组件、**%(prop_count)d** 个属性、**%(event_count)d** 个事件。
完整 API（属性 / 事件 / 插槽）见 [docs/API.md](docs/API.md)。

%(overview)s
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
"""

readme = README % {
    'comp_count': len(COMPS),
    'prop_count': total_props,
    'event_count': total_events,
    'overview': '\n'.join(overview),
}

open('README.md', 'w', encoding='utf-8', newline='\n').write(readme)
print('README.md 行数:', readme.count('\n') + 1)
print('组件数:', len(COMPS), '属性数:', total_props, '事件数:', total_events)
