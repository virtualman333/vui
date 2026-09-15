<template>
	<view class="vui-radio" :class="{ 'vui-radio--disabled': disabled }" @click="onToggle">
		<view
			class="vui-radio__icon"
			:class="['vui-radio__icon--' + shape, { 'is-checked': isChecked }]"
			:style="iconStyle"
		>
			<view v-if="isChecked" class="vui-radio__dot" :style="dotStyle"></view>
		</view>
		<text class="vui-radio__label" :style="labelStyle"><slot>{{ label }}</slot></text>
	</view>
</template>

<script>
/**
 * Radio 单选框
 * @description 单选框，支持 v-model
 * @property {Boolean} modelValue 是否选中，支持 v-model
 * @property {String} label 文本內容
 * @property {Boolean} disabled 是否禁用
 * @property {String} color 选中颜色
 * @property {String} shape 形状 circle / square
 * @property {Number|String} size 图标尺寸，数字按 rpx 处理，默认 36
 * @event {Function} change 选中状态变化时触发
 */
export default {
	name: 'VuiRadio',
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
		color: {
			type: String,
			default: ''
		},
		shape: {
			type: String,
			default: 'circle'
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
				'border-color:' + (this.isChecked ? this.activeColor : '#dcdfe6') + ';' +
				'background-color:' + (this.isChecked ? this.activeColor : 'transparent') + ';';
		},
		dotStyle() {
			const num = typeof this.size === 'number' ? this.size : parseFloat(this.size) || 36;
			return 'width:' + num * 0.45 + 'rpx;height:' + num * 0.45 + 'rpx;background-color:#fff;';
		},
		labelStyle() {
			return this.disabled ? 'color:#c0c4cc;' : '';
		}
	},
	methods: {
		onToggle() {
			if (this.disabled) return;
			this.$emit('update:modelValue', !this.isChecked);
			this.$emit('change', !this.isChecked);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-radio {
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
		background-color: #fff;
		transition: all 0.15s;

		&--circle {
			border-radius: 50%;
		}

		&--square {
			border-radius: 4rpx;
		}

		&.is-checked {
			border-color: #2979ff;
			background-color: #2979ff;
		}
	}

	&__dot {
		border-radius: 50%;
		background-color: #fff;
	}

	&__label {
		margin-left: 12rpx;
		font-size: 28rpx;
		color: #333;
	}
}
</style>
