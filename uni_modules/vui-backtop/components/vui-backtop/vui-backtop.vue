<template>
	<view v-if="visible" class="vui-backtop" :style="wrapStyle" @click="onBackTop">
		<slot>
			<text class="vui-backtop__icon">↑</text>
			<text v-if="text" class="vui-backtop__text">{{ text }}</text>
		</slot>
	</view>
</template>

<script>
/**
 * Backtop 回到顶部
 * @description 返回页面顶部的操作按钮，需要页面在 onPageScroll 中把 scrollTop 传入
 * @property {Number} scrollTop 页面滚动距离
 * @property {Number} visibilityHeight 滚动高度达到该值时显示
 * @property {String} right 距离右侧位置
 * @property {String} bottom 距离底部位置
 * @property {Number} duration 回到顶部的动画时长
 * @property {String} text 按钮文案
 * @event {Function} click 点击时触发
 */
export default {
	name: 'VuiBacktop',
	emits: ['click'],
	props: {
		scrollTop: {
			type: Number,
			default: 0
		},
		visibilityHeight: {
			type: Number,
			default: 200
		},
		right: {
			type: String,
			default: '40rpx'
		},
		bottom: {
			type: String,
			default: '80rpx'
		},
		duration: {
			type: Number,
			default: 300
		},
		text: {
			type: String,
			default: ''
		}
	},
	computed: {
		visible() {
			return (Number(this.scrollTop) || 0) >= (Number(this.visibilityHeight) || 0);
		},
		wrapStyle() {
			return 'right:' + this.right + ';bottom:' + this.bottom + ';';
		}
	},
	methods: {
		onBackTop() {
			uni.pageScrollTo({
				scrollTop: 0,
				duration: this.duration
			});
			this.$emit('click');
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-backtop {
	position: fixed;
	z-index: 999;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background-color: #fff;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.15);
	/* #ifdef H5 */
	cursor: pointer;
	/* #endif */

	&__icon {
		font-size: 34rpx;
		color: #2979ff;
	}

	&__text {
		margin-top: 2rpx;
		font-size: 18rpx;
		color: #2979ff;
	}
}
</style>
