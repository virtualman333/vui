<template>
	<view class="vui-code">
		<view class="vui-code__header">
			<text class="vui-code__lang">{{ title || language || 'text' }}</text>
			<view v-if="showCopy" class="vui-code__copy" @click="onCopy">
				<text class="vui-code__copy-char">{{ copied ? '✓' : '⧉' }}</text>
				<text class="vui-code__copy-text">{{ copied ? '已复制' : '复制' }}</text>
			</view>
		</view>

		<scroll-view class="vui-code__body" scroll-y :style="bodyStyle">
			<scroll-view class="vui-code__scroll" :scroll-x="!wrap">
				<view v-for="(line, index) in lines" :key="index" class="vui-code__row">
					<text v-if="showLineNumbers" class="vui-code__ln">{{ index + 1 }}</text>
					<text class="vui-code__line" :class="{ 'vui-code__line--nowrap': !wrap }">{{ line || ' ' }}</text>
				</view>
			</scroll-view>
		</scroll-view>
	</view>
</template>

<script>
/**
 * 代码块
 * @description 展示代码片段，支持语言标签、行号、自动换行、最大高度限制与一键复制
 * @property {String} code 代码内容
 * @property {String} language 语言标识（仅用于展示标签）
 * @property {String} title 标题，不传则显示 language
 * @property {Boolean} showLineNumbers 是否显示行号
 * @property {Boolean} showCopy 是否显示复制按钮
 * @property {Boolean} wrap 是否自动换行
 * @property {String} maxHeight 最大高度，超出滚动
 * @event {Function} copy 点击复制按钮，参数为已复制的内容
 */
export default {
	name: 'VuiCode',
	emits: ['copy'],
	props: {
		code: {
			type: String,
			default: ''
		},
		language: {
			type: String,
			default: ''
		},
		title: {
			type: String,
			default: ''
		},
		showLineNumbers: {
			type: Boolean,
			default: false
		},
		showCopy: {
			type: Boolean,
			default: true
		},
		wrap: {
			type: Boolean,
			default: true
		},
		maxHeight: {
			type: String,
			default: '600rpx'
		}
	},
	data() {
		return {
			copied: false,
			timer: null
		};
	},
	computed: {
		lines() {
			const text = this.code === null || this.code === undefined ? '' : String(this.code);
			/* 去掉结尾多余的换行，避免渲染出一个空行 */
			return text.replace(/\n$/, '').split('\n');
		},
		bodyStyle() {
			return this.maxHeight ? 'max-height:' + this.maxHeight + ';' : '';
		}
	},
	beforeUnmount() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	},
	methods: {
		onCopy() {
			const data = this.code === null || this.code === undefined ? '' : String(this.code);
			if (!data) return;
			if (typeof uni === 'undefined' || typeof uni.setClipboardData !== 'function') return;
			try {
				uni.setClipboardData({
					data,
					showToast: false,
					success: () => {
						this.copied = true;
						this.$emit('copy', data);
						if (this.timer) clearTimeout(this.timer);
						this.timer = setTimeout(() => {
							this.copied = false;
							this.timer = null;
						}, 1500);
					}
				});
			} catch (err) {
				/* 静默失败：复制非核心功能，不打断使用 */
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
.vui-code {
	overflow: hidden;
	border-radius: 12rpx;
	background-color: #282c34;

	&__header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 14rpx 20rpx;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	&__lang {
		font-size: 22rpx;
		letter-spacing: 1rpx;
		color: rgba(255, 255, 255, 0.55);
	}

	&__copy {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 4rpx 12rpx;
		border-radius: 20rpx;
		background-color: rgba(255, 255, 255, 0.08);
	}

	&__copy-char {
		font-size: 22rpx;
		line-height: 1;
		color: rgba(255, 255, 255, 0.8);
	}

	&__copy-text {
		margin-left: 6rpx;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.8);
	}

	&__body {
		padding: 20rpx 0;
	}

	&__scroll {
		width: 100%;
	}

	&__row {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		padding: 0 24rpx;
	}

	&__ln {
		flex-shrink: 0;
		width: 48rpx;
		font-size: 24rpx;
		line-height: 1.7;
		text-align: right;
		color: rgba(255, 255, 255, 0.3);
	}

	&__line {
		flex: 1;
		min-width: 0;
		font-family: Consolas, Monaco, Menlo, monospace;
		font-size: 24rpx;
		line-height: 1.7;
		color: #abb2bf;
		white-space: pre-wrap;
		word-break: break-all;

		&--nowrap {
			white-space: pre;
			word-break: normal;
		}
	}
}
</style>
