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
			return this.color || '#2979ff';
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
				'border-color:' + (finish || current ? this.activeColor : '#dcdfe6') + ';' +
				'background-color:' + (finish ? this.activeColor : '#fff') + ';';
		},
		dotTextStyle(index) {
			const num = typeof this.size === 'number' ? this.size : parseFloat(this.size) || 48;
			const finish = this.isFinish(index);
			const current = this.isCurrent(index);
			return 'font-size:' + num * 0.55 + 'rpx;color:' +
				(finish ? '#fff' : current ? this.activeColor : '#c0c4cc') + ';';
		},
		lineStyle(index) {
			return 'background-color:' + (this.isFinish(index) ? this.activeColor : '#e5e6eb') + ';';
		},
		titleStyle(index) {
			const finish = this.isFinish(index);
			const current = this.isCurrent(index);
			return 'color:' + (finish || current ? '#333' : '#c0c4cc') + ';';
		},
		onClick(index) {
			this.$emit('update:modelValue', index);
			this.$emit('change', index);
		}
	}
};
</script>

<style lang="scss" scoped>
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
		border-color: #dcdfe6;
		border-radius: 50%;
		background-color: #fff;
	}

	&__line {
		background-color: #e5e6eb;

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
		color: #333;
	}

	&__desc {
		margin-top: 4rpx;
		font-size: 24rpx;
		color: #909399;
	}
}
</style>
