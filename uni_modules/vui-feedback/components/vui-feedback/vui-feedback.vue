<template>
	<view class="vui-feedback">
		<view
			class="vui-feedback__item"
			:class="{ 'vui-feedback__item--active': current === 'like', 'vui-feedback__item--disabled': disabled }"
			@click="onSelect('like')"
		>
			<text class="vui-feedback__char">👍</text>
			<text v-if="showText" class="vui-feedback__text">{{ likeText }}</text>
		</view>

		<view
			class="vui-feedback__item"
			:class="{ 'vui-feedback__item--active': current === 'dislike', 'vui-feedback__item--disabled': disabled }"
			@click="onSelect('dislike')"
		>
			<text class="vui-feedback__char">👎</text>
			<text v-if="showText" class="vui-feedback__text">{{ dislikeText }}</text>
		</view>

		<slot></slot>
	</view>
</template>

<script>
/**
 * AI 回答评价
 * @description AI 回答下方的赞/踩评价控件，再次点击同一项可取消选中
 * @property {String} modelValue 当前评价 '' / like / dislike，支持 v-model
 * @property {String} likeText 赞同文案
 * @property {String} dislikeText 不赞同文案
 * @property {Boolean} showText 是否显示文案
 * @property {Boolean} disabled 是否禁用
 * @event {Function} update:modelValue 评价变化
 * @event {Function} change 评价变化时触发，参数为当前值
 * @event {Function} like 选中赞同
 * @event {Function} dislike 选中不赞同
 */
export default {
	name: 'VuiFeedback',
	emits: ['update:modelValue', 'change', 'like', 'dislike'],
	props: {
		modelValue: {
			type: String,
			default: ''
		},
		likeText: {
			type: String,
			default: '有帮助'
		},
		dislikeText: {
			type: String,
			default: '没帮助'
		},
		showText: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		current() {
			return this.modelValue || '';
		}
	},
	methods: {
		onSelect(type) {
			if (this.disabled) return;
			/* 再次点击同一项 => 取消评价 */
			const next = this.current === type ? '' : type;
			this.$emit('update:modelValue', next);
			this.$emit('change', next);
			if (next === 'like') this.$emit('like');
			if (next === 'dislike') this.$emit('dislike');
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
.vui-feedback {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;

	&__item {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 52rpx;
		margin-right: 16rpx;
		padding: 0 20rpx;
		border-radius: 26rpx;
		border: 1px solid $vui-border-color-light;
		background-color: $vui-bg-color;

		&--active {
			border-color: $vui-primary;
			background-color: $vui-active-bg-color;

			.vui-feedback__text {
				color: $vui-primary;
			}
		}

		&--disabled {
			opacity: 0.5;
		}
	}

	&__char {
		font-size: 26rpx;
		line-height: 1;
	}

	&__text {
		margin-left: 8rpx;
		font-size: 24rpx;
		color: $vui-text-color-secondary;
	}
}
</style>
