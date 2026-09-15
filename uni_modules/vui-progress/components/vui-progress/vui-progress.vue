<template>
	<view class="vui-progress">
		<view class="vui-progress__outer" :style="outerStyle">
			<view class="vui-progress__inner" :style="innerStyle">
				<text v-if="textInside && showText" class="vui-progress__text-inner" :style="textStyle">{{ text }}</text>
			</view>
		</view>
		<text v-if="!textInside && showText" class="vui-progress__text" :style="textStyle">{{ text }}</text>
	</view>
</template>

<script>
/**
 * Progress 进度条
 * @description 展示操作或任务的当前进度
 * @property {Number} percentage 百分比 0-100
 * @property {Number|String} strokeWidth 进度条高度，数字按 rpx 处理，默认 12
 * @property {String} color 进度条颜色，优先级高于 status
 * @property {String} status 状态 primary / success / warning / error
 * @property {Boolean} showText 是否显示文字
 * @property {Boolean} textInside 文字是否内显
 * @property {String} format 自定义文字，支持 {value} 占位
 */
const STATUS_COLOR = {
	primary: '#2979ff',
	success: '#18bc37',
	warning: '#f3a73f',
	error: '#e43d33'
};

export default {
	name: 'VuiProgress',
	props: {
		percentage: {
			type: Number,
			default: 0
		},
		strokeWidth: {
			type: [Number, String],
			default: 12
		},
		color: {
			type: String,
			default: ''
		},
		status: {
			type: String,
			default: 'primary'
		},
		showText: {
			type: Boolean,
			default: true
		},
		textInside: {
			type: Boolean,
			default: false
		},
		format: {
			type: String,
			default: ''
		}
	},
	computed: {
		percent() {
			let val = Number(this.percentage) || 0;
			if (val < 0) val = 0;
			if (val > 100) val = 100;
			return val;
		},
		barHeight() {
			return typeof this.strokeWidth === 'number' ? this.strokeWidth + 'rpx' : this.strokeWidth;
		},
		barColor() {
			return this.color || STATUS_COLOR[this.status] || STATUS_COLOR.primary;
		},
		outerStyle() {
			return 'height:' + this.barHeight + ';border-radius:' + this.barHeight + ';';
		},
		innerStyle() {
			return 'width:' + this.percent + '%;background-color:' + this.barColor +
				';border-radius:' + this.barHeight + ';';
		},
		textStyle() {
			return 'color:' + this.barColor + ';font-size:24rpx;';
		},
		text() {
			if (this.format) return this.format.replace('{value}', this.percent);
			return this.percent + '%';
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-progress {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 100%;

	&__outer {
		flex: 1;
		overflow: hidden;
		background-color: #ebedf0;
	}

	&__inner {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
		transition: width 0.3s;
	}

	&__text {
		margin-left: 12rpx;
		font-size: 24rpx;
	}

	&__text-inner {
		margin-right: 10rpx;
		font-size: 20rpx;
		color: #333;
	}
}
</style>
