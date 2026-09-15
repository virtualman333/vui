# vui-form-item

VUI 表单子项组件，需配合 `vui-form` 使用。

## 属性

- label 标签文本
- prop 对应 vui-form 中 model 的字段名，用于校验
- required 是否必填（也可由 vui-form 的 rules 推导）
- labelWidth 标签宽度，默认继承 vui-form
- showMessage 是否显示校验错误信息

## 插槽

- default 表单控件内容

## 使用示例

```html
<vui-form :model="form" :rules="rules" ref="formRef">
  <vui-form-item label="用户名" prop="username" required>
    <vui-input v-model="form.username" />
  </vui-form-item>
</vui-form>
```

更多示例请参考项目演示页 `pages/demo/demo.vue`。
