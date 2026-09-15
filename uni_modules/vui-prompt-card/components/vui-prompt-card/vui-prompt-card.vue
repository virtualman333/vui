<template>
	<view
		class="vui-prompt-card"
		:class="{ 'vui-prompt-card--selected': isSelected, 'vui-prompt-card--disabled': disabled }"
		@click="onClick"
	>
		<view class="vui-prompt-card__head">
			<view v-if="icon" class="vui-prompt-card__icon">
				<image v-if="isImage" class="vui-prompt-card__icon-img" :src="icon" mode="aspectFit" />
				<text v-else class="vui-prompt-card__icon-char">{{ icon }}</text>
			</view>
			<text class="vui-prompt-card__title">{{ title }}</text>
			<view v-if="selectable" class="vui-prompt-card__check" :class="{ 'vui-prompt-card__check--on': isSelected }">
				<text class="vui-prompt-card__check-char">{{ isSelected ? '✓' : '' }}</text>
			</view>
		</view>

		<text v-if="content" class="vui-prompt-card__content" :style="contentStyle">{{ content }}</text>

		<view v-if="tags && tags.length" class="vui-prompt-card__tags">
			<text v-for="(tag, index) in tags" :key="index" class="vui-prompt-card__tag">{{ tag }}</text>
		</view>
	</view>
</template>

<script>
/**
 * 提示词卡片
 * @description 展示一条提示词模板，支持图标、标签、多行截断与选中态，常用于提示词库选择
 * @property {Boolean} modelValue 是否选中，支持 v-model
 * @property {String} title 标题
 * @property {String} content 提示词内容
 * @property {Array} tags 标签数组
 * @property {String} icon 图标字符或图片地址
 * @property {Boolean} disabled 是否禁用
 * @property {Boolean} selectable 是否可选中
 * @property {Number} maxLines 内容最大行数
 * @event {Function} click 点击卡片时触发
 * @event {Function} update:modelValue 选中状态变化
 * @event {Function} change 选中状态变化时触发，参数为当前是否选中
 */
export default {
	name: 'VuiPromptCard',
	emits: ['click', 'update:modelValue', 'change'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		title: {
			type: String,
			default: ''
		},
		content: {
			type: String,
			default: ''
		},
		tags: {
			type: Array,
			default: () => []
		},
		icon: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			default: false
		},
		selectable: {
			type: Boolean,
			default: true
		},
		maxLines: {
			type: Number,
			default: 2
		}
	},
	computed: {
		isSelected() {
			return !!this.modelValue;
		},
		isImage() {
			const v = this.icon || '';
			return /^(https?:|data:|\/|\.\/|\.\.\/)/i.test(v) || /\.(png|jpe?g|gif|svg|webp)$/i.test(v);
		},
		contentStyle() {
			if (!this.maxLines || this.maxLines <= 0) return '';
			return 'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' +
				this.maxLines + ';overflow:hidden;';
		}
	},
	methods: {
		onClick() {
			if (this.disabled) return;
			this.$emit('click');
			if (!this.selectable) return;
			const next = !this.isSelected;
			this.$emit('update:modelValue', next);
			this.$emit('change', next);
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
.vui-prompt-card {
	padding: 24rpx;
	border-radius: 16rpx;
	border: 1px solid $vui-border-color-light;
	background-color: $vui-bg-color;

	&--selected {
		border-color: $vui-primary;
		background-color: $vui-active-bg-color;
	}

	&--disabled {
		opacity: 0.5;
	}

	&__head {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	&__icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 52rpx;
		height: 52rpx;
		margin-right: 16rpx;
		border-radius: 12rpx;
		background-color: $vui-fill-color-light;
	}

	&__icon-img {
		width: 32rpx;
		height: 32rpx;
	}

	&__icon-char {
		font-size: 28rpx;
		line-height: 1;
	}

	&__title {
		flex: 1;
		min-width: 0;
		font-size: 28rpx;
		font-weight: bold;
		color: $vui-text-color;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	&__check {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36rpx;
		height: 36rpx;
		margin-left: 16rpx;
		border-radius: 50%;
		border: 1px solid $vui-border-color;

		&--on {
			border-color: $vui-primary;
			background-color: $vui-primary;
		}
	}

	&__check-char {
		font-size: 22rpx;
		line-height: 1;
		color: $vui-text-color-inverse;
	}

	&__content {
		display: block;
		margin-top: 12rpx;
		font-size: 26rpx;
		line-height: 1.6;
		color: $vui-text-color-secondary;
		word-break: break-all;
	}

	&__tags {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		margin-top: 16rpx;
	}

	&__tag {
		margin: 0 12rpx 8rpx 0;
		padding: 4rpx 14rpx;
		border-radius: 8rpx;
		font-size: 22rpx;
		color: $vui-text-color-secondary;
		background-color: $vui-fill-color-light;
	}
}
</style>
