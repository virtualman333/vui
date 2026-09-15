<template>
	<text class="vui-typing" :selectable="selectable">{{ display }}</text>
</template>

<script>
/**
 * 打字机流式文本
 * @description 逐字输出文本，既可用于打字机效果，也可用于 AI 流式回答（text 递增时自动续播）
 * @property {String} text 完整文本内容
 * @property {Number} speed 每个字符的间隔毫秒数
 * @property {Boolean} autoplay 挂载后是否自动开始
 * @property {Boolean} typing 是否仍处于流式输出中
 * @property {Boolean} showCursor 是否显示光标
 * @property {String} cursorChar 光标字符
 * @property {Boolean} selectable 文字是否可选中
 * @event {Function} change 每输出一个字符时触发，参数为当前已输出文本
 * @event {Function} finish 全部文本输出完成时触发，参数为完整文本
 */
export default {
	name: 'VuiTyping',
	emits: ['change', 'finish'],
	props: {
		text: {
			type: String,
			default: ''
		},
		speed: {
			type: Number,
			default: 40
		},
		autoplay: {
			type: Boolean,
			default: true
		},
		typing: {
			type: Boolean,
			default: false
		},
		showCursor: {
			type: Boolean,
			default: true
		},
		cursorChar: {
			type: String,
			default: '▍'
		},
		selectable: {
			type: Boolean,
			default: true
		}
	},
	data() {
		return {
			shown: '',
			finished: false,
			timer: null
		};
	},
	computed: {
		display() {
			const cursor = this.showCursor && !this.finished ? this.cursorChar : '';
			return this.shown + cursor;
		}
	},
	watch: {
		text: {
			immediate: true,
			handler(val) {
				const target = typeof val === 'string' ? val : '';
				/* 文本被整体替换（变短）时重置，避免残留旧内容 */
				if (this.shown.length > target.length) {
					this.shown = '';
					this.finished = false;
				}
				if (this.autoplay) this.play();
			}
		},
		typing(val) {
			if (val) this.finished = false;
			if (this.autoplay) this.play();
		},
		speed() {
			if (this.timer) {
				this.stopTimer();
				this.play();
			}
		}
	},
	beforeUnmount() {
		this.stopTimer();
	},
	methods: {
		/** 开始（或继续）输出 */
		play() {
			if (this.timer) return this;
			const target = this.text || '';
			if (this.shown.length >= target.length) {
				/* 已追上当前文本：非流式场景直接收尾 */
				if (!this.typing) {
					this.stopTimer();
					if (!this.finished && target.length > 0) {
						this.finished = true;
						this.$emit('finish', this.shown);
					}
				}
				return this;
			}
			this.finished = false;
			this.timer = setInterval(() => {
				const t = this.text || '';
				if (this.shown.length < t.length) {
					this.shown = t.slice(0, this.shown.length + 1);
					this.$emit('change', this.shown);
					return;
				}
				this.stopTimer();
				if (this.typing) return;
				this.finished = true;
				this.$emit('finish', this.shown);
			}, Math.max(this.speed, 8));
			return this;
		},
		/** 暂停输出（保留已输出内容） */
		pause() {
			this.stopTimer();
			return this;
		},
		/** 清空并重新开始 */
		reset() {
			this.stopTimer();
			this.shown = '';
			this.finished = false;
			this.$emit('change', '');
			if (this.autoplay) this.play();
			return this;
		},
		/** 立即显示全部文本 */
		finishNow() {
			this.stopTimer();
			this.shown = this.text || '';
			if (!this.finished) {
				this.finished = true;
				this.$emit('change', this.shown);
				this.$emit('finish', this.shown);
			}
			return this;
		},
		/** 内部：清理定时器 */
		stopTimer() {
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
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
/* ===== VUI 主题变量结束 ===== */
.vui-typing {
	font-size: 28rpx;
	line-height: 1.6;
	color: $vui-text-color;
	word-break: break-all;
}
</style>
