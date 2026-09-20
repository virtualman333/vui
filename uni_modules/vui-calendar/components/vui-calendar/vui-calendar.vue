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
/* VUI 主题色（与 uni.scss 中 $vui-* 变量保持一致，可通过 props 覆盖） */
const VUI_COLOR = {
	primary: '#2979ff',
	placeholder: '#c0c4cc',
	white: '#fff',
};
/**
 * Calendar 日历
 * @description 以日历形式展示日期并支持选择
 * @property {String} modelValue 选中日期 YYYY-MM-DD，支持 v-model（非补零写法会先收敛）
 * @property {Number} startWeek 每周起始日 0 周日 / 1 周一（先归一到 0~6）
 * @property {String} color 选中颜色
 * @property {String} minDate 可选最小日期 YYYY-MM-DD（非补零写法会先收敛）
 * @property {String} maxDate 可选最大日期 YYYY-MM-DD（非补零写法会先收敛）
 * @event {Function} change 选中日期变化时触发
 */
/**
 * 日期入参的归一化约定（三个属性：`modelValue` / `minDate` / `maxDate`）
 * ----------------------------------------------------------------------
 * 组件自己产出的日期一律走 `format()`（逐段补零），而这三个属性是**宿主手写的字符串**。
 * 两边直接比字符串只在「宿主也补零」时才成立，实测两种写法都会坏：
 *
 *   · `minDate="2026-9-1"` → `'2026-09-01' < '2026-9-1'` 成立（第 6 位 `0` < `9`），
 *     于是**整个月 31 格全部 disabled**，一天都点不动，页面看着只是「都不能选」；
 *   · `modelValue="2026-9-01"` → `selected` 存的是宿主原文，跟格子的补零写法永远不相等，
 *     一格都不高亮（用户以为没选中），点一下之后又会自己「好」—— 最难查的那种。
 *
 * 所以三个入参一律先过 `parseDate()` 解析、再由 `normalizeDate()` 用 `format()` 吐回
 * 统一定长写法；边界比较与选中判等都只发生在「组件自己产出的字符串」之间。
 * 与 vui-time-picker 那轮立下的规矩同源（那边是 `trimTo()`：把 `min` / `max` 先收成
 * 组件自己的精度，再比较）。
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
			// 存**归一化**后的写法，不是宿主原文 —— `buildCell` 拿它跟格子产出的 `date`
			// 比判等，两边同源同形才有意义
			selected: this.normalizeDate(this.modelValue)
		};
	},
	computed: {
		activeColor() {
			return this.color || VUI_COLOR.primary;
		},
		/**
		 * 归一化后的每周起始日（0~6）。原来是 `Number(this.startWeek) || 0`：
		 * `startWeek="-1"` 时 `(-1 + i) % 7` 在 i=0 处得 -1 → `WEEK_LABELS[-1]` 是
		 * undefined，表头只剩 6 个字、第一列空着；而 `days` 的偏移是另一段算式、算出的
		 * 是「周六开头」—— 表头与格子静默错开一位。
		 */
		startWeekday() {
			return this.normalizeWeekday(this.startWeek);
		},
		/** 归一化后的下界 / 上界：`buildCell` 只跟这两个比，绝不跟宿主原文比 */
		minBound() {
			return this.normalizeDate(this.minDate);
		},
		maxBound() {
			return this.normalizeDate(this.maxDate);
		},
		weekLabels() {
			const start = this.startWeekday;
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
			const startWeek = this.startWeekday;
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
			// 同样存归一化写法：宿主回填一个 `2026-9-01`（后端来的日期串常常不补零）
			// 也要能高亮，否则用户看到的是「明明有值、一格没选中」
			this.selected = this.normalizeDate(val);
			const date = this.parseDate(val);
			if (date) {
				this.year = date.getFullYear();
				this.month = date.getMonth() + 1;
			}
		}
	},
	methods: {
		/**
		 * 解析成 `Date`；**解析不出来一律返回 null，绝不返回一个「滚过去了」的日期**。
		 *
		 * 末尾那道归一化守卫是必须的：`new Date(2026, 1, 30)` 不报错，它把 2 月 30 日滚成
		 * 3 月 2 日；`'2026-13-01'` 滚成 2027-01-01；`'2026-00-10'` 滚成 2025-12-10。
		 * 宿主手滑写错一位，屏幕上高亮的是**另一天**；`minDate` 写成 `'2026-13-01'` 更是
		 * 直接变成「上界在明年 1 月」，没有任何提示。
		 */
		parseDate(value) {
			if (!value) return null;
			const parts = String(value).split('-');
			if (parts.length < 3) return null;
			const year = Number(parts[0]);
			const month = Number(parts[1]);
			const day = Number(parts[2]);
			const date = new Date(year, month - 1, day);
			if (isNaN(date.getTime())) return null;
			if (
				date.getFullYear() !== year ||
				date.getMonth() !== month - 1 ||
				date.getDate() !== day
			) {
				return null;
			}
			return date;
		},
		/** 日期入参 → 组件自己的定长写法（`YYYY-MM-DD`）；解析不出来给空串 */
		normalizeDate(value) {
			const date = this.parseDate(value);
			if (!date) return '';
			return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
		},
		/** 每周起始日 → 0~6（JS 里负数取模还是负的，所以先 +7 再 %7） */
		normalizeWeekday(value) {
			const n = Math.floor(Number(value));
			if (!isFinite(n)) return 0;
			return ((n % 7) + 7) % 7;
		},
		shiftMonth(year, month, delta, day) {
			const date = new Date(year, month - 1 + delta, day);
			return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
		},
		buildCell(day, date, current) {
			// 只跟归一化后的边界比字符串：比较的双方都是「组件自己产出的 YYYY-MM-DD」。
			// 拿宿主原文比的话，`minDate="2026-9-1"` 会把整月每一格都判成越界。
			const min = this.minBound;
			const max = this.maxBound;
			const disabled = (min && date < min) || (max && date > max);
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
			if (cell.selected) return 'color:' + VUI_COLOR.white + ';';
			if (cell.today) return 'color:' + this.activeColor + ';';
			if (!cell.current) return 'color:' + VUI_COLOR.placeholder + ';';
			return '';
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
.vui-calendar {
	width: 100%;
	background-color: $vui-bg-color;

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
		color: $vui-text-color-secondary;
	}

	&__title {
		font-size: 30rpx;
		font-weight: bold;
		color: $vui-text-color;
	}

	&__week {
		display: flex;
		flex-direction: row;
		padding: 12rpx 0;
		border-bottom: 1px solid $vui-bg-color-hover;
	}

	&__week-text {
		flex: 1;
		text-align: center;
		font-size: 24rpx;
		color: $vui-text-color-secondary;
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
		color: $vui-text-color-regular;
		border-radius: 50%;
	}

	&__day.is-selected &__day-text {
		border-radius: 50%;
	}

	&__day.is-disabled &__day-text {
		color: $vui-text-color-disabled;
	}

	&__day.is-today &__day-text {
		font-weight: bold;
	}
}
</style>
