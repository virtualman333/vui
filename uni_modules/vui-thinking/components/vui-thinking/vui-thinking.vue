<template>
	<view class="vui-thinking">
		<view class="vui-thinking__header" @click="toggle">
			<view class="vui-thinking__title-wrap">
				<view v-if="loading" class="vui-thinking__spinner"></view>
				<text class="vui-thinking__title">{{ title }}</text>
				<text v-if="stateText" class="vui-thinking__state">{{ stateText }}</text>
			</view>
			<text class="vui-thinking__arrow" :class="{ 'vui-thinking__arrow--open': innerVisible }">›</text>
		</view>

		<view v-show="innerVisible" class="vui-thinking__body" :style="bodyStyle">
			<slot>
				<text class="vui-thinking__content" selectable>{{ content }}</text>
			</slot>
		</view>
	</view>
</template>

<script>
/**
 * AI 推理过程展示
 * @description 可折叠的推理过程面板，展示模型的思考内容、耗时与进行中状态
 * @property {Boolean} modelValue 是否展开，支持 v-model
 * @property {String} title 标题文案
 * @property {String} content 推理正文
 * @property {Boolean} loading 是否仍在推理中
 * @property {Number} duration 耗时秒数
 * @property {String} maxHeight 展开后最大高度
 * @property {Boolean} defaultExpand 初始是否展开
 * @event {Function} update:modelValue 展开状态变化
 * @event {Function} toggle 展开状态变化时触发，参数为当前是否展开
 * @slot default 推理正文，覆盖 content
 */
export default {
	name: 'VuiThinking',
	emits: ['update:modelValue', 'toggle'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		title: {
			type: String,
			default: '思考过程'
		},
		content: {
			type: String,
			default: ''
		},
		loading: {
			type: Boolean,
			default: false
		},
		duration: {
			type: Number,
			default: 0
		},
		maxHeight: {
			type: String,
			default: '600rpx'
		},
		defaultExpand: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			innerVisible: this.modelValue || this.defaultExpand
		};
	},
	computed: {
		stateText() {
			if (this.loading) return '思考中';
			if (this.duration > 0) return '已思考 ' + this.duration + 's';
			return '';
		},
		bodyStyle() {
			return this.maxHeight ? 'max-height:' + this.maxHeight + ';' : '';
		}
	},
	watch: {
		modelValue(val) {
			if (val !== this.innerVisible) {
				this.innerVisible = val;
			}
		}
	},
	methods: {
		/** 切换展开状态 */
		toggle() {
			this.innerVisible = !this.innerVisible;
			this.$emit('update:modelValue', this.innerVisible);
			this.$emit('toggle', this.innerVisible);
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
.vui-thinking {
	margin: 16rpx 0;
	border-radius: 12rpx;
	border: 1px solid $vui-border-color-light;
	background-color: $vui-fill-color-lighter;
	overflow: hidden;

	&__header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 18rpx 24rpx;
	}

	&__title-wrap {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex: 1;
		min-width: 0;
	}

	&__title {
		font-size: 26rpx;
		color: $vui-text-color-regular;
	}

	&__state {
		margin-left: 16rpx;
		font-size: 24rpx;
		color: $vui-text-color-placeholder;
	}

	&__spinner {
		width: 22rpx;
		height: 22rpx;
		margin-right: 12rpx;
		border-radius: 50%;
		border: 3rpx solid $vui-border-color;
		border-top-color: $vui-primary;
		animation: vui-thinking-spin 0.8s linear infinite;
	}

	&__arrow {
		flex-shrink: 0;
		margin-left: 16rpx;
		font-size: 32rpx;
		line-height: 1;
		color: $vui-text-color-placeholder;
		transition: transform 0.2s;
		transform-origin: center center;

		&--open {
			transform: rotate(90deg);
		}
	}

	&__body {
		padding: 0 24rpx 20rpx;
		overflow-y: auto;
	}

	&__content {
		font-size: 25rpx;
		line-height: 1.7;
		color: $vui-text-color-secondary;
		word-break: break-all;
		white-space: pre-wrap;
	}
}

@keyframes vui-thinking-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
