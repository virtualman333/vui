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
$vui-primary: #2979ff;
$vui-success: #18bc37;
$vui-warning: #f3a73f;
$vui-error: #e43d33;
$vui-info: #8f939c;

.vui-notification {
	position: fixed;
	z-index: 1001;
	width: 560rpx;
	padding: 24rpx;
	box-sizing: border-box;
	border-radius: 16rpx;
	background-color: #fff;
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
		color: #333;
	}

	&__close {
		font-size: 32rpx;
		color: #c0c4cc;
	}

	&__content {
		margin-top: 12rpx;
		font-size: 26rpx;
		color: #606266;
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
