<template>
	<view class="vui-slider" :class="{ 'is-disabled': disabled }">
		<view
			class="vui-slider__track"
			:style="trackStyle"
			@touchstart="onTouchStart"
			@touchmove.stop.prevent="onTouchMove"
			@touchend="onTouchEnd"
			@touchcancel="onTouchEnd"
		>
			<view class="vui-slider__bar" :style="barStyle"></view>
			<view class="vui-slider__thumb" :style="thumbStyle"></view>
		</view>
		<text v-if="showValue" class="vui-slider__value">{{ displayValue }}</text>
	</view>
</template>

<script>
/**
 * Slider 滑块
 * @description 通过拖动滑块在一个固定区间内进行选择
 * @property {Number} modelValue 当前值，支持 v-model
 * @property {Number} min 最小值
 * @property {Number} max 最大值
 * @property {Number} step 步长
 * @property {Boolean} disabled 是否禁用
 * @property {Boolean} showValue 是否显示当前值
 * @property {String} color 激活段颜色
 * @property {Number|String} barHeight 轨道高度，数字按 rpx 处理，默认 8
 * @event {Function} change 值变化时触发
 */
export default {
	name: 'VuiSlider',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: Number,
			default: 0
		},
		min: {
			type: Number,
			default: 0
		},
		max: {
			type: Number,
			default: 100
		},
		step: {
			type: Number,
			default: 1
		},
		disabled: {
			type: Boolean,
			default: false
		},
		showValue: {
			type: Boolean,
			default: false
		},
		color: {
			type: String,
			default: ''
		},
		barHeight: {
			type: [Number, String],
			default: 8
		}
	},
	data() {
		return {
			rect: null
		};
	},
	computed: {
		percent() {
			const min = Number(this.min);
			const max = Number(this.max);
			if (max <= min) return 0;
			const val = Number(this.modelValue) || 0;
			let ratio = (val - min) / (max - min);
			if (ratio < 0) ratio = 0;
			if (ratio > 1) ratio = 1;
			return Math.round(ratio * 1000) / 10;
		},
		activeColor() {
			return this.disabled ? '#c0c4cc' : this.color || '#2979ff';
		},
		trackHeight() {
			return typeof this.barHeight === 'number' ? this.barHeight + 'rpx' : this.barHeight;
		},
		trackStyle() {
			return 'height:' + this.trackHeight + ';border-radius:' + this.trackHeight + ';';
		},
		barStyle() {
			return 'width:' + this.percent + '%;background-color:' + this.activeColor +
				';border-radius:' + this.trackHeight + ';';
		},
		thumbStyle() {
			return 'left:' + this.percent + '%;border-color:' + this.activeColor + ';';
		},
		displayValue() {
			return Number(this.modelValue) || 0;
		}
	},
	methods: {
		measure() {
			return new Promise((resolve) => {
				uni.createSelectorQuery()
					.in(this)
					.select('.vui-slider__track')
					.boundingClientRect((res) => {
						this.rect = res || null;
						resolve(this.rect);
					})
					.exec();
			});
		},
		updateByClientX(clientX) {
			if (!this.rect || !this.rect.width) return;
			const min = Number(this.min);
			const max = Number(this.max);
			let ratio = (clientX - this.rect.left) / this.rect.width;
			if (ratio < 0) ratio = 0;
			if (ratio > 1) ratio = 1;
			let value = min + ratio * (max - min);
			const step = Number(this.step) || 1;
			value = Math.round(value / step) * step;
			value = Math.round(value * 100) / 100;
			if (value < min) value = min;
			if (value > max) value = max;
			if (value === this.modelValue) return;
			this.$emit('update:modelValue', value);
			this.$emit('change', value);
		},
		onTouchStart(event) {
			if (this.disabled) return;
			const touch = event.touches && event.touches[0];
			this.measure().then(() => {
				if (touch) this.updateByClientX(touch.clientX);
			});
		},
		onTouchMove(event) {
			if (this.disabled) return;
			const touch = event.touches && event.touches[0];
			if (!touch) return;
			if (!this.rect) {
				this.measure().then(() => this.updateByClientX(touch.clientX));
				return;
			}
			this.updateByClientX(touch.clientX);
		},
		onTouchEnd() {
			this.rect = null;
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-slider {
	display: flex;
	flex-direction: row;
	align-items: center;

	&.is-disabled {
		/* #ifdef H5 */
		cursor: not-allowed;
		/* #endif */
	}

	&__track {
		position: relative;
		flex: 1;
		background-color: #ebedf0;
	}

	&__bar {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		background-color: #2979ff;
	}

	&__thumb {
		position: absolute;
		top: 50%;
		width: 36rpx;
		height: 36rpx;
		margin-left: -18rpx;
		box-sizing: border-box;
		border: 2rpx solid #2979ff;
		border-radius: 50%;
		background-color: #fff;
		box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
		transform: translateY(-50%);
	}

	&__value {
		margin-left: 16rpx;
		font-size: 26rpx;
		color: #606266;
	}
}
</style>
