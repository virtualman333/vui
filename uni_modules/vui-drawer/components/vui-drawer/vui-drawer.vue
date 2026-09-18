<template>
	<view v-if="visible" class="vui-drawer">
		<view v-if="mask" class="vui-drawer__mask" :class="{ 'is-open': opened }" @click="onMaskClick"></view>
		<view
			class="vui-drawer__panel"
			:class="['vui-drawer__panel--' + position, { 'is-open': opened }]"
			:style="panelStyle"
		>
			<view v-if="title" class="vui-drawer__header">
				<text class="vui-drawer__title">{{ title }}</text>
				<text class="vui-drawer__close" @click="close">×</text>
			</view>
			<scroll-view class="vui-drawer__body" scroll-y>
				<slot></slot>
			</scroll-view>
		</view>
	</view>
</template>

<script>
/**
 * Drawer 抽屉
 * @description 从屏幕边缘滑出的浮层面板
 * @property {Boolean} modelValue 是否显示，支持 v-model
 * @property {String} position 弹出方向 left / right / top / bottom
 * @property {String} title 标题
 * @property {String} width 宽度（left / right）
 * @property {String} height 高度（top / bottom）
 * @property {Boolean} mask 是否显示遮罩
 * @property {Boolean} maskClosable 点击遮罩是否关闭
 * @event {Function} close 关闭时触发
 * @slot default 抽屉主体内容（放在 scroll-view 里）
 */
export default {
	name: 'VuiDrawer',
	emits: ['update:modelValue', 'change', 'close'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		position: {
			type: String,
			default: 'right'
		},
		title: {
			type: String,
			default: ''
		},
		width: {
			type: String,
			default: '560rpx'
		},
		height: {
			type: String,
			default: '600rpx'
		},
		mask: {
			type: Boolean,
			default: true
		},
		maskClosable: {
			type: Boolean,
			default: true
		}
	},
	data() {
		return {
			visible: false,
			opened: false
		};
	},
	computed: {
		isHorizontal() {
			return this.position === 'left' || this.position === 'right';
		},
		panelStyle() {
			return this.isHorizontal
				? 'width:' + this.width + ';'
				: 'height:' + this.height + ';';
		}
	},
	watch: {
		modelValue: {
			immediate: true,
			handler(val) {
				const next = val === true;
				if (next === this.visible) return;
				if (next) {
					this.visible = true;
					this.$nextTick(() => {
						this.opened = true;
					});
				} else {
					this.opened = false;
					setTimeout(() => {
						this.visible = false;
					}, 250);
				}
			}
		}
	},
	methods: {
		onMaskClick() {
			if (!this.maskClosable) return;
			this.close();
		},
		close() {
			this.opened = false;
			setTimeout(() => {
				this.visible = false;
			}, 250);
			this.$emit('update:modelValue', false);
			this.$emit('change', false);
			this.$emit('close');
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
.vui-drawer {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1000;

	&__mask {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.45);
		opacity: 0;
		transition: opacity 0.25s;

		&.is-open {
			opacity: 1;
		}
	}

	&__panel {
		position: absolute;
		display: flex;
		flex-direction: column;
		background-color: $vui-bg-color;
		transition: transform 0.25s ease-out;

		&--right {
			right: 0;
			top: 0;
			bottom: 0;
			transform: translateX(100%);
		}

		&--left {
			left: 0;
			top: 0;
			bottom: 0;
			transform: translateX(-100%);
		}

		&--top {
			left: 0;
			right: 0;
			top: 0;
			transform: translateY(-100%);
		}

		&--bottom {
			left: 0;
			right: 0;
			bottom: 0;
			transform: translateY(100%);
		}

		&.is-open {
			transform: translate(0, 0);
		}
	}

	&__header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx 32rpx;
		border-bottom: 1px solid $vui-bg-color-hover;
	}

	&__title {
		font-size: 30rpx;
		font-weight: bold;
		color: $vui-text-color;
	}

	&__close {
		font-size: 36rpx;
		color: $vui-text-color-placeholder;
	}

	&__body {
		flex: 1;
		padding: 24rpx 32rpx;
	}
}
</style>
