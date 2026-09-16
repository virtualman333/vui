<template>
	<view class="vui-checkbox" :class="{ 'vui-checkbox--disabled': disabled }" @click="onToggle">
		<view
			class="vui-checkbox__icon"
			:class="{ 'is-checked': isChecked || indeterminate }"
			:style="iconStyle"
		>
			<text v-if="indeterminate" class="vui-checkbox__mark" :style="markStyle">−</text>
			<text v-else-if="isChecked" class="vui-checkbox__mark" :style="markStyle">✓</text>
		</view>
		<text class="vui-checkbox__label" :style="labelStyle"><slot>{{ label }}</slot></text>
	</view>
</template>

<script>
/* VUI 主题色（与 uni.scss 中 $vui-* 变量保持一致，可通过 props 覆盖） */
const VUI_COLOR = {
	primary: '#2979ff',
	placeholder: '#c0c4cc',
	border: '#dcdfe6',
	white: '#fff',
};
/**
 * Checkbox 复选框
 * @description 复选框，支持 v-model 与半选状态
 * @property {Boolean} modelValue 是否选中，支持 v-model
 * @property {String} label 文本内容
 * @property {Boolean} disabled 是否禁用
 * @property {Boolean} indeterminate 是否为半选状态
 * @property {String} color 选中颜色
 * @property {Number|String} size 图标尺寸，数字按 rpx 处理，默认 36
 * @event {Function} change 选中状态变化时触发
 */
export default {
	name: 'VuiCheckbox',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		label: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			default: false
		},
		indeterminate: {
			type: Boolean,
			default: false
		},
		color: {
			type: String,
			default: ''
		},
		size: {
			type: [Number, String],
			default: 36
		}
	},
	computed: {
		isChecked() {
			return this.modelValue === true;
		},
		iconSize() {
			return typeof this.size === 'number' ? this.size + 'rpx' : this.size;
		},
		activeColor() {
			return this.disabled ? VUI_COLOR.placeholder : this.color || VUI_COLOR.primary;
		},
		iconStyle() {
			return 'width:' + this.iconSize + ';height:' + this.iconSize + ';' +
				'border-color:' + (this.isChecked || this.indeterminate ? this.activeColor : VUI_COLOR.border) + ';' +
				'background-color:' + (this.isChecked || this.indeterminate ? this.activeColor : 'transparent') + ';';
		},
		markStyle() {
			const num = typeof this.size === 'number' ? this.size : parseFloat(this.size) || 36;
			return 'font-size:' + num * 0.7 + 'rpx;line-height:' + num * 0.7 + 'rpx;color:' + VUI_COLOR.white + ';';
		},
		labelStyle() {
			return this.disabled ? 'color:' + VUI_COLOR.placeholder + ';' : '';
		}
	},
	methods: {
		onToggle() {
			if (this.disabled) return;
			const next = !this.isChecked;
			this.$emit('update:modelValue', next);
			this.$emit('change', next);
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
.vui-checkbox {
	display: flex;
	flex-direction: row;
	align-items: center;

	&--disabled {
		/* #ifdef H5 */
		cursor: not-allowed;
		/* #endif */
	}

	&__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		border-width: 1px;
		border-style: solid;
		border-color: $vui-border-color;
		border-radius: 6rpx;
		background-color: $vui-bg-color;
		transition: all 0.15s;

		&.is-checked {
			border-color: $vui-primary;
			background-color: $vui-primary;
		}
	}

	&__mark {
		font-weight: bold;
		color: $vui-text-color-inverse;
	}

	&__label {
		margin-left: 12rpx;
		font-size: 28rpx;
		color: $vui-text-color;
	}
}
</style>
