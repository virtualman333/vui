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
			return 'background-color:' + (this.color || '#2979ff') + ';';
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
		background-color: #fff;
		animation: vui-modal-in 0.2s ease-out;
	}

	&__header {
		padding: 32rpx 32rpx 0 32rpx;
	}

	&__title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}

	&__body {
		padding: 24rpx 32rpx 32rpx 32rpx;
	}

	&__content {
		font-size: 28rpx;
		color: #606266;
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
		border: 1px solid #dcdfe6;
		border-radius: 34rpx;
		background-color: #fff;
	}

	&__btn-text {
		font-size: 28rpx;
		color: #606266;
	}

	&__btn--confirm {
		border-color: #2979ff;
		background-color: #2979ff;
	}

	&__btn-text--confirm {
		color: #fff;
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
