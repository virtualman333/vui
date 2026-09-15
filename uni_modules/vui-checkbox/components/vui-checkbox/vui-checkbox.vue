<template>
	<view class="vui-checkbox" :class="{ 'vui-checkbox--disabled': disabled }" @click="onToggle">
		<view
			class="vui-checkbox__icon"
			:class="{ 'is-checked': isChecked || indeterminate }"
			:style="iconStyle"
		>
			<text v-if="indeterminate" class="vui-checkbox__mark" :style="markStyle">−</text>
			<text v-else-if="isChecked" class="vui-checkbox__mark" :style="markStyle">✓</text>
		</view>
		<text class="vui-checkbox__label" :style="labelStyle"><slot>{{ label }}</slot></text>
	</view>
</template>

<script>
/**
 * Checkbox 复选框
 * @description 复选框，支持 v-model 与半选状态
 * @property {Boolean} modelValue 是否选中，支持 v-model
 * @property {String} label 文本内容
 * @property {Boolean} disabled 是否禁用
 * @property {Boolean} indeterminate 是否为半选状态
 * @property {String} color 选中颜色
 * @property {Number|String} size 图标尺寸，数字按 rpx 处理，默认 36
 * @event {Function} change 选中状态变化时触发
 */
export default {
	name: 'VuiCheckbox',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		label: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			default: false
		},
		indeterminate: {
			type: Boolean,
			default: false
		},
		color: {
			type: String,
			default: ''
		},
		size: {
			type: [Number, String],
			default: 36
		}
	},
	computed: {
		isChecked() {
			return this.modelValue === true;
		},
		iconSize() {
			return typeof this.size === 'number' ? this.size + 'rpx' : this.size;
		},
		activeColor() {
			return this.disabled ? '#c0c4cc' : this.color || '#2979ff';
		},
		iconStyle() {
			return 'width:' + this.iconSize + ';height:' + this.iconSize + ';' +
				'border-color:' + (this.isChecked || this.indeterminate ? this.activeColor : '#dcdfe6') + ';' +
				'background-color:' + (this.isChecked || this.indeterminate ? this.activeColor : 'transparent') + ';';
		},
		markStyle() {
			const num = typeof this.size === 'number' ? this.size : parseFloat(this.size) || 36;
			return 'font-size:' + num * 0.7 + 'rpx;line-height:' + num * 0.7 + 'rpx;color:#fff;';
		},
		labelStyle() {
			return this.disabled ? 'color:#c0c4cc;' : '';
		}
	},
	methods: {
		onToggle() {
			if (this.disabled) return;
			const next = !this.isChecked;
			this.$emit('update:modelValue', next);
			this.$emit('change', next);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-checkbox {
	display: flex;
	flex-direction: row;
	align-items: center;

	&--disabled {
		/* #ifdef H5 */
		cursor: not-allowed;
		/* #endif */
	}

	&__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		border-width: 1px;
		border-style: solid;
		border-color: #dcdfe6;
		border-radius: 6rpx;
		background-color: #fff;
		transition: all 0.15s;

		&.is-checked {
			border-color: #2979ff;
			background-color: #2979ff;
		}
	}

	&__mark {
		font-weight: bold;
		color: #fff;
	}

	&__label {
		margin-left: 12rpx;
		font-size: 28rpx;
		color: #333;
	}
}
</style>
