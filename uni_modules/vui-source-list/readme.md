# vui-source-list

VUI 引用来源列表组件

展示 AI 回答引用的来源（RAG 检索结果 / 联网搜索结果 / 知识库命中），常与正文里的 `[1]` 角标配合使用。

## 属性

- sources 来源数组，元素为对象 `{ title, url, domain, snippet, tag, id }`，也可直接传 URL 字符串数组
- title 列表标题，默认「参考来源」；传空串可隐藏标题行
- variant 展示形态：`list`（卡片列表，默认）/ `compact`（单行标签，适合正文下方一行展示）
- showIndex 是否显示序号角标，默认 `true`
- activeIndex 要高亮的项：序号（从 1 开始）或来源的 `id`，用于与正文角标联动
- maxTitleLines 标题最大行数，默认 2，传 0 表示不截断
- maxSnippetLines 摘要最大行数，默认 2，传 0 表示不截断
- emptyText 无来源时的占位文案，默认「暂无引用来源」
- clickable 是否可点击，默认 `true`；传 `false` 时列表退化为纯展示

## 事件

- select 点击某条来源时触发，参数为 `(来源对象, 从 0 开始的索引)`

## 插槽

- title 自定义标题行（默认渲染 `title` 与计数角标）

## 关于打开链接

组件**不自行打开链接**：不同平台方式不同（H5 用 `window.open`，小程序需要 `web-view` 页面，App 有各自的方案），
把这件事留在使用方，由 `select` 事件的回调决定。这样组件本身保持零平台依赖。

## 使用示例

```html
<!-- 列表形态：与正文里的 [1] 角标联动高亮 -->
<vui-source-list
  :sources="sources"
  title="参考来源"
  :active-index="activeRef"
  @select="onOpenSource"
/>

<!-- 紧凑形态：单行标签，放在回答下方 -->
<vui-source-list :sources="sources" variant="compact" :show-index="true" />
```

```js
export default {
  data() {
    return {
      activeRef: 2,
      sources: [
        { title: 'Uniswap V4 白皮书', url: 'https://uniswap.org/whitepaper-v4.pdf', tag: '官方文档' },
        { title: 'PostgreSQL 分区表实践', url: 'https://example.com/pg', snippet: '按时间分区可显著降低历史数据扫描量……' }
      ]
    };
  },
  methods: {
    onOpenSource(source) {
      // #ifdef H5
      window.open(source.url, '_blank');
      // #endif
    }
  }
};
```

更多示例请参考 AI 组件演示页 `pages/demo/ai.vue`。
