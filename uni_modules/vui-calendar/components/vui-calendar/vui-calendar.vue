<template>
	<view class="vui-calendar">
		<view class="vui-calendar__header">
			<text class="vui-calendar__arrow" @click="onPrev">‹</text>
			<text class="vui-calendar__title">{{ year }}年{{ month }}月</text>
			<text class="vui-calendar__arrow" @click="onNext">›</text>
		</view>
		<view class="vui-calendar__week">
			<text v-for="(week, index) in weekLabels" :key="index" class="vui-calendar__week-text">{{ week }}</text>
		</view>
		<view class="vui-calendar__body">
			<view
				v-for="(cell, index) in days"
				:key="index"
				class="vui-calendar__day"
				:class="{
					'is-other': !cell.current,
					'is-disabled': cell.disabled,
					'is-selected': cell.selected,
					'is-today': cell.today
				}"
				@click="onSelect(cell)"
			>
				<text class="vui-calendar__day-text" :style="dayStyle(cell) + dayTextStyle(cell)">{{ cell.day }}</text>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * Calendar 日历
 * @description 以日历形式展示日期并支持选择
 * @property {String} modelValue 选中日期 YYYY-MM-DD，支持 v-model
 * @property {Number} startWeek 每周起始日 0 周日 / 1 周一
 * @property {String} color 选中颜色
 * @property {String} minDate 可选最小日期 YYYY-MM-DD
 * @property {String} maxDate 可选最大日期 YYYY-MM-DD
 * @event {Function} change 选中日期变化时触发
 */
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function pad(num) {
	return num < 10 ? '0' + num : String(num);
}

function format(year, month, day) {
	return year + '-' + pad(month) + '-' + pad(day);
}

export default {
	name: 'VuiCalendar',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: String,
			default: ''
		},
		startWeek: {
			type: [Number, String],
			default: 0
		},
		color: {
			type: String,
			default: ''
		},
		minDate: {
			type: String,
			default: ''
		},
		maxDate: {
			type: String,
			default: ''
		}
	},
	data() {
		const base = this.parseDate(this.modelValue) || new Date();
		return {
			year: base.getFullYear(),
			month: base.getMonth() + 1,
			selected: this.modelValue || ''
		};
	},
	computed: {
		activeColor() {
			return this.color || '#2979ff';
		},
		weekLabels() {
			const start = Number(this.startWeek) || 0;
			const list = [];
			for (let i = 0; i < 7; i++) list.push(WEEK_LABELS[(start + i) % 7]);
			return list;
		},
		today() {
			const now = new Date();
			return format(now.getFullYear(), now.getMonth() + 1, now.getDate());
		},
		days() {
			const year = this.year;
			const month = this.month;
			const first = new Date(year, month - 1, 1);
			const startWeek = Number(this.startWeek) || 0;
			let offset = first.getDay() - startWeek;
			if (offset < 0) offset += 7;
			const total = new Date(year, month, 0).getDate();
			const prevTotal = new Date(year, month - 1, 0).getDate();
			const cells = [];
			for (let i = 0; i < offset; i++) {
				const day = prevTotal - offset + 1 + i;
				const date = this.shiftMonth(year, month, -1, day);
				cells.push(this.buildCell(day, date, false));
			}
			for (let day = 1; day <= total; day++) {
				cells.push(this.buildCell(day, format(year, month, day), true));
			}
			const rest = (7 - (cells.length % 7)) % 7;
			for (let i = 0; i < rest; i++) {
				const date = this.shiftMonth(year, month, 1, i + 1);
				cells.push(this.buildCell(i + 1, date, false));
			}
			return cells;
		}
	},
	watch: {
		modelValue(val) {
			this.selected = val || '';
			if (val) {
				const date = this.parseDate(val);
				if (date) {
					this.year = date.getFullYear();
					this.month = date.getMonth() + 1;
				}
			}
		}
	},
	methods: {
		parseDate(value) {
			if (!value) return null;
			const parts = String(value).split('-');
			if (parts.length < 3) return null;
			const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
			return isNaN(date.getTime()) ? null : date;
		},
		shiftMonth(year, month, delta, day) {
			const date = new Date(year, month - 1 + delta, day);
			return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
		},
		buildCell(day, date, current) {
			const disabled =
				(this.minDate && date < this.minDate) || (this.maxDate && date > this.maxDate);
			return {
				day: day,
				date: date,
				current: current,
				disabled: !!disabled,
				selected: date === this.selected,
				today: date === this.today
			};
		},
		onPrev() {
			const date = new Date(this.year, this.month - 2, 1);
			this.year = date.getFullYear();
			this.month = date.getMonth() + 1;
		},
		onNext() {
			const date = new Date(this.year, this.month, 1);
			this.year = date.getFullYear();
			this.month = date.getMonth() + 1;
		},
		onSelect(cell) {
			if (cell.disabled) return;
			this.selected = cell.date;
			const date = this.parseDate(cell.date);
			if (date) {
				this.year = date.getFullYear();
				this.month = date.getMonth() + 1;
			}
			this.$emit('update:modelValue', cell.date);
			this.$emit('change', cell.date);
		},
		dayStyle(cell) {
			return cell.selected ? 'background-color:' + this.activeColor + ';' : '';
		},
		dayTextStyle(cell) {
			if (cell.selected) return 'color:#fff;';
			if (cell.today) return 'color:' + this.activeColor + ';';
			if (!cell.current) return 'color:#c0c4cc;';
			return '';
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-calendar {
	width: 100%;
	background-color: #fff;

	&__header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 0;
	}

	&__arrow {
		padding: 0 24rpx;
		font-size: 40rpx;
		color: #909399;
	}

	&__title {
		font-size: 30rpx;
		font-weight: bold;
		color: #333;
	}

	&__week {
		display: flex;
		flex-direction: row;
		padding: 12rpx 0;
		border-bottom: 1px solid #f2f3f5;
	}

	&__week-text {
		flex: 1;
		text-align: center;
		font-size: 24rpx;
		color: #909399;
	}

	&__body {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		padding: 12rpx 0;
	}

	&__day {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14.28%;
		height: 88rpx;
	}

	&__day-text {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64rpx;
		height: 64rpx;
		font-size: 26rpx;
		color: #606266;
		border-radius: 50%;
	}

	&__day.is-selected &__day-text {
		border-radius: 50%;
	}

	&__day.is-disabled &__day-text {
		color: #e4e7ed;
	}

	&__day.is-today &__day-text {
		font-weight: bold;
	}
}
</style>
