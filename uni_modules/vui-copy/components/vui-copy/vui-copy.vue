<template>
	<view class="vui-copy" :class="{ 'vui-copy--success': copied }" @click.stop="onCopy">
		<text v-if="showIcon" class="vui-copy__icon">{{ copied ? '✓' : '⧉' }}</text>
		<text v-if="text" class="vui-copy__text">{{ copied ? successText : text }}</text>
	</view>
</template>

<script>
/**
 * 一键复制
 * @description 点击后将指定内容写入系统剪贴板，并在指定时间内回显成功状态
 * @property {String} content 需要复制的内容
 * @property {String} text 按钮显示文案
 * @property {Boolean} showIcon 是否显示图标
 * @property {String} successText 复制成功提示文案
 * @property {Number} duration 提示停留时间
 * @event {Function} success 复制成功，参数为已复制的内容
 * @event {Function} error 复制失败，参数为错误对象
 */
export default {
	name: 'VuiCopy',
	emits: ['success', 'error'],
	props: {
		content: {
			type: String,
			default: ''
		},
		text: {
			type: String,
			default: '复制'
		},
		showIcon: {
			type: Boolean,
			default: true
		},
		successText: {
			type: String,
			default: '已复制'
		},
		duration: {
			type: Number,
			default: 1500
		}
	},
	data() {
		return {
			copied: false,
			timer: null
		};
	},
	beforeUnmount() {
		this.clearTimer();
	},
	methods: {
		/** 执行复制 */
		onCopy() {
			const data = this.content === null || this.content === undefined ? '' : String(this.content);
			if (!data) {
				this.$emit('error', new Error('vui-copy: content 为空'));
				return;
			}
			if (typeof uni === 'undefined' || typeof uni.setClipboardData !== 'function') {
				this.$emit('error', new Error('vui-copy: 当前环境不支持剪贴板'));
				return;
			}
			try {
				uni.setClipboardData({
					data,
					/* 部分平台会自动弹 toast，交由组件自身回显以免重复 */
					showToast: false,
					success: () => {
						this.copied = true;
						this.$emit('success', data);
						this.clearTimer();
						if (this.duration > 0) {
							this.timer = setTimeout(() => {
								this.copied = false;
								this.timer = null;
							}, this.duration);
						}
					},
					fail: (err) => {
						this.$emit('error', err);
					}
				});
			} catch (err) {
				this.$emit('error', err);
			}
		},
		/** 内部：清理回显定时器 */
		clearTimer() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
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
.vui-copy {
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	height: 52rpx;
	padding: 0 20rpx;
	border-radius: 26rpx;
	border: 1px solid $vui-border-color-light;
	background-color: $vui-bg-color;

	&--success {
		border-color: $vui-success;

		.vui-copy__icon,
		.vui-copy__text {
			color: $vui-success;
		}
	}

	&__icon {
		font-size: 26rpx;
		line-height: 1;
		color: $vui-text-color-secondary;
	}

	&__text {
		margin-left: 8rpx;
		font-size: 24rpx;
		color: $vui-text-color-secondary;
	}
}
</style>
