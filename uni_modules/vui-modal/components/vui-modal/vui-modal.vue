<template>
	<view v-if="visible" class="vui-modal">
		<view class="vui-modal__mask" @click="onMaskClick"></view>
		<view class="vui-modal__box" :style="boxStyle">
			<view v-if="title" class="vui-modal__header">
				<text class="vui-modal__title">{{ title }}</text>
			</view>
			<view class="vui-modal__body">
				<slot>
					<text class="vui-modal__content">{{ content }}</text>
				</slot>
			</view>
			<view class="vui-modal__footer">
				<slot name="footer">
					<view v-if="showCancel" class="vui-modal__btn" @click="onCancel">
						<text class="vui-modal__btn-text">{{ cancelText }}</text>
					</view>
					<view class="vui-modal__btn vui-modal__btn--confirm" :style="confirmStyle" @click="onConfirm">
						<text class="vui-modal__btn-text vui-modal__btn-text--confirm">{{ confirmText }}</text>
					</view>
				</slot>
			</view>
		</view>
	</view>
</template>

<script>
/* VUI 主题色（与 uni.scss 中 $vui-* 变量保持一致，可通过 props 覆盖） */
const VUI_COLOR = {
	primary: '#2979ff',
};
/**
 * Modal 对话框
 * @description 在保留当前页面状态的情况下，告知用户并承载相关操作
 * @property {Boolean} modelValue 是否显示，支持 v-model
 * @property {String} title 标题
 * @property {String} content 内容
 * @property {Boolean} showCancel 是否显示取消按钮
 * @property {String} cancelText 取消按钮文案
 * @property {String} confirmText 确定按钮文案
 * @property {Boolean} maskClosable 点击遮罩是否关闭
 * @property {String} width 对话框宽度
 * @event {Function} confirm 点击确定时触发
 * @event {Function} cancel 点击取消时触发
 */
export default {
	name: 'VuiModal',
	emits: ['update:modelValue', 'confirm', 'cancel', 'close'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		title: {
			type: String,
			default: '提示'
		},
		content: {
			type: String,
			default: ''
		},
		showCancel: {
			type: Boolean,
			default: true
		},
		cancelText: {
			type: String,
			default: '取消'
		},
		confirmText: {
			type: String,
			default: '确定'
		},
		maskClosable: {
			type: Boolean,
			default: true
		},
		width: {
			type: String,
			default: '560rpx'
		},
		color: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			visible: false
		};
	},
	computed: {
		boxStyle() {
			return 'width:' + this.width + ';';
		},
		confirmStyle() {
			return 'background-color:' + (this.color || VUI_COLOR.primary) + ';';
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
		onMaskClick() {
			if (!this.maskClosable) return;
			this.onCancel();
		},
		onCancel() {
			this.visible = false;
			this.$emit('update:modelValue', false);
			this.$emit('cancel');
			this.$emit('close');
		},
		onConfirm() {
			this.$emit('confirm');
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
.vui-modal {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;

	&__mask {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.45);
	}

	&__box {
		position: relative;
		z-index: 1;
		overflow: hidden;
		border-radius: 20rpx;
		background-color: $vui-bg-color;
		animation: vui-modal-in 0.2s ease-out;
	}

	&__header {
		padding: 32rpx 32rpx 0 32rpx;
	}

	&__title {
		font-size: 32rpx;
		font-weight: bold;
		color: $vui-text-color;
	}

	&__body {
		padding: 24rpx 32rpx 32rpx 32rpx;
	}

	&__content {
		font-size: 28rpx;
		color: $vui-text-color-regular;
		line-height: 1.6;
	}

	&__footer {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-end;
		padding: 0 32rpx 32rpx 32rpx;
	}

	&__btn {
		margin-left: 16rpx;
		padding: 0 32rpx;
		height: 68rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid $vui-border-color;
		border-radius: 34rpx;
		background-color: $vui-bg-color;
	}

	&__btn-text {
		font-size: 28rpx;
		color: $vui-text-color-regular;
	}

	&__btn--confirm {
		border-color: $vui-primary;
		background-color: $vui-primary;
	}

	&__btn-text--confirm {
		color: $vui-text-color-inverse;
	}
}

@keyframes vui-modal-in {
	0% {
		opacity: 0;
		transform: scale(0.9);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
