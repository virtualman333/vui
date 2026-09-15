<template>
	<view class="vui-time-picker" :style="'height:' + height + ';'">
		<picker-view
			class="vui-time-picker__view"
			:value="pickerValue"
			:indicator-style="indicatorStyle"
			@change="onChange"
		>
			<picker-view-column>
				<view v-for="(item, index) in hours" :key="index" class="vui-time-picker__item">
					<text class="vui-time-picker__item-text">{{ item }}</text>
				</view>
			</picker-view-column>
			<picker-view-column>
				<view v-for="(item, index) in minutes" :key="index" class="vui-time-picker__item">
					<text class="vui-time-picker__item-text">{{ item }}</text>
				</view>
			</picker-view-column>
			<picker-view-column v-if="showSeconds">
				<view v-for="(item, index) in seconds" :key="index" class="vui-time-picker__item">
					<text class="vui-time-picker__item-text">{{ item }}</text>
				</view>
			</picker-view-column>
		</picker-view>
		<view v-if="disabled" class="vui-time-picker__mask"></view>
	</view>
</template>

<script>
/**
 * TimePicker 时间选择器
 * @description 用于选择时间，支持 v-model
 * @property {String} modelValue 选中时间 HH:mm 或 HH:mm:ss，支持 v-model
 * @property {Boolean} showSeconds 是否显示秒
 * @property {String} min 可选最小时间 HH:mm(:ss)
 * @property {String} max 可选最大时间 HH:mm(:ss)
 * @property {Boolean} disabled 是否禁用
 * @property {String} height 高度
 * @event {Function} change 时间变化时触发
 */
function pad(num) {
	return num < 10 ? '0' + num : String(num);
}

function toNumber(value) {
	const num = Number(value);
	return isNaN(num) ? 0 : num;
}

function range(end) {
	const list = [];
	for (let i = 0; i <= end; i++) list.push(pad(i));
	return list;
}

export default {
	name: 'VuiTimePicker',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: String,
			default: ''
		},
		showSeconds: {
			type: Boolean,
			default: false
		},
		min: {
			type: String,
			default: ''
		},
		max: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			default: false
		},
		height: {
			type: String,
			default: '400rpx'
		}
	},
	data() {
		return {
			hourIndex: 0,
			minuteIndex: 0,
			secondIndex: 0
		};
	},
	computed: {
		hours() {
			return range(23);
		},
		minutes() {
			return range(59);
		},
		seconds() {
			return range(59);
		},
		currentText() {
			const text = this.hours[this.hourIndex] + ':' + this.minutes[this.minuteIndex];
			return this.showSeconds ? text + ':' + this.seconds[this.secondIndex] : text;
		},
		pickerValue() {
			const value = [this.hourIndex, this.minuteIndex];
			if (this.showSeconds) value.push(this.secondIndex);
			return value;
		},
		indicatorStyle() {
			return 'height:72rpx;';
		}
	},
	watch: {
		modelValue: {
			immediate: true,
			handler(val) {
				this.syncByValue(val);
			}
		}
	},
	methods: {
		syncByValue(value) {
			const parts = String(value || '').split(':');
			let hi = this.hours.indexOf(pad(toNumber(parts[0])));
			if (hi < 0) hi = 0;
			let mi = this.minutes.indexOf(pad(toNumber(parts[1])));
			if (mi < 0) mi = 0;
			let si = this.seconds.indexOf(pad(toNumber(parts[2])));
			if (si < 0) si = 0;
			this.hourIndex = hi;
			this.minuteIndex = mi;
			this.secondIndex = si;
		},
		onChange(event) {
			const value = event.detail.value || [];
			this.hourIndex = value[0] || 0;
			this.minuteIndex = value[1] || 0;
			if (this.showSeconds) this.secondIndex = value[2] || 0;
			let next = this.currentText;
			if (this.min && next < this.min) next = this.min;
			if (this.max && next > this.max) next = this.max;
			this.syncByValue(next);
			this.$emit('update:modelValue', next);
			this.$emit('change', next);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-time-picker {
	position: relative;
	width: 100%;

	&__view {
		width: 100%;
		height: 100%;
	}

	&__item {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 72rpx;
	}

	&__item-text {
		font-size: 30rpx;
		color: #333;
	}

	&__mask {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background-color: rgba(255, 255, 255, 0.6);
	}
}
</style>
