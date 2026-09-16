<template>
	<view class="vui-progress">
		<view class="vui-progress__outer" :style="outerStyle">
			<view class="vui-progress__inner" :style="innerStyle">
				<text v-if="textInside && showText" class="vui-progress__text-inner" :style="textStyle">{{ text }}</text>
			</view>
		</view>
		<text v-if="!textInside && showText" class="vui-progress__text" :style="textStyle">{{ text }}</text>
	</view>
</template>

<script>
/* VUI 主题色（与 uni.scss 中 $vui-* 变量保持一致，可通过 props 覆盖） */
const VUI_COLOR = {
	primary: '#2979ff',
	success: '#18bc37',
	warning: '#f3a73f',
	error: '#e43d33',
};
/**
 * Progress 进度条
 * @description 展示操作或任务的当前进度
 * @property {Number} percentage 百分比 0-100
 * @property {Number|String} strokeWidth 进度条高度，数字按 rpx 处理，默认 12
 * @property {String} color 进度条颜色，优先级高于 status
 * @property {String} status 状态 primary / success / warning / error
 * @property {Boolean} showText 是否显示文字
 * @property {Boolean} textInside 文字是否内显
 * @property {String} format 自定义文字，支持 {value} 占位
 */
const STATUS_COLOR = {
	primary: VUI_COLOR.primary,
	success: VUI_COLOR.success,
	warning: VUI_COLOR.warning,
	error: VUI_COLOR.error
};

export default {
	name: 'VuiProgress',
	props: {
		percentage: {
			type: Number,
			default: 0
		},
		strokeWidth: {
			type: [Number, String],
			default: 12
		},
		color: {
			type: String,
			default: ''
		},
		status: {
			type: String,
			default: 'primary'
		},
		showText: {
			type: Boolean,
			default: true
		},
		textInside: {
			type: Boolean,
			default: false
		},
		format: {
			type: String,
			default: ''
		}
	},
	computed: {
		percent() {
			let val = Number(this.percentage) || 0;
			if (val < 0) val = 0;
			if (val > 100) val = 100;
			return val;
		},
		barHeight() {
			return typeof this.strokeWidth === 'number' ? this.strokeWidth + 'rpx' : this.strokeWidth;
		},
		barColor() {
			return this.color || STATUS_COLOR[this.status] || STATUS_COLOR.primary;
		},
		outerStyle() {
			return 'height:' + this.barHeight + ';border-radius:' + this.barHeight + ';';
		},
		innerStyle() {
			return 'width:' + this.percent + '%;background-color:' + this.barColor +
				';border-radius:' + this.barHeight + ';';
		},
		textStyle() {
			return 'color:' + this.barColor + ';font-size:24rpx;';
		},
		text() {
			if (this.format) return this.format.replace('{value}', this.percent);
			return this.percent + '%';
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
.vui-progress {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 100%;

	&__outer {
		flex: 1;
		overflow: hidden;
		background-color: $vui-track-color;
	}

	&__inner {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
		transition: width 0.3s;
	}

	&__text {
		margin-left: 12rpx;
		font-size: 24rpx;
	}

	&__text-inner {
		margin-right: 10rpx;
		font-size: 20rpx;
		color: $vui-text-color;
	}
}
</style>
