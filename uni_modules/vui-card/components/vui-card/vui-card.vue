<template>
	<view class="vui-card" :class="{ 'vui-card--shadow': shadow, 'vui-card--border': border }" :style="cardStyle">
		<view v-if="title || extra || $slots.header || $slots.extra" class="vui-card__header">
			<slot name="header">
				<text class="vui-card__title">{{ title }}</text>
				<view class="vui-card__extra">
					<slot name="extra">{{ extra }}</slot>
				</view>
			</slot>
		</view>
		<view class="vui-card__body" :style="bodyStyle">
			<slot></slot>
		</view>
		<view v-if="$slots.footer" class="vui-card__footer">
			<slot name="footer"></slot>
		</view>
	</view>
</template>

<script>
/**
 * Card 卡片
 * @description 将信息聚合在卡片容器中展示
 * @property {String} title 标题
 * @property {String} extra 头部右侧附加内容
 * @property {Boolean} shadow 是否显示阴影
 * @property {Boolean} border 是否显示边框
 * @property {String} padding 内容内边距
 * @property {String} radius 圆角
 */
export default {
	name: 'VuiCard',
	props: {
		title: {
			type: String,
			default: ''
		},
		extra: {
			type: String,
			default: ''
		},
		shadow: {
			type: Boolean,
			default: true
		},
		border: {
			type: Boolean,
			default: false
		},
		padding: {
			type: String,
			default: '24rpx'
		},
		radius: {
			type: String,
			default: '16rpx'
		}
	},
	computed: {
		cardStyle() {
			return 'border-radius:' + this.radius + ';';
		},
		bodyStyle() {
			return 'padding:' + this.padding + ';';
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
.vui-card {
	overflow: hidden;
	background-color: $vui-bg-color;

	&--shadow {
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
	}

	&--border {
		border: 1px solid $vui-border-color-lighter;
	}

	&__header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx;
		border-bottom: 1px solid #f2f3f5;
	}

	&__title {
		font-size: 30rpx;
		font-weight: bold;
		color: $vui-text-color;
	}

	&__extra {
		font-size: 26rpx;
		color: $vui-text-color-secondary;
	}

	&__body {
		font-size: 28rpx;
		color: $vui-text-color-regular;
	}

	&__footer {
		padding: 24rpx;
		border-top: 1px solid #f2f3f5;
	}
}
</style>
