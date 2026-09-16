<template>
	<view
		v-if="visible"
		class="vui-notification"
		:class="['vui-notification--' + position, 'vui-notification--' + innerType]"
		:style="wrapStyle"
	>
		<view class="vui-notification__header">
			<text class="vui-notification__icon">{{ iconText }}</text>
			<text class="vui-notification__title">{{ innerTitle }}</text>
			<text v-if="closable" class="vui-notification__close" @click="close">×</text>
		</view>
		<text v-if="innerMessage" class="vui-notification__content">{{ innerMessage }}</text>
	</view>
</template>

<script>
/**
 * Notification 通知
 * @description 悬浮出现在页面角落，显示全局的通知提醒消息，支持通过 ref 调用 show 方法
 * @property {Boolean} modelValue 是否显示，支持 v-model
 * @property {String} title 标题
 * @property {String} message 内容
 * @property {String} type 类型 primary / success / warning / error / info
 * @property {String} position 位置 top-right / top-left / bottom-right / bottom-left
 * @property {Number} duration 自动关闭时间，0 表示不自动关闭
 * @property {Boolean} closable 是否显示关闭按钮
 * @event {Function} close 关闭时触发
 * @method show(options) 显示通知，options 支持 {title, message, type, duration}
 */
const ICONS = {
	primary: 'ⓘ',
	info: 'ⓘ',
	success: '✓',
	warning: '!',
	error: '×'
};

export default {
	name: 'VuiNotification',
	emits: ['update:modelValue', 'close'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		title: {
			type: String,
			default: ''
		},
		message: {
			type: String,
			default: ''
		},
		type: {
			type: String,
			default: 'info'
		},
		position: {
			type: String,
			default: 'top-right'
		},
		duration: {
			type: Number,
			default: 3000
		},
		closable: {
			type: Boolean,
			default: true
		}
	},
	data() {
		return {
			visible: false,
			innerTitle: '',
			innerMessage: '',
			innerType: 'info',
			innerDuration: 3000,
			timer: null
		};
	},
	computed: {
		iconText() {
			return ICONS[this.innerType] || ICONS.info;
		},
		wrapStyle() {
			return this.position.indexOf('top') === 0 ? 'top:24rpx;' : 'bottom:24rpx;';
		}
	},
	watch: {
		modelValue: {
			immediate: true,
			handler(val) {
				this.visible = val === true;
			}
		},
		title: {
			immediate: true,
			handler(val) {
				this.innerTitle = val || '';
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
		},
		duration: {
			immediate: true,
			handler(val) {
				this.innerDuration = typeof val === 'number' ? val : 3000;
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
		show(options) {
			this.clearTimer();
			const opts = typeof options === 'string' ? { message: options } : options || {};
			if (opts.title !== undefined) this.innerTitle = opts.title;
			if (opts.message !== undefined) this.innerMessage = opts.message;
			if (opts.type !== undefined) this.innerType = opts.type;
			if (opts.duration !== undefined) this.innerDuration = opts.duration;
			this.visible = true;
			this.$emit('update:modelValue', true);
			const duration = typeof this.innerDuration === 'number' ? this.innerDuration : 3000;
			if (duration > 0) {
				this.timer = setTimeout(() => {
					this.close();
				}, duration);
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
.vui-notification {
	position: fixed;
	z-index: 1001;
	width: 560rpx;
	padding: 24rpx;
	box-sizing: border-box;
	border-radius: 16rpx;
	background-color: $vui-bg-color;
	box-shadow: 0 6rpx 30rpx rgba(0, 0, 0, 0.14);
	animation: vui-notification-in 0.25s ease-out;

	&--top-right {
		right: 24rpx;
	}

	&--top-left {
		left: 24rpx;
	}

	&--bottom-right {
		right: 24rpx;
	}

	&--bottom-left {
		left: 24rpx;
	}

	&__header {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	&__icon {
		margin-right: 12rpx;
		font-size: 28rpx;
		color: $vui-info;
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

	&__title {
		flex: 1;
		font-size: 28rpx;
		font-weight: bold;
		color: $vui-text-color;
	}

	&__close {
		font-size: 32rpx;
		color: $vui-text-color-placeholder;
	}

	&__content {
		margin-top: 12rpx;
		font-size: 26rpx;
		color: $vui-text-color-regular;
		line-height: 1.6;
	}
}

@keyframes vui-notification-in {
	0% {
		opacity: 0;
		transform: translateY(-20rpx);
	}
	100% {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
