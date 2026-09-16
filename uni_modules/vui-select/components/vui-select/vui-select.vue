<template>
	<view class="vui-select">
		<view class="vui-select__inner" :class="{ 'is-disabled': disabled }" @click="onToggle">
			<text v-if="currentLabel" class="vui-select__value">{{ currentLabel }}</text>
			<text v-else class="vui-select__placeholder">{{ placeholder }}</text>
			<text v-if="clearable && currentLabel && !disabled" class="vui-select__clear" @click.stop="onClear">×</text>
			<text class="vui-select__arrow" :class="{ 'is-open': visible }">›</text>
		</view>
		<view v-if="visible" class="vui-select__mask" @click="onClose"></view>
		<view v-if="visible" class="vui-select__dropdown">
			<scroll-view class="vui-select__list" :style="listStyle" scroll-y>
				<view
					v-for="(option, index) in list"
					:key="index"
					class="vui-select__option"
					:class="{ 'is-active': option.value === modelValue, 'is-disabled': option.disabled }"
					@click="onSelect(option)"
				>
					<text class="vui-select__option-text">{{ option.label }}</text>
					<text v-if="option.value === modelValue" class="vui-select__option-icon">✓</text>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
/**
 * Select 下拉选择
 * @description 提供下拉选择器的组件，支持 v-model
 * @property {String|Number} modelValue 选中值，支持 v-model
 * @property {Array} options 选项数据 [{label, value, disabled}]，也支持字符串数组
 * @property {String} placeholder 占位文案
 * @property {Boolean} disabled 是否禁用
 * @property {Boolean} clearable 是否可清空
 * @property {String} maxHeight 下拉最大高度
 * @event {Function} change 选中值变化时触发
 */
export default {
	name: 'VuiSelect',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: [String, Number],
			default: ''
		},
		options: {
			type: Array,
			default: () => []
		},
		placeholder: {
			type: String,
			default: '请选择'
		},
		disabled: {
			type: Boolean,
			default: false
		},
		clearable: {
			type: Boolean,
			default: false
		},
		maxHeight: {
			type: String,
			default: '400rpx'
		}
	},
	data() {
		return {
			visible: false
		};
	},
	computed: {
		list() {
			return (this.options || []).map((item) => {
				if (typeof item === 'string' || typeof item === 'number') {
					return { label: String(item), value: item, disabled: false };
				}
				return item;
			});
		},
		currentLabel() {
			const hit = this.list.filter((item) => item.value === this.modelValue)[0];
			return hit ? hit.label : '';
		},
		listStyle() {
			return 'max-height:' + this.maxHeight + ';';
		}
	},
	methods: {
		onToggle() {
			if (this.disabled) return;
			this.visible = !this.visible;
		},
		onClose() {
			this.visible = false;
		},
		onSelect(option) {
			if (option.disabled) return;
			this.visible = false;
			if (option.value === this.modelValue) return;
			this.$emit('update:modelValue', option.value);
			this.$emit('change', option.value, option);
		},
		onClear() {
			this.visible = false;
			this.$emit('update:modelValue', '');
			this.$emit('change', '');
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
.vui-select {
	position: relative;
	width: 100%;

	&__inner {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 72rpx;
		padding: 0 20rpx;
		box-sizing: border-box;
		border: 1px solid $vui-border-color;
		border-radius: 8rpx;
		background-color: $vui-bg-color;
		/* #ifdef H5 */
		cursor: pointer;
		/* #endif */

		&.is-disabled {
			background-color: $vui-fill-color-light;
			/* #ifdef H5 */
			cursor: not-allowed;
			/* #endif */
		}
	}

	&__value {
		flex: 1;
		font-size: 28rpx;
		color: $vui-text-color;
	}

	&__placeholder {
		flex: 1;
		font-size: 28rpx;
		color: $vui-text-color-placeholder;
	}

	&__clear {
		margin-left: 12rpx;
		font-size: 30rpx;
		color: $vui-text-color-placeholder;
	}

	&__arrow {
		margin-left: 12rpx;
		font-size: 32rpx;
		color: $vui-text-color-placeholder;
		transform: rotate(90deg);
		transition: transform 0.2s;

		&.is-open {
			transform: rotate(-90deg);
		}
	}

	&__mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 998;
	}

	&__dropdown {
		position: absolute;
		left: 0;
		right: 0;
		top: 100%;
		z-index: 999;
		margin-top: 8rpx;
		border-radius: 8rpx;
		background-color: $vui-bg-color;
		box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.12);
	}

	&__list {
		max-height: 400rpx;
	}

	&__option {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx;
		border-bottom: 1px solid $vui-bg-color-hover;

		&.is-active {
			background-color: $vui-active-bg-color;
		}

		&.is-disabled {
			opacity: 0.5;
		}
	}

	&__option-text {
		font-size: 28rpx;
		color: $vui-text-color-regular;
	}

	&__option-icon {
		font-size: 28rpx;
		color: $vui-primary;
	}
}
</style>
