<template>
	<!-- 通过传递不同的class，从而展示不同的样式 -->
	<button @click="handleClick" :class="'vui-button--' + type">
		<slot></slot>
	</button>
</template>

<script>
/**
 * Button 按钮
 * @description 常用操作按钮，通过 type 切换配色
 * @property {String} type 按钮类型 default / primary / success / warning / error
 * @event {Function} click 点击按钮时触发
 */
export default {
	name: 'VuiButton',
	emits: ['click'],
	props: {
		type: {
			type: String,
			default: 'default'
		}
	},
	methods: {
		handleClick(evt) {
			this.$emit('click', evt);
		}
	}
};
</script>

<style lang="scss" scoped>
/* ===== VUI 主题变量（兼底定义，可在项目 uni.scss 中覆盖） ===== */
/* 功能色 */
$vui-primary: #2979ff !default;
$vui-success: #18bc37 !default;
$vui-warning: #f3a73f !default;
$vui-error: #e43d33 !default;
$vui-info: #8f939c !default;
$vui-region-active-color: #f07b00 !default;
/* 文字色 */
$vui-text-color: #333 !default;
$vui-text-color-regular: #606266 !default;
$vui-text-color-secondary: #909399 !default;
$vui-text-color-placeholder: #c0c4cc !default;
$vui-text-color-disabled: #e4e7ed !default;
$vui-text-color-inverse: #fff !default;
/* 边框色 */
$vui-border-color: #dcdfe6 !default;
$vui-border-color-light: #ebeef5 !default;
$vui-border-color-lighter: #e5e6eb !default;
/* 填充与背景色 */
$vui-bg-color: #fff !default;
$vui-bg-color-hover: #f2f3f5 !default;
$vui-fill-color: #f1f1f1 !default;
$vui-fill-color-light: #f5f7fa !default;
$vui-fill-color-lighter: #fafafa !default;
$vui-track-color: #ebedf0 !default;
$vui-active-bg-color: #f5f9ff !default;
$vui-gray-color: #ccc !default;
$vui-white: #fff !default;
/* 代码块（深色底 + 配套前景）—— vui-code / vui-markdown 共用 */
$vui-code-bg: #282c34 !default;
$vui-code-color: #abb2bf !default;
/* ===== VUI 主题变量结束 ===== */
.vui-button {
}
.vui-button--default {
}
.vui-button--primary {
	background-color: $vui-primary;
	color: $vui-text-color-inverse;
}
.vui-button--success {
	background-color: $vui-success;
	color: $vui-text-color-inverse;
}
.vui-button--warning {
	background-color: $vui-warning;
	color: $vui-text-color-inverse;
}
.vui-button--error {
	background-color: $vui-error;
}
</style>
