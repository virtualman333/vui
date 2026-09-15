<template>
	<view v-if="visible" class="vui-message" :class="'vui-message--' + innerType" :style="wrapStyle">
		<text class="vui-message__icon">{{ iconText }}</text>
		<text class="vui-message__text">{{ innerMessage }}</text>
	</view>
</template>

<script>
/**
 * Message 消息提示
 * @description 常用于主动操作后的反馈提示，支持通过 ref 调用 show 方法
 * @property {Boolean} modelValue 是否显示，支持 v-model
 * @property {String} message 消息内容
 * @property {String} type 类型 primary / success / warning / error / info
 * @property {Number} duration 自动关闭时间，0 表示不自动关闭
 * @property {Number} offset 距离顶部的距离（rpx）
 * @event {Function} close 关闭时触发
 * @method show(message, type) 显示消息
 */
const ICONS = {
	primary: 'ⓘ',
	info: 'ⓘ',
	success: '✓',
	warning: '!',
	error: '×'
};

export default {
	name: 'VuiMessage',
	emits: ['update:modelValue', 'close'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		message: {
			type: String,
			default: ''
		},
		type: {
			type: String,
			default: 'info'
		},
		duration: {
			type: Number,
			default: 2500
		},
		offset: {
			type: Number,
			default: 40
		}
	},
	data() {
		return {
			visible: false,
			innerMessage: '',
			innerType: 'info',
			timer: null
		};
	},
	computed: {
		iconText() {
			return ICONS[this.innerType] || ICONS.info;
		},
		wrapStyle() {
			return 'top:' + this.offset + 'rpx;';
		}
	},
	watch: {
		modelValue: {
			immediate: true,
			handler(val) {
				this.visible = val === true;
			}
		},
		message: {
			immediate: true,
			handler(val) {
				this.innerMessage = val || '';
			}
		},
		type: {
			immediate: true,
			handler(val) {
				this.innerType = val || 'info';
			}
		}
	},
	beforeUnmount() {
		this.clearTimer();
	},
	methods: {
		clearTimer() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
		},
		show(message, type) {
			this.clearTimer();
			if (message !== undefined) this.innerMessage = message;
			if (type !== undefined) this.innerType = type;
			this.visible = true;
			this.$emit('update:modelValue', true);
			if (this.duration > 0) {
				this.timer = setTimeout(() => {
					this.close();
				}, this.duration);
			}
		},
		close() {
			this.clearTimer();
			this.visible = false;
			this.$emit('update:modelValue', false);
			this.$emit('close');
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
.vui-message {
	position: fixed;
	left: 50%;
	z-index: 1001;
	display: flex;
	flex-direction: row;
	align-items: center;
	max-width: 80%;
	padding: 18rpx 32rpx;
	border-radius: 12rpx;
	background-color: $vui-bg-color;
	box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.12);
	transform: translateX(-50%);
	animation: vui-message-in 0.25s ease-out;

	&__icon {
		margin-right: 12rpx;
		font-size: 28rpx;
		color: $vui-info;
	}

	&__text {
		font-size: 26rpx;
		color: $vui-text-color-regular;
	}

	&--primary &__icon {
		color: $vui-primary;
	}

	&--info &__icon {
		color: $vui-info;
	}

	&--success &__icon {
		color: $vui-success;
	}

	&--warning &__icon {
		color: $vui-warning;
	}

	&--error &__icon {
		color: $vui-error;
	}
}

@keyframes vui-message-in {
	0% {
		opacity: 0;
		transform: translate(-50%, -20rpx);
	}
	100% {
		opacity: 1;
		transform: translate(-50%, 0);
	}
}
</style>
