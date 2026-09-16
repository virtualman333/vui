<template>
	<switch
		:checked="modelValue"
		:disabled="disabled"
		:color="color"
		@change="onChange"
	></switch>
</template>

<script>
/**
 * Switch 开关
 * @description 表示两种互斥状态之间的切换，支持 Vue3 v-model 双向绑定
 * @property {Boolean} modelValue 是否打开，支持 v-model
 * @property {Boolean} disabled 是否禁用
 * @property {String} color 打开时的背景色，留空则跟随平台主题
 * @event {Function} update:modelValue 状态变化时触发（v-model）
 * @event {Function} change 状态变化时触发
 */
export default {
	name: 'VuiSwitch',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		},
		color: {
			type: String,
			default: ''
		}
	},
	methods: {
		onChange(event) {
			const checked = event.detail.value;
			this.$emit('update:modelValue', checked);
			this.$emit('change', checked);
		}
	}
};
</script>

<style lang="scss">
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
</style>
