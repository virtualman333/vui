<template>
	<view class="vui-carousel" :style="'height:' + height + ';'">
		<swiper
			class="vui-carousel__swiper"
			:autoplay="autoplay"
			:interval="interval"
			:duration="duration"
			:circular="circular"
			:indicator-dots="indicator && indicatorType === 'dot'"
			:indicator-color="indicatorColor"
			:indicator-active-color="indicatorActiveColor"
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
/* VUI 主题色（与 uni.scss 中 $vui-* 变量保持一致，可通过 props 覆盖） */
const VUI_COLOR = {
	white: '#fff',
};
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
 * @property {String} indicatorColor 指示器颜色
 * @property {String} indicatorActiveColor 当前选中指示器的颜色
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
		},
		indicatorColor: {
			type: String,
			default: 'rgba(255,255,255,0.6)'
		},
		indicatorActiveColor: {
			type: String,
			default: VUI_COLOR.white
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
/* ===== VUI 主题变量（兜底定义，可在项目 uni.scss 中覆盖） ===== */
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
.vui-carousel {
	position: relative;
	width: 100%;
	overflow: hidden;
	border-radius: 12rpx;
	background-color: $vui-fill-color-light;

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
		color: $vui-text-color-inverse;
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
		color: $vui-text-color-inverse;
	}
}
</style>
