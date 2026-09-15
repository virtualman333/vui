<template>
	<view class="vui-model-select" :class="{ 'vui-model-select--disabled': disabled }">
		<view class="vui-model-select__trigger" @click="onTrigger">
			<view class="vui-model-select__value-wrap">
				<view class="vui-model-select__value-row">
					<image
						v-if="currentIcon && isImage(currentIcon)"
						class="vui-model-select__icon-img"
						:src="currentIcon"
						mode="aspectFit"
					/>
					<text v-else-if="currentIcon" class="vui-model-select__icon-char">{{ currentIcon }}</text>
					<text class="vui-model-select__value" :class="{ 'vui-model-select__value--placeholder': !currentOption }">
						{{ currentOption ? currentOption.label : placeholder }}
					</text>
				</view>
				<text v-if="showDesc && currentOption && currentOption.desc" class="vui-model-select__desc">
					{{ currentOption.desc }}
				</text>
			</view>

			<text v-if="clearable && currentOption && !disabled" class="vui-model-select__clear" @click.stop="onClear">✕</text>
			<text class="vui-model-select__arrow" :class="{ 'vui-model-select__arrow--open': visible }">⌄</text>
		</view>

		<view v-if="visible" class="vui-model-select__mask" @click="close"></view>

		<view v-if="visible" class="vui-model-select__panel">
			<text v-if="title" class="vui-model-select__panel-title">{{ title }}</text>
			<scroll-view class="vui-model-select__list" scroll-y>
				<view
					v-for="(option, index) in options"
					:key="index"
					class="vui-model-select__option"
					:class="{
						'vui-model-select__option--active': option.value === modelValue,
						'vui-model-select__option--disabled': option.disabled
					}"
					@click="onSelect(option)"
				>
					<view class="vui-model-select__option-main">
						<view class="vui-model-select__option-row">
							<text class="vui-model-select__option-label">{{ option.label }}</text>
							<text v-if="option.tag" class="vui-model-select__option-tag">{{ option.tag }}</text>
						</view>
						<text v-if="option.desc" class="vui-model-select__option-desc">{{ option.desc }}</text>
					</view>
					<text v-if="option.value === modelValue" class="vui-model-select__option-check">✓</text>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
/**
 * 模型选择
 * @description 面向 AI 场景的模型选择器，选项支持描述文案与标签，触发器可展示当前模型的描述
 * @property {String} modelValue 选中值，支持 v-model
 * @property {Array} options 模型列表 [{ label, value, desc, tag, icon, disabled }]
 * @property {String} title 弹层标题
 * @property {String} placeholder 占位文案
 * @property {Boolean} disabled 是否禁用
 * @property {Boolean} clearable 是否可清空
 * @property {Boolean} showDesc 是否在触发器上显示当前模型的描述
 * @event {Function} update:modelValue 选中值变化
 * @event {Function} change 选中值变化时触发，参数为选中项对象
 */
export default {
	name: 'VuiModelSelect',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: String,
			default: ''
		},
		options: {
			type: Array,
			default: () => []
		},
		title: {
			type: String,
			default: '选择模型'
		},
		placeholder: {
			type: String,
			default: '请选择模型'
		},
		disabled: {
			type: Boolean,
			default: false
		},
		clearable: {
			type: Boolean,
			default: false
		},
		showDesc: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			visible: false
		};
	},
	computed: {
		currentOption() {
			const list = this.options || [];
			for (let i = 0; i < list.length; i++) {
				if (list[i] && list[i].value === this.modelValue) return list[i];
			}
			return null;
		},
		currentIcon() {
			return this.currentOption && this.currentOption.icon ? this.currentOption.icon : '';
		}
	},
	methods: {
		isImage(v) {
			const s = v || '';
			return /^(https?:|data:|\/|\.\/|\.\.\/)/i.test(s) || /\.(png|jpe?g|gif|svg|webp)$/i.test(s);
		},
		onTrigger() {
			if (this.disabled) return;
			this.visible = !this.visible;
		},
		open() {
			if (this.disabled) return;
			this.visible = true;
		},
		close() {
			this.visible = false;
		},
		onClear() {
			if (this.disabled) return;
			this.$emit('update:modelValue', '');
			this.$emit('change', null);
		},
		onSelect(option) {
			if (!option || option.disabled) return;
			this.$emit('update:modelValue', option.value);
			this.$emit('change', option);
			this.visible = false;
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
.vui-model-select {
	position: relative;
	width: 100%;

	&--disabled {
		opacity: 0.6;
	}

	&__trigger {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		min-height: 88rpx;
		padding: 16rpx 24rpx;
		border-radius: 16rpx;
		border: 1px solid $vui-border-color;
		background-color: $vui-bg-color;
		box-sizing: border-box;
	}

	&__value-wrap {
		flex: 1;
		min-width: 0;
	}

	&__value-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	&__icon-img {
		width: 36rpx;
		height: 36rpx;
		margin-right: 12rpx;
	}

	&__icon-char {
		margin-right: 12rpx;
		font-size: 30rpx;
		line-height: 1;
	}

	&__value {
		flex: 1;
		min-width: 0;
		font-size: 28rpx;
		color: $vui-text-color;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;

		&--placeholder {
			color: $vui-text-color-placeholder;
		}
	}

	&__desc {
		display: block;
		margin-top: 6rpx;
		font-size: 22rpx;
		color: $vui-text-color-secondary;
	}

	&__clear {
		flex-shrink: 0;
		margin-left: 12rpx;
		font-size: 24rpx;
		color: $vui-text-color-placeholder;
	}

	&__arrow {
		flex-shrink: 0;
		margin-left: 12rpx;
		font-size: 32rpx;
		line-height: 1;
		color: $vui-text-color-placeholder;
		transition: transform 0.2s;

		&--open {
			transform: rotate(180deg);
		}
	}

	&__mask {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 98;
		background-color: rgba(0, 0, 0, 0.35);
	}

	&__panel {
		position: absolute;
		left: 0;
		right: 0;
		top: 100%;
		z-index: 99;
		margin-top: 12rpx;
		padding: 16rpx 0;
		border-radius: 16rpx;
		background-color: $vui-bg-color;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
	}

	&__panel-title {
		display: block;
		padding: 8rpx 24rpx 16rpx;
		font-size: 24rpx;
		color: $vui-text-color-secondary;
	}

	&__list {
		max-height: 560rpx;
	}

	&__option {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 24rpx;

		&--active {
			background-color: $vui-active-bg-color;

			.vui-model-select__option-label {
				color: $vui-primary;
			}
		}

		&--disabled {
			opacity: 0.4;
		}
	}

	&__option-main {
		flex: 1;
		min-width: 0;
	}

	&__option-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	&__option-label {
		font-size: 28rpx;
		color: $vui-text-color;
	}

	&__option-tag {
		margin-left: 12rpx;
		padding: 2rpx 12rpx;
		border-radius: 8rpx;
		font-size: 20rpx;
		color: $vui-primary;
		background-color: $vui-active-bg-color;
	}

	&__option-desc {
		display: block;
		margin-top: 6rpx;
		font-size: 22rpx;
		color: $vui-text-color-secondary;
	}

	&__option-check {
		flex-shrink: 0;
		margin-left: 16rpx;
		font-size: 28rpx;
		color: $vui-primary;
	}
}
</style>
