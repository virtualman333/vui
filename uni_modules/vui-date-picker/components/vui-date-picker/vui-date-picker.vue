<template>
	<view class="vui-date-picker" :style="'height:' + height + ';'">
		<picker-view
			class="vui-date-picker__view"
			:value="pickerValue"
			:indicator-style="indicatorStyle"
			@change="onChange"
		>
			<picker-view-column>
				<view v-for="(item, index) in years" :key="index" class="vui-date-picker__item">
					<text class="vui-date-picker__item-text">{{ item }}年</text>
				</view>
			</picker-view-column>
			<picker-view-column>
				<view v-for="(item, index) in months" :key="index" class="vui-date-picker__item">
					<text class="vui-date-picker__item-text">{{ item }}月</text>
				</view>
			</picker-view-column>
			<picker-view-column>
				<view v-for="(item, index) in days" :key="index" class="vui-date-picker__item">
					<text class="vui-date-picker__item-text">{{ item }}日</text>
				</view>
			</picker-view-column>
		</picker-view>
		<view v-if="disabled" class="vui-date-picker__mask"></view>
	</view>
</template>

<script>
/**
 * DatePicker 日期选择器
 * @description 用于选择日期，支持 v-model
 * @property {String} modelValue 选中日期 YYYY-MM-DD，支持 v-model
 * @property {String} minDate 可选最小日期
 * @property {String} maxDate 可选最大日期
 * @property {Boolean} disabled 是否禁用
 * @property {String} height 高度
 * @event {Function} change 日期变化时触发
 */
function pad(num) {
	return num < 10 ? '0' + num : String(num);
}

function toNumber(value) {
	const num = Number(value);
	return isNaN(num) ? 0 : num;
}

export default {
	name: 'VuiDatePicker',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: String,
			default: ''
		},
		minDate: {
			type: String,
			default: '1900-01-01'
		},
		maxDate: {
			type: String,
			default: '2099-12-31'
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
			yearIndex: 0,
			monthIndex: 0,
			dayIndex: 0
		};
	},
	computed: {
		minParts() {
			const parts = String(this.minDate || '1900-01-01').split('-');
			return [toNumber(parts[0]), toNumber(parts[1]), toNumber(parts[2])];
		},
		maxParts() {
			const parts = String(this.maxDate || '2099-12-31').split('-');
			return [toNumber(parts[0]), toNumber(parts[1]), toNumber(parts[2])];
		},
		years() {
			const list = [];
			for (let year = this.minParts[0]; year <= this.maxParts[0]; year++) list.push(year);
			return list;
		},
		currentYear() {
			return this.years[this.yearIndex] || this.minParts[0];
		},
		months() {
			let start = 1;
			let end = 12;
			if (this.currentYear === this.minParts[0]) start = this.minParts[1];
			if (this.currentYear === this.maxParts[0]) end = this.maxParts[1];
			const list = [];
			for (let month = start; month <= end; month++) list.push(month);
			return list;
		},
		currentMonth() {
			return this.months[this.monthIndex] || this.months[0] || 1;
		},
		days() {
			const total = new Date(this.currentYear, this.currentMonth, 0).getDate();
			let start = 1;
			let end = total;
			if (this.currentYear === this.minParts[0] && this.currentMonth === this.minParts[1]) {
				start = this.minParts[2];
			}
			if (this.currentYear === this.maxParts[0] && this.currentMonth === this.maxParts[1]) {
				end = this.maxParts[2];
			}
			const list = [];
			for (let day = start; day <= end; day++) list.push(day);
			return list;
		},
		currentDay() {
			return this.days[this.dayIndex] || this.days[0] || 1;
		},
		pickerValue() {
			return [this.yearIndex, this.monthIndex, this.dayIndex];
		},
		indicatorStyle() {
			return 'height:72rpx;';
		}
	},
	watch: {
		modelValue: {
			immediate: true,
			handler(val) {
				this.syncByValue(val || this.defaultValue());
			}
		}
	},
	methods: {
		defaultValue() {
			const now = new Date();
			return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
		},
		syncByValue(value) {
			const parts = String(value).split('-');
			const year = toNumber(parts[0]);
			const month = toNumber(parts[1]);
			const day = toNumber(parts[2]);
			let yi = this.years.indexOf(year);
			if (yi < 0) yi = 0;
			this.yearIndex = yi;
			let mi = this.months.indexOf(month);
			if (mi < 0) mi = 0;
			this.monthIndex = mi;
			let di = this.days.indexOf(day);
			if (di < 0) di = 0;
			this.dayIndex = di;
		},
		onChange(event) {
			const value = event.detail.value || [];
			this.yearIndex = value[0] || 0;
			this.monthIndex = Math.min(value[1] || 0, this.months.length - 1);
			this.dayIndex = Math.min(value[2] || 0, this.days.length - 1);
			const next =
				this.currentYear + '-' + pad(this.currentMonth) + '-' + pad(this.currentDay);
			this.$emit('update:modelValue', next);
			this.$emit('change', next);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-date-picker {
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
