<template>
	<view class="vui-carousel" :style="'height:' + height + ';'">
		<swiper
			class="vui-carousel__swiper"
			:autoplay="autoplay"
			:interval="interval"
			:duration="duration"
			:circular="circular"
			:indicator-dots="indicator && indicatorType === 'dot'"
			indicator-color="rgba(255,255,255,0.6)"
			indicator-active-color="#ffffff"
			@change="onChange"
		>
			<swiper-item v-for="(item, index) in list" :key="index">
				<image class="vui-carousel__image" :src="imageSrc(item)" :mode="mode" @click="onClick(index, item)"></image>
				<text v-if="showTitle && itemTitle(item)" class="vui-carousel__title">{{ itemTitle(item) }}</text>
			</swiper-item>
		</swiper>
		<view v-if="indicator && indicatorType === 'number'" class="vui-carousel__indicator">
			<text class="vui-carousel__indicator-text">{{ current + 1 }} / {{ list.length }}</text>
		</view>
	</view>
</template>

<script>
/**
 * Carousel 轮播图
 * @description 在有限空间内循环播放同一类型的图片或内容
 * @property {Array} list 图片数据，字符串数组或 [{url, title}]
 * @property {String} height 高度
 * @property {Boolean} autoplay 是否自动播放
 * @property {Number} interval 自动切换时间间隔
 * @property {Number} duration 滑动动画时长
 * @property {Boolean} circular 是否采用衔接滑动
 * @property {Boolean} indicator 是否显示指示器
 * @property {String} indicatorType 指示器类型 dot / number
 * @property {String} mode 图片裁剪模式
 * @property {Boolean} showTitle 是否显示图片标题
 * @event {Function} change 切换时触发
 * @event {Function} click 点击图片时触发
 */
export default {
	name: 'VuiCarousel',
	emits: ['change', 'click'],
	props: {
		list: {
			type: Array,
			default: () => []
		},
		height: {
			type: String,
			default: '300rpx'
		},
		autoplay: {
			type: Boolean,
			default: true
		},
		interval: {
			type: Number,
			default: 3000
		},
		duration: {
			type: Number,
			default: 500
		},
		circular: {
			type: Boolean,
			default: true
		},
		indicator: {
			type: Boolean,
			default: true
		},
		indicatorType: {
			type: String,
			default: 'dot'
		},
		mode: {
			type: String,
			default: 'aspectFill'
		},
		showTitle: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			current: 0
		};
	},
	computed: {
		items() {
			return (this.list || []).map((item) => {
				return typeof item === 'string' ? { url: item, title: '' } : item;
			});
		},
	},
	methods: {
		imageSrc(item) {
			return item.url || item.src || '';
		},
		itemTitle(item) {
			return item.title || '';
		},
		onChange(event) {
			this.current = event.detail.current;
			this.$emit('change', this.current);
		},
		onClick(index, item) {
			this.$emit('click', index, item);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-carousel {
	position: relative;
	width: 100%;
	overflow: hidden;
	border-radius: 12rpx;
	background-color: #f5f7fa;

	&__swiper {
		width: 100%;
		height: 100%;
	}

	&__image {
		width: 100%;
		height: 100%;
	}

	&__title {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 16rpx 24rpx;
		font-size: 26rpx;
		color: #fff;
		background-color: rgba(0, 0, 0, 0.4);
	}

	&__indicator {
		position: absolute;
		right: 20rpx;
		bottom: 20rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		background-color: rgba(0, 0, 0, 0.4);
	}

	&__indicator-text {
		font-size: 22rpx;
		color: #fff;
	}
}
</style>
