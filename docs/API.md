# VUI 组件 API 参考

> 本文档由各组件的实际 props / emits 定义自动生成，与源码保持同步。
> 所有组件均支持 uni-app 的 `v-model` 双向绑定（使用 `modelValue` / `update:modelValue`）。

## 目录
- **基础组件**
  - [Button 按钮](#vui-button)
  - [Icon 图标](#vui-icon)
  - [Tag 标签](#vui-tag)
  - [Card 卡片](#vui-card)
  - [Image 图片](#vui-image)
  - [Header 头部标题](#vui-header)
- **表单组件**
  - [Input 输入框](#vui-input)
  - [Radio 单选框](#vui-radio)
  - [Checkbox 复选框](#vui-checkbox)
  - [Switch 开关](#vui-switch)
  - [Select 下拉选择](#vui-select)
  - [Form 表单](#vui-form)
  - [Form Item 表单项](#vui-form-item)
  - [Slider 滑块](#vui-slider)
  - [Upload 上传](#vui-upload)
  - [Region Picker 城市选择器](#vui-region-picker)
  - [Date Picker 日期选择器](#vui-date-picker)
  - [Time Picker 时间选择器](#vui-time-picker)
- **数据展示**
  - [Table 表格](#vui-table)
  - [Pagination 分页](#vui-pagination)
  - [Progress 进度条](#vui-progress)
  - [Count To 数字滚动](#vui-count-to)
  - [Steps 步骤条](#vui-steps)
  - [Tabs 标签页](#vui-tabs)
  - [Collapse 折叠面板](#vui-collapse)
  - [Calendar 日历](#vui-calendar)
  - [Scrollbar 滚动条](#vui-scrollbar)
  - [Auto Scroll 自动滚动](#vui-auto-scroll)
- **反馈组件**
  - [Message 消息提示](#vui-message)
  - [Notification 通知](#vui-notification)
  - [Modal 对话框](#vui-modal)
  - [Drawer 抽屉](#vui-drawer)
  - [Loading 加载](#vui-loading)
  - [Tooltip 提示](#vui-tooltip)
  - [Popover 弹出框](#vui-popover)
  - [Backtop 回到顶部](#vui-backtop)
- **媒体组件**
  - [Carousel 轮播图](#vui-carousel)
- **AI 组件**
  - [Chat Bubble 对话消息气泡](#vui-chat-bubble)
  - [Chat Input 对话输入框](#vui-chat-input)
  - [Typing 打字机流式文本](#vui-typing)
  - [Thinking 推理过程展示](#vui-thinking)
  - [Feedback 回答评价](#vui-feedback)
  - [Copy 一键复制](#vui-copy)
  - [Code 代码块](#vui-code)
  - [Prompt Card 提示词卡片](#vui-prompt-card)
  - [Markdown 轻量 Markdown 渲染](#vui-markdown)
  - [Model Select 模型选择](#vui-model-select)
  - [Voice Input 语音输入](#vui-voice-input)

---

## 基础组件

### vui-button

**Button 按钮**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| type | `string` | `'default'` | 按钮类型 default / primary / success / warning / error |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `click` | 点击按钮时触发 |

### vui-icon

**Icon 图标**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| name | `string` | `''` | 图标名称，如 check / close / arrow-right |
| char | `string` | `''` | 自定义字符，优先级高于 name |
| size | `any` | `32` | 图标大小，数字按 rpx 处理，默认 32 |
| color | `string` | `''` | 图标颜色 |
| spin | `boolean` | `false` | 是否旋转 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `click` | 点击图标触发 |

### vui-tag

**Tag 标签**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| type | `string` | `'default'` | = [default\|primary\|success｜warning｜error]  颜色类型 |
| size | `string` | `'normal'` | = [default\|small\|mini] 大小尺寸 |
| disabled | `any` | `false` | = [true\|false] 是否为禁用状态 |
| inverted | `any` | `false` | = [true\|false] 是否无需背景颜色（空心标签） |
| circle | `any` | `false` | = [true\|false] 是否为圆角 |
| mark | `any` | `false` |  |
| customStyle | `string` | `''` |  |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `click` | 点击 Tag 触发事件 |

### vui-card

**Card 卡片**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| title | `string` | `''` | 标题 |
| extra | `string` | `''` | 头部右侧附加内容 |
| shadow | `boolean` | `true` | 是否显示阴影 |
| border | `boolean` | `false` | 是否显示边框 |
| padding | `string` | `'24rpx'` | 内容内边距 |
| radius | `string` | `'16rpx'` | 圆角 |

### vui-image

**Image 图片**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| src | `string` | `''` | 图片地址 |
| mode | `string` | `'aspectFill'` | 裁剪模式，同 image 组件 |
| width | `string` | `'100%'` | 宽度 |
| height | `string` | `'300rpx'` | 高度 |
| radius | `string` | `'0'` | 圆角 |
| preview | `boolean` | `false` | 点击是否预览 |
| lazyLoad | `boolean` | `true` | 是否懒加载 |
| placeholderText | `string` | `''` | 加载中文案 |
| errorText | `string` | `'加载失败'` | 加载失败文案 |
| fallback | `string` | `''` | 加载失败时展示的图片 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `click` | 点击图片时触发 |
| `load` | 图片加载完成时触发 |
| `error` | 图片加载失败时触发 |

### vui-header

**Header 头部标题**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| title | `string` | `'标题'` | 标题文本 |

---

## 表单组件

### vui-input

**Input 输入框**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `any` | `''` | 绑定值，支持 v-model |
| label | `string` | `''` | 左侧标签文本 |
| labelWidth | `string` | `''` | 标签宽度 |
| placeholder | `string` | `'请输入...'` | 占位文案 |
| type | `string` | `'text'` | 输入类型 text / number / idcard / digit |
| disabled | `boolean` | `false` | 是否禁用 |
| rules | `Array` | `[]` | 校验规则 [{ required, message, min, max, pattern, type, trigger }] |
| inputStyle | `string` | `''` | 输入框自定义内联样式 |
| width | `string` | `'100%'` | 输入框宽度 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `update` | :modelValue 值变化时触发（v-model） |
| `input` | 值变化时触发（兼容写法） |
| `blur` | 失焦时触发 |
| `change` | 内容确认变化时触发 |

### vui-radio

**Radio 单选框**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否选中，支持 v-model |
| label | `string` | `''` | 文本內容 |
| disabled | `boolean` | `false` | 是否禁用 |
| color | `string` | `''` | 选中颜色 |
| shape | `string` | `'circle'` | 形状 circle / square |
| size | `any` | `36` | 图标尺寸，数字按 rpx 处理，默认 36 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 选中状态变化时触发 |

### vui-checkbox

**Checkbox 复选框**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否选中，支持 v-model |
| label | `string` | `''` | 文本内容 |
| disabled | `boolean` | `false` | 是否禁用 |
| indeterminate | `boolean` | `false` | 是否为半选状态 |
| color | `string` | `''` | 选中颜色 |
| size | `any` | `36` | 图标尺寸，数字按 rpx 处理，默认 36 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 选中状态变化时触发 |

### vui-switch

**Switch 开关**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否打开，支持 v-model |
| disabled | `boolean` | `false` | 是否禁用 |
| color | `string` | `''` | 打开时的背景色，留空则跟随平台主题 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `update` | :modelValue 状态变化时触发（v-model） |
| `change` | 状态变化时触发 |

### vui-select

**Select 下拉选择**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `any` | `''` | 选中值，支持 v-model |
| options | `Array` | `[]` | 选项数据 [{label, value, disabled}]，也支持字符串数组 |
| placeholder | `string` | `'请选择'` | 占位文案 |
| disabled | `boolean` | `false` | 是否禁用 |
| clearable | `boolean` | `false` | 是否可清空 |
| maxHeight | `string` | `'400rpx'` | 下拉最大高度 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 选中值变化时触发 |

### vui-form

**Form 表单**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| model | `Object` | `({})` | 表单数据对象 |
| rules | `Object` | `({})` | 表单校验规则 {prop: [{required, message, pattern, min, max, validator, trigger}]} |
| labelWidth | `string` | `'160rpx'` | 标签宽度 |
| labelPosition | `string` | `'left'` | 标签位置 left / top |

### vui-form-item

**Form Item 表单项**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| label | `string` | `''` | 标签文本 |
| prop | `string` | `''` | 对应 model 中的字段名 |
| required | `boolean` | `false` | 是否必填（也可由 rules 推导） |

### vui-slider

**Slider 滑块**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `number` | `0` | 当前值，支持 v-model |
| min | `number` | `0` | 最小值 |
| max | `number` | `100` | 最大值 |
| step | `number` | `1` | 步长 |
| disabled | `boolean` | `false` | 是否禁用 |
| showValue | `boolean` | `false` | 是否显示当前值 |
| color | `string` | `''` | 激活段颜色 |
| barHeight | `any` | `8` | 轨道高度，数字按 rpx 处理，默认 8 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 值变化时触发 |

### vui-upload

**Upload 上传**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `Array` | `[]` | 文件列表 [{url, path, progress}]，支持 v-model |
| action | `string` | `''` | 上传地址，不传则仅选择本地文件 |
| max | `number` | `9` | 最大数量 |
| count | `number` | `9` | 单次可选择数量 |
| deletable | `boolean` | `true` | 是否可删除 |
| preview | `boolean` | `true` | 是否可预览 |
| size | `string` | `'160rpx'` | 单文件大小，默认 160rpx |
| name | `string` | `'file'` | 上传时的文件字段名 |
| header | `Object` | `({})` |  |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 文件列表变化时触发 |
| `success` | 上传成功时触发 |
| `error` | 上传失败时触发 |

### vui-region-picker

**Region Picker 城市选择器**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| value | `Array` | `[0,0,0]` | = [默认值] |
| level | `number` | `3` | = [1：省\|2：省市\|3：省市区\|4：省市区镇] |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | — |

### vui-date-picker

**Date Picker 日期选择器**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `string` | `''` | 选中日期 YYYY-MM-DD，支持 v-model |
| minDate | `string` | `'1900-01-01'` | 可选最小日期 |
| maxDate | `string` | `'2099-12-31'` | 可选最大日期 |
| disabled | `boolean` | `false` | 是否禁用 |
| height | `string` | `'400rpx'` | 高度 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 日期变化时触发 |

### vui-time-picker

**Time Picker 时间选择器**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `string` | `''` | 选中时间 HH:mm 或 HH:mm:ss，支持 v-model |
| showSeconds | `boolean` | `false` | 是否显示秒 |
| min | `string` | `''` | 可选最小时间 HH:mm(:ss) |
| max | `string` | `''` | 可选最大时间 HH:mm(:ss) |
| disabled | `boolean` | `false` | 是否禁用 |
| height | `string` | `'400rpx'` | 高度 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 时间变化时触发 |

---

## 数据展示

### vui-table

**Table 表格**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| columns | `Array` | `[]` | 列配置 [{title, key, width, align}] |
| data | `Array` | `[]` | 行数据 |
| border | `boolean` | `false` | 是否显示纵向边框 |
| stripe | `boolean` | `false` | 是否显示斑马纹 |
| emptyText | `string` | `'暂无数据'` | 空数据文案 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `row-click` | 点击行时触发 |

### vui-pagination

**Pagination 分页**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `number` | `1` | 当前页码，支持 v-model |
| total | `number` | `0` | 数据总条数 |
| pageSize | `number` | `10` | 每页条数 |
| pagerCount | `number` | `5` | 中间页码按钮数量 |
| showTotal | `boolean` | `false` | 是否显示总条数 |
| prevText | `string` | `'‹'` | 上一页文本 |
| nextText | `string` | `'›'` | 下一页文本 |
| color | `string` | `''` |  |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 页码变化时触发 |

### vui-progress

**Progress 进度条**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| percentage | `number` | `0` | 百分比 0-100 |
| strokeWidth | `any` | `12` | 进度条高度，数字按 rpx 处理，默认 12 |
| color | `string` | `''` | 进度条颜色，优先级高于 status |
| status | `string` | `'primary'` | 状态 primary / success / warning / error |
| showText | `boolean` | `true` | 是否显示文字 |
| textInside | `boolean` | `false` | 文字是否内显 |
| format | `string` | `''` | 自定义文字，支持 {value} 占位 |

### vui-count-to

**Count To 数字滚动**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| start | `number` | `0` | 起始数值 |
| end | `number` | `0` | 目标数值 |
| duration | `number` | `1500` | 动画时长（毫秒），传 0 表示直接显示终值 |
| decimals | `number` | `0` | 保留小数位数 |
| separator | `string` | `''` | 千分位分隔符，如传 "," 则 1234567 显示为 1,234,567 |
| prefix | `string` | `''` | 前缀，如 "¥" |
| suffix | `string` | `''` | 后缀，如 " USDT" |
| autoplay | `boolean` | `true` | 是否挂载后自动开始滚动 |
| easing | `string` | `'easeOutCubic'` | 缓动函数 linear / easeOutQuad / easeOutCubic |
| color | `string` | `''` | 文字颜色 |
| fontSize | `any` | `''` | 字号，数字按 rpx 处理 |
| bold | `boolean` | `false` | 是否加粗 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `finish` | 滚动结束时触发，参数为终值 |
| `click` | 点击时触发 |

### vui-steps

**Steps 步骤条**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| items | `Array` | `[]` | 步骤数据 [{title, desc}] |
| modelValue | `number` | `0` | 当前步骤索引，支持 v-model |
| direction | `string` | `'horizontal'` | 方向 horizontal / vertical |
| color | `string` | `''` | 完成态颜色 |
| size | `any` | `48` | 圆点尺寸，数字按 rpx 处理，默认 48 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 点击步骤时触发 |

### vui-tabs

**Tabs 标签页**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| items | `Array` | `[]` | 标签数据 ['标签1'] 或 [{title, disabled}] |
| modelValue | `number` | `0` | 当前索引，支持 v-model |
| type | `string` | `'line'` | 样式 line / card |
| color | `string` | `''` | 激活颜色 |
| scrollable | `boolean` | `false` | 是否可横向滚动 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 切换标签时触发 |

### vui-collapse

**Collapse 折叠面板**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| items | `Array` | `[]` | 面板数据 [{title, content}] |
| modelValue | `Array` | `[]` | 展开的面板索引数组，支持 v-model |
| accordion | `boolean` | `false` | 是否手风琴模式（同时只展开一个） |
| arrow | `boolean` | `true` | 是否显示箭头 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 展开状态变化时触发 |

### vui-calendar

**Calendar 日历**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `string` | `''` | 选中日期 YYYY-MM-DD，支持 v-model |
| startWeek | `any` | `0` | 每周起始日 0 周日 / 1 周一 |
| color | `string` | `''` | 选中颜色 |
| minDate | `string` | `''` | 可选最小日期 YYYY-MM-DD |
| maxDate | `string` | `''` | 可选最大日期 YYYY-MM-DD |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 选中日期变化时触发 |

### vui-scrollbar

**Scrollbar 滚动条**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| height | `string` | `'400rpx'` | 容器高度（纵向滚动时必填） |
| horizontal | `boolean` | `false` | 是否横向滚动 |
| always | `boolean` | `false` | 是否常显滚动条 |
| barSize | `string` | `'8rpx'` | 滚动条厚度 |
| color | `string` | `''` | 滚动条颜色 |

### vui-auto-scroll

**Auto Scroll 自动滚动**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| list | `Array` | `[]` | 数据列表，通过默认插槽自定义每一项内容 |
| width | `string` | `''` | 容器宽度（CSS 值） |
| height | `string` | `''` | 容器高度（CSS 值） |
| scrollViewHeight | `string` | `''` | 内层 scroll-view 高度（CSS 值） |

---

## 反馈组件

### vui-message

**Message 消息提示**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否显示，支持 v-model |
| message | `string` | `''` | 消息内容 |
| type | `string` | `'info'` | 类型 primary / success / warning / error / info |
| duration | `number` | `2500` | 自动关闭时间，0 表示不自动关闭 |
| offset | `number` | `40` | 距离顶部的距离（rpx） |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `close` | 关闭时触发 |

### vui-notification

**Notification 通知**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否显示，支持 v-model |
| title | `string` | `''` | 标题 |
| message | `string` | `''` | 内容 |
| type | `string` | `'info'` | 类型 primary / success / warning / error / info |
| position | `string` | `'top-right'` | 位置 top-right / top-left / bottom-right / bottom-left |
| duration | `number` | `3000` | 自动关闭时间，0 表示不自动关闭 |
| closable | `boolean` | `true` | 是否显示关闭按钮 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `close` | 关闭时触发 |

### vui-modal

**Modal 对话框**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否显示，支持 v-model |
| title | `string` | `'提示'` | 标题 |
| content | `string` | `''` | 内容 |
| showCancel | `boolean` | `true` | 是否显示取消按钮 |
| cancelText | `string` | `'取消'` | 取消按钮文案 |
| confirmText | `string` | `'确定'` | 确定按钮文案 |
| maskClosable | `boolean` | `true` | 点击遮罩是否关闭 |
| width | `string` | `'560rpx'` | 对话框宽度 |
| color | `string` | `''` |  |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `confirm` | 点击确定时触发 |
| `cancel` | 点击取消时触发 |
| `close` | — |

### vui-drawer

**Drawer 抽屉**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否显示，支持 v-model |
| position | `string` | `'right'` | 弹出方向 left / right / top / bottom |
| title | `string` | `''` | 标题 |
| width | `string` | `'560rpx'` | 宽度（left / right） |
| height | `string` | `'600rpx'` | 高度（top / bottom） |
| mask | `boolean` | `true` | 是否显示遮罩 |
| maskClosable | `boolean` | `true` | 点击遮罩是否关闭 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `close` | 关闭时触发 |
| `change` | — |

### vui-loading

**Loading 加载**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否显示，支持 v-model |
| type | `string` | `'circle'` | 类型 circle / spinner / dot |
| size | `any` | `48` | 尺寸，数字按 rpx 处理，默认 48 |
| color | `string` | `''` | 主题色 |
| text | `string` | `''` | 加载文案 |
| mask | `boolean` | `false` | 是否显示遮罩 |
| vertical | `boolean` | `true` | 图标与文案是否纵向排列 |

### vui-tooltip

**Tooltip 提示**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| content | `string` | `''` | 提示内容 |
| placement | `string` | `'top'` | 提示位置 top / bottom / left / right |
| trigger | `string` | `'click'` | 触发方式 click / hover（hover 仅 H5 生效） |
| modelValue | `boolean` | `false` | 是否显示，支持 v-model |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 显示状态变化时触发 |

### vui-popover

**Popover 弹出框**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否显示，支持 v-model |
| content | `string` | `''` | 弹出框内容 |
| placement | `string` | `'bottom'` | 弹出位置 top / bottom / left / right |
| trigger | `string` | `'click'` | 触发方式 click / manual |
| mask | `boolean` | `true` | 是否显示遮罩 |
| width | `string` | `'300rpx'` | 弹出框宽度 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 显示状态变化时触发 |

### vui-backtop

**Backtop 回到顶部**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| scrollTop | `number` | `0` | 页面滚动距离 |
| visibilityHeight | `number` | `200` | 滚动高度达到该值时显示 |
| right | `string` | `'40rpx'` | 距离右侧位置 |
| bottom | `string` | `'80rpx'` | 距离底部位置 |
| duration | `number` | `300` | 回到顶部的动画时长 |
| text | `string` | `''` | 按钮文案 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `click` | 点击时触发 |

---

## 媒体组件

### vui-carousel

**Carousel 轮播图**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| list | `Array` | `[]` | 图片数据，字符串数组或 [{url, title}] |
| height | `string` | `'300rpx'` | 高度 |
| autoplay | `boolean` | `true` | 是否自动播放 |
| interval | `number` | `3000` | 自动切换时间间隔 |
| duration | `number` | `500` | 滑动动画时长 |
| circular | `boolean` | `true` | 是否采用衔接滑动 |
| indicator | `boolean` | `true` | 是否显示指示器 |
| indicatorType | `string` | `'dot'` | 指示器类型 dot / number |
| mode | `string` | `'aspectFill'` | 图片裁剪模式 |
| showTitle | `boolean` | `false` | 是否显示图片标题 |
| indicatorColor | `string` | `'rgba(255,255,255,0.6)'` | 指示器颜色 |
| indicatorActiveColor | `string` | `VUI_COLOR.white` | 当前选中指示器的颜色 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 切换时触发 |
| `click` | 点击图片时触发 |

---

## AI 组件

### vui-chat-bubble

**Chat Bubble 对话消息气泡**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| content | `string` | `''` | 消息文本内容 |
| placement | `string` | `'left'` | 气泡位置 left / right，默认 left |
| avatar | `string` | `''` | 头像图片地址 |
| name | `string` | `''` | 名称 |
| showAvatar | `boolean` | `true` | 是否显示头像 |
| status | `string` | `''` | 消息状态 '' / loading / error |
| time | `string` | `''` | 时间文本 |
| maxWidth | `string` | `'76%'` | 气泡最大宽度 |
| color | `string` | `''` | 气泡背景色 |
| textColor | `string` | `''` | 文字颜色 |
| selectable | `boolean` | `true` | 文字是否可选中 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `click` | 点击气泡时触发 |
| `longpress` | 长按气泡时触发 |

### vui-chat-input

**Chat Input 对话输入框**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `string` | `''` | 输入内容，支持 v-model |
| placeholder | `string` | `'输入消息，Enter 发送'` | 占位文案 |
| disabled | `boolean` | `false` | 是否禁用 |
| loading | `boolean` | `false` | 是否处于生成中（显示停止按钮） |
| autoHeight | `boolean` | `true` | 是否随内容自适应高度 |
| maxlength | `number` | `-1` | 最大输入长度 |
| showCount | `boolean` | `false` | 是否显示字数 |
| sendText | `string` | `'发送'` | 发送按钮文案 |
| stopText | `string` | `'停止'` | 停止按钮文案 |
| showVoice | `boolean` | `false` | 是否显示语音入口 |
| confirmType | `string` | `'send'` | 键盘右下角按钮类型 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `update` | :modelValue 输入内容变化 |
| `send` | 点击发送时触发，参数为当前文本 |
| `stop` | 生成中点击停止时触发 |
| `voice` | 点击语音入口时触发 |
| `focus` | 输入框聚焦 |
| `blur` | 输入框失焦 |
| `clear` | 内容被清空 |

### vui-typing

**Typing 打字机流式文本**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| text | `string` | `''` | 完整文本内容 |
| speed | `number` | `40` | 每个字符的间隔毫秒数 |
| autoplay | `boolean` | `true` | 挂载后是否自动开始 |
| typing | `boolean` | `false` | 是否仍处于流式输出中 |
| showCursor | `boolean` | `true` | 是否显示光标 |
| cursorChar | `string` | `'▍'` | 光标字符 |
| selectable | `boolean` | `true` | 文字是否可选中 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `change` | 每输出一个字符时触发，参数为当前已输出文本 |
| `finish` | 全部文本输出完成时触发，参数为完整文本 |

### vui-thinking

**Thinking 推理过程展示**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否展开，支持 v-model |
| title | `string` | `'思考过程'` | 标题文案 |
| content | `string` | `''` | 推理正文 |
| loading | `boolean` | `false` | 是否仍在推理中 |
| duration | `number` | `0` | 耗时秒数 |
| maxHeight | `string` | `'600rpx'` | 展开后最大高度 |
| defaultExpand | `boolean` | `false` | 初始是否展开 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `update` | :modelValue 展开状态变化 |
| `toggle` | 展开状态变化时触发，参数为当前是否展开 |

### vui-feedback

**Feedback 回答评价**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `string` | `''` | 当前评价 '' / like / dislike，支持 v-model |
| likeText | `string` | `'有帮助'` | 赞同文案 |
| dislikeText | `string` | `'没帮助'` | 不赞同文案 |
| showText | `boolean` | `false` | 是否显示文案 |
| disabled | `boolean` | `false` | 是否禁用 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `update` | :modelValue 评价变化 |
| `change` | 评价变化时触发，参数为当前值 |
| `like` | 选中赞同 |
| `dislike` | 选中不赞同 |

### vui-copy

**Copy 一键复制**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| content | `string` | `''` | 需要复制的内容 |
| text | `string` | `'复制'` | 按钮显示文案 |
| showIcon | `boolean` | `true` | 是否显示图标 |
| successText | `string` | `'已复制'` | 复制成功提示文案 |
| duration | `number` | `1500` | 提示停留时间 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `success` | 复制成功，参数为已复制的内容 |
| `error` | 复制失败，参数为错误对象 |

### vui-code

**Code 代码块**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| code | `string` | `''` | 代码内容 |
| language | `string` | `''` | 语言标识（仅用于展示标签） |
| title | `string` | `''` | 标题，不传则显示 language |
| showLineNumbers | `boolean` | `false` | 是否显示行号 |
| showCopy | `boolean` | `true` | 是否显示复制按钮 |
| wrap | `boolean` | `true` | 是否自动换行 |
| maxHeight | `string` | `'600rpx'` | 最大高度，超出滚动 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `copy` | 点击复制按钮，参数为已复制的内容 |

### vui-prompt-card

**Prompt Card 提示词卡片**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否选中，支持 v-model |
| title | `string` | `''` | 标题 |
| content | `string` | `''` | 提示词内容 |
| tags | `Array` | `[]` | 标签数组 |
| icon | `string` | `''` | 图标字符或图片地址 |
| disabled | `boolean` | `false` | 是否禁用 |
| selectable | `boolean` | `true` | 是否可选中 |
| maxLines | `number` | `2` | 内容最大行数 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `click` | 点击卡片时触发 |
| `update` | :modelValue 选中状态变化 |
| `change` | 选中状态变化时触发，参数为当前是否选中 |

### vui-markdown

**Markdown 轻量 Markdown 渲染**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| content | `string` | `''` | Markdown 源文本 |
| selectable | `boolean` | `true` | 文字是否可选中 |
| showCopy | `boolean` | `true` | 代码块是否显示复制按钮 |
| codeMaxHeight | `string` | `'600rpx'` | 代码块最大高度 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `copy` | 代码块复制成功，参数为已复制内容 |

### vui-model-select

**Model Select 模型选择**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `string` | `''` | 选中值，支持 v-model |
| options | `Array` | `[]` | 模型列表 [{ label, value, desc, tag, icon, disabled }] |
| title | `string` | `'选择模型'` | 弹层标题 |
| placeholder | `string` | `'请选择模型'` | 占位文案 |
| disabled | `boolean` | `false` | 是否禁用 |
| clearable | `boolean` | `false` | 是否可清空 |
| showDesc | `boolean` | `false` | 是否在触发器上显示当前模型的描述 |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `update` | :modelValue 选中值变化 |
| `change` | 选中值变化时触发，参数为选中项对象 |

### vui-voice-input

**Voice Input 语音输入**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 是否正在录音，支持 v-model |
| disabled | `boolean` | `false` | 是否禁用 |
| maxDuration | `number` | `60` | 最长录音秒数 |
| tipText | `string` | `'按住说话'` | 按住时的提示文案 |
| releaseText | `string` | `'松手发送'` | 松手发送提示 |
| format | `string` | `'mp3'` | 录音格式 mp3 / aac / wav |

**事件**

| 事件名 | 说明 |
| --- | --- |
| `update` | :modelValue 录音状态变化 |
| `start` | 开始录音 |
| `stop` | 结束录音（非取消） |
| `cancel` | 上滑取消录音 |
| `finish` | 录音结束并拿到文件，参数为 { tempFilePath, duration, fileSize } |
| `error` | 录音失败或当前环境不支持录音 |

