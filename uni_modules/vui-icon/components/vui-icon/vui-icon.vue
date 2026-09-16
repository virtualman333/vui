<template>
	<text class="vui-icon" :class="{ 'vui-icon--spin': spin }" :style="iconStyle" @click="onClick">
		<slot>{{ glyph }}</slot>
	</text>
</template>

<script>
/**
 * Icon 图标
 * @description 内置常用图标，支持自定义字符与插槽
 * @property {String} name 图标名称，如 check / close / arrow-right
 * @property {String} char 自定义字符，优先级高于 name
 * @property {Number|String} size 图标大小，数字按 rpx 处理，默认 32
 * @property {String} color 图标颜色
 * @property {Boolean} spin 是否旋转
 * @event {Function} click 点击图标触发
 */
const GLYPHS = {
	check: '✓',
	close: '×',
	plus: '+',
	minus: '−',
	'arrow-up': '↑',
	'arrow-down': '↓',
	'arrow-left': '←',
	'arrow-right': '→',
	star: '★',
	'star-o': '☆',
	heart: '♥',
	'heart-o': '♡',
	circle: '●',
	'circle-o': '○',
	square: '■',
	'square-o': '□',
	triangle: '▲',
	'triangle-down': '▼',
	dot: '•',
	menu: '≡',
	more: '⋯',
	refresh: '↻',
	edit: '✎',
	search: '⌕',
	info: 'ⓘ',
	warning: '!',
	error: '×',
	success: '✓',
	question: '?',
	trash: '⌫',
	lock: '▣',
	user: '☺',
	home: '⌂',
	clock: '◷',
	mail: '✉',
	phone: '☎',
	location: '⌖',
	image: '▣'
};

export default {
	name: 'VuiIcon',
	emits: ['click'],
	props: {
		name: {
			type: String,
			default: ''
		},
		char: {
			type: String,
			default: ''
		},
		size: {
			type: [Number, String],
			default: 32
		},
		color: {
			type: String,
			default: ''
		},
		spin: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		glyph() {
			if (this.char) return this.char;
			return GLYPHS[this.name] || '';
		},
		fontSize() {
			return typeof this.size === 'number' ? this.size + 'rpx' : this.size;
		},
		iconStyle() {
			const style = 'font-size:' + this.fontSize + ';line-height:' + this.fontSize + ';';
			return this.color ? style + 'color:' + this.color + ';' : style;
		}
	},
	methods: {
		onClick(evt) {
			this.$emit('click', evt);
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
.vui-icon {
	display: inline-block;
	font-style: normal;
	text-align: center;
	color: inherit;
	/* #ifdef H5 */
	cursor: pointer;
	/* #endif */

	&--spin {
		animation: vui-icon-spin 1s linear infinite;
	}
}

@keyframes vui-icon-spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
</style>
