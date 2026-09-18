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

/** 把「不含秒」的时刻进一分钟（`09:59` → `10:00`）；已经是 `23:59` 就停在原地 */
function nextMinute(hh, mm) {
	let h = Number(hh);
	let m = Number(mm) + 1;
	if (m > 59) {
		m = 0;
		h += 1;
	}
	// 进到 24:00 会绕回 00:00 —— 那比 min 还早。宁可停在当天最大的「不含秒」时刻，
	// 「不越界」比「进位」重要。
	if (h > 23) return '23:59';
	return pad(h) + ':' + pad(m);
}

/**
 * 把 `min` / `max` 收成**组件自己的精度**。
 *
 * 为什么必须收：组件的精度由 `showSeconds` 决定，而边界允许写成 `HH:mm` 或 `HH:mm:ss`
 * （见 JSDoc 的 `@property min 可选最小时间 HH:mm(:ss)`）。两边精度不同时直接比字符串是错的：
 *
 *   - `showSeconds=false`（候选值 `14:31`）与 `max="14:30:00"` → `"14:31" > "14:30:00"` 成立，
 *     clamp 出来的值带上了秒 —— 父组件收到的字符串形式与组件展示的不一致；
 *   - 反过来 `min="09:00:30"` 时，`"08:00" < "09:00:30"` 也成立，但 clamp 回 `min` 原样
 *     同样会把秒带进一个不显示秒的组件。
 *
 * `mode='floor'` 用于上界（向下取整，绝不越过 max）；`mode='ceil'` 用于下界（向上进位，
 * 绝不早于 min）。两个方向都保证「收完之后仍然不越界」。
 */
function trimTo(text, withSeconds, mode) {
	if (!text) return '';
	const parts = String(text).split(':');
	const hh = pad(toNumber(parts[0]));
	const mm = pad(toNumber(parts[1]));
	if (withSeconds) return hh + ':' + mm + ':' + pad(toNumber(parts[2]));
	// 不显示秒：秒位非 0 时按方向处理
	const ss = toNumber(parts[2]);
	if (ss > 0) return mode === 'ceil' ? nextMinute(hh, mm) : hh + ':' + mm;
	return hh + ':' + mm;
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
			// 边界先收成组件自己的精度再比，且 clamp 出来的值也必须是这个精度 ——
			// 否则 `max="14:30:00"` 会把一个不显示秒的组件变成「输出带秒」的实现。
			let next = this.currentText;
			const lo = trimTo(this.min, this.showSeconds, 'ceil');
			const hi = trimTo(this.max, this.showSeconds, 'floor');
			if (lo && next < lo) next = lo;
			if (hi && next > hi) next = hi;
			this.syncByValue(next);
			this.$emit('update:modelValue', next);
			this.$emit('change', next);
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
		color: $vui-text-color;
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
