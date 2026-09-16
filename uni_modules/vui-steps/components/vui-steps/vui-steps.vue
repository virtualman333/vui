<template>
	<view class="vui-steps" :class="'vui-steps--' + direction">
		<view v-for="(item, index) in list" :key="index" class="vui-steps__item" :style="itemStyle(index)" @click="onClick(index)">
			<view class="vui-steps__head">
				<view class="vui-steps__dot" :style="dotStyle(index)">
					<text class="vui-steps__dot-text" :style="dotTextStyle(index)">{{ dotText(index) }}</text>
				</view>
				<view v-if="index < list.length - 1" class="vui-steps__line" :style="lineStyle(index)"></view>
			</view>
			<view class="vui-steps__main">
				<text class="vui-steps__title" :style="titleStyle(index)">{{ item.title }}</text>
				<text v-if="item.desc" class="vui-steps__desc">{{ item.desc }}</text>
			</view>
		</view>
	</view>
</template>

<script>
/* VUI 主题色（与 uni.scss 中 $vui-* 变量保持一致，可通过 props 覆盖） */
const VUI_COLOR = {
	primary: '#2979ff',
	text: '#333',
	placeholder: '#c0c4cc',
	border: '#dcdfe6',
	borderLight: '#e5e6eb',
	white: '#fff',
};
/**
 * Steps 步骤条
 * @description 引导用户按流程完成任务
 * @property {Array} items 步骤数据 [{title, desc}]
 * @property {Number} modelValue 当前步骤索引，支持 v-model
 * @property {String} direction 方向 horizontal / vertical
 * @property {String} color 完成态颜色
 * @property {Number|String} size 圆点尺寸，数字按 rpx 处理，默认 48
 * @event {Function} change 点击步骤时触发
 */
export default {
	name: 'VuiSteps',
	emits: ['update:modelValue', 'change'],
	props: {
		items: {
			type: Array,
			default: () => []
		},
		modelValue: {
			type: Number,
			default: 0
		},
		direction: {
			type: String,
			default: 'horizontal'
		},
		color: {
			type: String,
			default: ''
		},
		size: {
			type: [Number, String],
			default: 48
		}
	},
	computed: {
		list() {
			return (this.items || []).map((item) => {
				return typeof item === 'string' ? { title: item, desc: '' } : item;
			});
		},
		dotSize() {
			return typeof this.size === 'number' ? this.size + 'rpx' : this.size;
		},
		activeColor() {
			return this.color || VUI_COLOR.primary;
		}
	},
	methods: {
		isFinish(index) {
			return index < this.modelValue;
		},
		isCurrent(index) {
			return index === this.modelValue;
		},
		dotText(index) {
			return this.isFinish(index) ? '✓' : String(index + 1);
		},
		itemStyle() {
			/* #ifdef H5 */
			return 'cursor:pointer;';
			/* #endif */
			/* #ifndef H5 */
			return '';
			/* #endif */
		},
		dotStyle(index) {
			const finish = this.isFinish(index);
			const current = this.isCurrent(index);
			const size = this.dotSize;
			return 'width:' + size + ';height:' + size + ';line-height:' + size + ';' +
				'border-color:' + (finish || current ? this.activeColor : VUI_COLOR.border) + ';' +
				'background-color:' + (finish ? this.activeColor : VUI_COLOR.white) + ';';
		},
		dotTextStyle(index) {
			const num = typeof this.size === 'number' ? this.size : parseFloat(this.size) || 48;
			const finish = this.isFinish(index);
			const current = this.isCurrent(index);
			return 'font-size:' + num * 0.55 + 'rpx;color:' +
				(finish ? VUI_COLOR.white : current ? this.activeColor : VUI_COLOR.placeholder) + ';';
		},
		lineStyle(index) {
			return 'background-color:' + (this.isFinish(index) ? this.activeColor : VUI_COLOR.borderLight) + ';';
		},
		titleStyle(index) {
			const finish = this.isFinish(index);
			const current = this.isCurrent(index);
			return 'color:' + (finish || current ? VUI_COLOR.text : VUI_COLOR.placeholder) + ';';
		},
		onClick(index) {
			this.$emit('update:modelValue', index);
			this.$emit('change', index);
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
.vui-steps {
	display: flex;

	&--horizontal {
		flex-direction: row;
	}

	&--vertical {
		flex-direction: column;
	}

	&__item {
		display: flex;

		.vui-steps--horizontal & {
			flex: 1;
			flex-direction: column;
		}

		.vui-steps--vertical & {
			flex-direction: row;
		}
	}

	&__head {
		display: flex;

		.vui-steps--horizontal & {
			flex-direction: row;
			align-items: center;
		}

		.vui-steps--vertical & {
			flex-direction: column;
			align-items: center;
		}
	}

	&__dot {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		border-width: 1px;
		border-style: solid;
		border-color: $vui-border-color;
		border-radius: 50%;
		background-color: $vui-bg-color;
	}

	&__line {
		background-color: $vui-border-color-lighter;

		.vui-steps--horizontal & {
			flex: 1;
			height: 1px;
			margin: 0 8rpx;
		}

		.vui-steps--vertical & {
			width: 1px;
			flex: 1;
			margin: 8rpx 0;
		}
	}

	&__main {
		display: flex;
		flex-direction: column;

		.vui-steps--horizontal & {
			align-items: center;
			margin-top: 8rpx;
		}

		.vui-steps--vertical & {
			padding-left: 16rpx;
			padding-bottom: 24rpx;
		}
	}

	&__title {
		font-size: 28rpx;
		color: $vui-text-color;
	}

	&__desc {
		margin-top: 4rpx;
		font-size: 24rpx;
		color: $vui-text-color-secondary;
	}
}
</style>
