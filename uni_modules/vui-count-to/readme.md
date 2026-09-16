# vui-count-to

VUI 数字滚动组件

## 属性
- start 起始数值，默认 0
- end 目标数值，默认 0
- duration 动画时长（毫秒），默认 1500；传 0 表示直接显示终值
- decimals 保留小数位数，默认 0
- separator 千分位分隔符，如传 `,` 则 1234567 显示为 1,234,567
- prefix 前缀，如 `¥`
- suffix 后缀，如 ` USDT`
- autoplay 是否挂载后自动开始滚动，默认 true
- easing 缓动函数 linear / easeOutQuad / easeOutCubic，默认 easeOutCubic
- color 文字颜色
- fontSize 字号，数字按 rpx 处理
- bold 是否加粗

## 事件
- finish 滚动结束时触发，参数为终值
- click 点击时触发

## 方法（通过 ref 调用）
- restart() 从 start 重新滚到 end
- reset() 立即跳到终值，不播动画

## 使用示例

```html
<!-- 金额：滚动到 1,234,567.89 -->
<vui-count-to
  :start="0"
  :end="1234567.89"
  :decimals="2"
  separator=","
  prefix="¥"
  :duration="2000"
  :font-size="40"
  bold
  @finish="onFinish"
/>

<!-- 用量：12345 → 12,345 tokens，手动控制播放时机 -->
<vui-count-to ref="counter" :end="12345" separator="," suffix=" tokens" :autoplay="false" />
```

```js
export default {
  methods: {
    replay() {
      this.$refs.counter.restart();
    }
  }
};
```

更多示例请参考项目演示页 `pages/demo/demo.vue`。
