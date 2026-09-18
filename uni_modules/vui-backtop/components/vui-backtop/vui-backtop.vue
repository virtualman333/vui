<template>
	<view v-if="visible" class="vui-backtop" :style="wrapStyle" @click="onBackTop">
		<slot>
			<text class="vui-backtop__icon">↑</text>
			<text v-if="text" class="vui-backtop__text">{{ text }}</text>
		</slot>
	</view>
</template>

<script>
/**
 * Backtop 回到顶部
 * @description 返回页面顶部的操作按钮，需要页面在 onPageScroll 中把 scrollTop 传入
 * @property {Number} scrollTop 页面滚动距离
 * @property {Number} visibilityHeight 滚动高度达到该值时显示
 * @property {String} right 距离右侧位置
 * @property {String} bottom 距离底部位置
 * @property {Number} duration 回到顶部的动画时长
 * @property {String} text 按钮文案
 * @event {Function} click 点击时触发
 * @slot default 按钮内容，覆盖默认的 ↑ 图标与 text 文案
 */
export default {
	name: 'VuiBacktop',
	emits: ['click'],
	props: {
		scrollTop: {
			type: Number,
			default: 0
		},
		visibilityHeight: {
			type: Number,
			default: 200
		},
		right: {
			type: String,
			default: '40rpx'
		},
		bottom: {
			type: String,
			default: '80rpx'
		},
		duration: {
			type: Number,
			default: 300
		},
		text: {
			type: String,
			default: ''
		}
	},
	computed: {
		visible() {
			return (Number(this.scrollTop) || 0) >= (Number(this.visibilityHeight) || 0);
		},
		wrapStyle() {
			return 'right:' + this.right + ';bottom:' + this.bottom + ';';
		}
	},
	methods: {
		onBackTop() {
			uni.pageScrollTo({
				scrollTop: 0,
				duration: this.duration
			});
			this.$emit('click');
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
.vui-backtop {
	position: fixed;
	z-index: 999;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background-color: $vui-bg-color;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.15);
	/* #ifdef H5 */
	cursor: pointer;
	/* #endif */

	&__icon {
		font-size: 34rpx;
		color: $vui-primary;
	}

	&__text {
		margin-top: 2rpx;
		font-size: 18rpx;
		color: $vui-primary;
	}
}
</style>
