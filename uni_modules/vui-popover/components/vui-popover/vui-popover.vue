<template>
	<view class="vui-popover">
		<view class="vui-popover__reference" @click="onTrigger">
			<slot></slot>
		</view>
		<view v-if="visible && mask" class="vui-popover__mask" @click="onClose"></view>
		<view
			v-if="visible"
			class="vui-popover__content"
			:class="'vui-popover__content--' + placement"
			:style="contentStyle"
		>
			<slot name="content">
				<text class="vui-popover__text">{{ content }}</text>
			</slot>
		</view>
	</view>
</template>

<script>
/**
 * Popover 弹出框
 * @description 点击某个元素弹出卡片式的浮层
 * @property {Boolean} modelValue 是否显示，支持 v-model
 * @property {String} content 弹出框内容
 * @property {String} placement 弹出位置 top / bottom / left / right
 * @property {String} trigger 触发方式 click / manual
 * @property {Boolean} mask 是否显示遮罩
 * @property {String} width 弹出框宽度
 * @event {Function} change 显示状态变化时触发
 */
export default {
	name: 'VuiPopover',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		content: {
			type: String,
			default: ''
		},
		placement: {
			type: String,
			default: 'bottom'
		},
		trigger: {
			type: String,
			default: 'click'
		},
		mask: {
			type: Boolean,
			default: true
		},
		width: {
			type: String,
			default: '300rpx'
		}
	},
	data() {
		return {
			visible: false
		};
	},
	computed: {
		contentStyle() {
			return 'width:' + this.width + ';';
		}
	},
	watch: {
		modelValue: {
			immediate: true,
			handler(val) {
				this.visible = val === true;
			}
		}
	},
	methods: {
		onTrigger() {
			if (this.trigger !== 'click') return;
			this.setVisible(!this.visible);
		},
		onClose() {
			this.setVisible(false);
		},
		setVisible(val) {
			this.visible = val;
			this.$emit('update:modelValue', val);
			this.$emit('change', val);
		}
	}
};
</script>

<style lang="scss" scoped>
/* ===== VUI 主题变量（兜底定义，可在项目 uni.scss 中覆盖） ===== */
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
/* ===== VUI 主题变量结束 ===== */
.vui-popover {
	position: relative;
	display: inline-block;

	&__reference {
		display: inline-block;
	}

	&__mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 998;
		background-color: transparent;
	}

	&__content {
		position: absolute;
		z-index: 999;
		padding: 20rpx;
		box-sizing: border-box;
		border-radius: 12rpx;
		background-color: $vui-bg-color;
		box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.12);

		&--bottom {
			left: 50%;
			top: 100%;
			transform: translate(-50%, 12rpx);
		}

		&--top {
			left: 50%;
			bottom: 100%;
			transform: translate(-50%, -12rpx);
		}

		&--left {
			right: 100%;
			top: 50%;
			transform: translate(-12rpx, -50%);
		}

		&--right {
			left: 100%;
			top: 50%;
			transform: translate(12rpx, -50%);
		}
	}

	&__text {
		font-size: 26rpx;
		color: $vui-text-color-regular;
		line-height: 1.6;
	}
}
</style>
