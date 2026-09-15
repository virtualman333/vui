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
		border: 1px solid #dcdfe6;
		border-radius: 8rpx;
		background-color: #fff;
		/* #ifdef H5 */
		cursor: pointer;
		/* #endif */

		&.is-disabled {
			background-color: #f5f7fa;
			/* #ifdef H5 */
			cursor: not-allowed;
			/* #endif */
		}
	}

	&__value {
		flex: 1;
		font-size: 28rpx;
		color: #333;
	}

	&__placeholder {
		flex: 1;
		font-size: 28rpx;
		color: #c0c4cc;
	}

	&__clear {
		margin-left: 12rpx;
		font-size: 30rpx;
		color: #c0c4cc;
	}

	&__arrow {
		margin-left: 12rpx;
		font-size: 32rpx;
		color: #c0c4cc;
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
		background-color: #fff;
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
		border-bottom: 1px solid #f2f3f5;

		&.is-active {
			background-color: #f5f9ff;
		}

		&.is-disabled {
			opacity: 0.5;
		}
	}

	&__option-text {
		font-size: 28rpx;
		color: #606266;
	}

	&__option-icon {
		font-size: 28rpx;
		color: #2979ff;
	}
}
</style>
