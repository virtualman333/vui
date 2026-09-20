<template>
	<text class="vui-count-to" :style="textStyle" @click="onClick">{{ display }}</text>
</template>

<script>
/* VUI 主题色（与 uni.scss 中 $vui-* 变量保持一致，可通过 props 覆盖） */
const VUI_COLOR = {
	primary: '#2979ff',
	success: '#18bc37',
	warning: '#f3a73f',
	error: '#e43d33'
};

/* 每帧间隔（ms），约 60fps。刻意用 setTimeout 而非 requestAnimationFrame：
   后者在小程序 / app-nvue 各端实现不一致，setTimeout 是跨端最稳的。 */
const FRAME = 16;

/* 缓动函数：t 为 0~1 的归一化进度，返回 0~1 的缓动进度 */
const EASING = {
	linear: (t) => t,
	easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
	easeOutCubic: (t) => 1 - Math.pow(1 - t, 3)
};

/**
 * CountTo 数字滚动
 * @description 让数字从 start 平滑滚动到 end，用于金额、用量、统计数字等场景。
 * 用时间差（Date.now）而非帧计数推进，掉帧时也不会让动画变慢或超时。
 * @property {Number} start 起始数值
 * @property {Number} end 目标数值
 * @property {Number} duration 动画时长（毫秒），传 0 表示直接显示终值
 * @property {Number} decimals 保留小数位数
 * @property {String} separator 千分位分隔符，如传 "," 则 1234567 显示为 1,234,567
 * @property {String} prefix 前缀，如 "¥"
 * @property {String} suffix 后缀，如 " USDT"
 * @property {Boolean} autoplay 是否挂载后自动开始滚动
 * @property {String} easing 缓动函数 linear / easeOutQuad / easeOutCubic
 * @property {String} color 文字颜色
 * @property {Number|String} fontSize 字号，数字按 rpx 处理
 * @property {Boolean} bold 是否加粗
 * @event {Function} finish 滚动结束时触发，参数为终值
 * @event {Function} click 点击时触发
 */
export default {
	name: 'VuiCountTo',
	emits: ['finish', 'click'],
	props: {
		start: {
			type: Number,
			default: 0
		},
		end: {
			type: Number,
			default: 0
		},
		duration: {
			type: Number,
			default: 1500
		},
		decimals: {
			type: Number,
			default: 0
		},
		separator: {
			type: String,
			default: ''
		},
		prefix: {
			type: String,
			default: ''
		},
		suffix: {
			type: String,
			default: ''
		},
		autoplay: {
			type: Boolean,
			default: true
		},
		easing: {
			type: String,
			default: 'easeOutCubic'
		},
		color: {
			type: String,
			default: ''
		},
		fontSize: {
			type: [Number, String],
			default: ''
		},
		bold: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			// 当前展示值。autoplay 为 false 时先停在起点，等父组件调 restart()
			current: Number(this.start) || 0,
			timer: null
		};
	},
	computed: {
		display() {
			return this.prefix + this.format(this.current) + this.suffix;
		},
		textStyle() {
			let style = '';
			if (this.color) style += 'color:' + this.color + ';';
			if (this.fontSize !== '' && this.fontSize !== null) {
				const size = typeof this.fontSize === 'number' ? this.fontSize + 'rpx' : this.fontSize;
				style += 'font-size:' + size + ';';
			}
			if (this.bold) style += 'font-weight:bold;';
			return style;
		}
	},
	mounted() {
		if (this.autoplay) this.restart();
	},
	// Vue3 钩子；uni-app 编译到 Vue2 时会回退到 beforeDestroy
	beforeUnmount() {
		this.stop();
	},
	beforeDestroy() {
		this.stop();
	},
	methods: {
		stop() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
		},
		/* 数字格式化：先定小数位，再补千分位。负号不参与分组。 */
		format(value) {
			/* decimals 必须收成 0~100 的整数：`toFixed` 对 >100 会**抛 RangeError**，
			   而这里是在 display 计算属性上调的 —— 抛出去就是整个组件渲染崩掉（页面白屏，
			   报错还落在 Vue 的计算属性栈里，看不出是 props 写错）。非数值（NaN/undefined）
			   按 0 处理；小数位（2.5）本来就只能表示整数位，这里显式取整，不靠 toFixed 内部行为。 */
			const rawDecimals = Number(this.decimals);
			const decimals = isFinite(rawDecimals) ? Math.min(100, Math.max(0, Math.floor(rawDecimals))) : 0;
			const fixed = (Number(value) || 0).toFixed(decimals);
			if (!this.separator) return fixed;
			const negative = fixed.charAt(0) === '-';
			const body = negative ? fixed.slice(1) : fixed;
			const dot = body.indexOf('.');
			const int = dot === -1 ? body : body.slice(0, dot);
			const rest = dot === -1 ? '' : body.slice(dot);
			/* 用函数式替换：分隔符里若含 `$&` / `$1` / `` $` `` 这类字符，字符串式替换会把它
			   当成**替换模式**而不是字面量 —— 实测 `separator="$&"` 输出 "1234567"，
			   千分位静默消失（用户以为自己传了分隔符）。 */
			const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, () => this.separator);
			return (negative ? '-' : '') + grouped + rest;
		},
		/* 从 start 滚到 end。重复调用会先停掉上一轮，避免两个定时器叠加加速。 */
		restart() {
			this.stop();
			const from = Number(this.start) || 0;
			const to = Number(this.end) || 0;
			const duration = Math.max(0, Number(this.duration) || 0);
			if (duration === 0 || from === to) {
				this.current = to;
				this.$emit('finish', to);
				return;
			}
			const ease = EASING[this.easing] || EASING.easeOutCubic;
			const began = Date.now();
			const tick = () => {
				const p = Math.min(1, (Date.now() - began) / duration);
				if (p >= 1) {
					// 用终值收尾，避免缓动浮点误差让末位差一点点
					this.current = to;
					this.timer = null;
					this.$emit('finish', to);
					return;
				}
				this.current = from + (to - from) * ease(p);
				this.timer = setTimeout(tick, FRAME);
			};
			tick();
		},
		/* 立即跳到终值，不播动画 */
		reset() {
			this.stop();
			this.current = Number(this.end) || 0;
			this.$emit('finish', this.current);
		},
		onClick() {
			this.$emit('click');
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
.vui-count-to {
	display: inline-block;
	color: $vui-text-color;
	/* 等宽数字：滚动过程中每位数字占同样的宽度，整串数字不会左右抖动 */
	font-variant-numeric: tabular-nums;
	line-height: 1.2;
}
</style>
