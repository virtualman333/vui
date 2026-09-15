<template>
	<view class="vui-chat-bubble" :class="['vui-chat-bubble--' + placement]" @click="onClick" @longpress="onLongpress">
		<view v-if="showAvatar" class="vui-chat-bubble__avatar">
			<slot name="avatar">
				<image v-if="avatar" class="vui-chat-bubble__avatar-img" :src="avatar" mode="aspectFill" />
				<view v-else class="vui-chat-bubble__avatar-text">
					<text class="vui-chat-bubble__avatar-char">{{ initial }}</text>
				</view>
			</slot>
		</view>

		<view class="vui-chat-bubble__main">
			<text v-if="name" class="vui-chat-bubble__name">{{ name }}</text>

			<view class="vui-chat-bubble__body" :style="bodyStyle">
				<slot>
					<view v-if="isPending" class="vui-chat-bubble__dots">
						<view class="vui-chat-bubble__dot"></view>
						<view class="vui-chat-bubble__dot"></view>
						<view class="vui-chat-bubble__dot"></view>
					</view>
					<text v-else class="vui-chat-bubble__text" :style="textStyle" :selectable="selectable">{{ content }}</text>
				</slot>
			</view>

			<view v-if="status === 'error' || time || $slots.footer" class="vui-chat-bubble__footer">
				<text v-if="status === 'error'" class="vui-chat-bubble__error">生成失败</text>
				<text v-if="time" class="vui-chat-bubble__time">{{ time }}</text>
				<slot name="footer"></slot>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * AI 对话消息气泡
 * @description 展示 AI 对话中的单条消息，支持左右布局、头像、名称、流式加载态、错误态与底部自定义区域
 * @property {String} content 消息文本内容
 * @property {String} placement 气泡位置 left / right，默认 left
 * @property {String} avatar 头像图片地址
 * @property {String} name 名称
 * @property {Boolean} showAvatar 是否显示头像
 * @property {String} status 消息状态 '' / loading / error
 * @property {String} time 时间文本
 * @property {String} maxWidth 气泡最大宽度
 * @property {String} color 气泡背景色
 * @property {String} textColor 文字颜色
 * @property {Boolean} selectable 文字是否可选中
 * @event {Function} click 点击气泡时触发
 * @event {Function} longpress 长按气泡时触发
 */
export default {
	name: 'VuiChatBubble',
	emits: ['click', 'longpress'],
	props: {
		content: {
			type: String,
			default: ''
		},
		placement: {
			type: String,
			default: 'left'
		},
		avatar: {
			type: String,
			default: ''
		},
		name: {
			type: String,
			default: ''
		},
		showAvatar: {
			type: Boolean,
			default: true
		},
		status: {
			type: String,
			default: ''
		},
		time: {
			type: String,
			default: ''
		},
		maxWidth: {
			type: String,
			default: '76%'
		},
		color: {
			type: String,
			default: ''
		},
		textColor: {
			type: String,
			default: ''
		},
		selectable: {
			type: Boolean,
			default: true
		}
	},
	computed: {
		isPending() {
			return this.status === 'loading' && !this.content;
		},
		initial() {
			if (this.name) return this.name.slice(0, 1);
			return this.placement === 'right' ? '我' : 'AI';
		},
		bodyStyle() {
			let style = 'max-width:' + this.maxWidth + ';';
			if (this.color) style += 'background-color:' + this.color + ';';
			return style;
		},
		textStyle() {
			return this.textColor ? 'color:' + this.textColor + ';' : '';
		}
	},
	methods: {
		onClick() {
			this.$emit('click');
		},
		onLongpress() {
			this.$emit('longpress');
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
.vui-chat-bubble {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	width: 100%;
	box-sizing: border-box;

	&--right {
		flex-direction: row-reverse;

		.vui-chat-bubble__main {
			align-items: flex-end;
		}

		.vui-chat-bubble__name,
		.vui-chat-bubble__footer {
			text-align: right;
		}

		.vui-chat-bubble__body {
			background-color: $vui-primary;
			border-top-right-radius: 4rpx;
		}

		.vui-chat-bubble__text {
			color: $vui-text-color-inverse;
		}
	}

	&__avatar {
		flex-shrink: 0;
		width: 72rpx;
		height: 72rpx;
		margin-top: 4rpx;
	}

	&__avatar-img {
		width: 72rpx;
		height: 72rpx;
		border-radius: 16rpx;
	}

	&__avatar-text {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72rpx;
		height: 72rpx;
		border-radius: 16rpx;
		background-color: $vui-fill-color-light;
	}

	&__avatar-char {
		font-size: 26rpx;
		color: $vui-text-color-secondary;
	}

	&__main {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		margin: 0 20rpx;
	}

	&__name {
		margin-bottom: 8rpx;
		font-size: 24rpx;
		color: $vui-text-color-secondary;
	}

	&__body {
		position: relative;
		padding: 20rpx 24rpx;
		border-radius: 16rpx;
		border-top-left-radius: 4rpx;
		background-color: $vui-bg-color-hover;
	}

	&__text {
		font-size: 28rpx;
		line-height: 1.6;
		color: $vui-text-color;
		word-break: break-all;
	}

	&__dots {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 36rpx;
	}

	&__dot {
		width: 12rpx;
		height: 12rpx;
		margin-right: 10rpx;
		border-radius: 50%;
		background-color: $vui-text-color-placeholder;
		animation: vui-bubble-blink 1.2s infinite ease-in-out;

		&:nth-child(2) {
			animation-delay: 0.2s;
		}

		&:nth-child(3) {
			margin-right: 0;
			animation-delay: 0.4s;
		}
	}

	&__footer {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 8rpx;
		font-size: 22rpx;
	}

	&__error {
		margin-right: 12rpx;
		color: $vui-error;
	}

	&__time {
		color: $vui-text-color-placeholder;
	}
}

@keyframes vui-bubble-blink {
	0%,
	80%,
	100% {
		opacity: 0.3;
	}
	40% {
		opacity: 1;
	}
}
</style>
