<template>
	<view class="vui-image" :style="wrapStyle" @click="onClick">
		<image
			class="vui-image__img"
			:src="currentSrc"
			:mode="mode"
			:lazy-load="lazyLoad"
			@load="onLoad"
			@error="onError"
		></image>
		<view v-if="loading" class="vui-image__placeholder">
			<text class="vui-image__placeholder-text">{{ placeholderText }}</text>
		</view>
		<view v-if="failed" class="vui-image__error">
			<text class="vui-image__error-text">{{ errorText }}</text>
		</view>
	</view>
</template>

<script>
/**
 * Image 图片
 * @description 图片容器，支持加载占位、失败兜底与预览
 * @property {String} src 图片地址
 * @property {String} mode 裁剪模式，同 image 组件
 * @property {String} width 宽度
 * @property {String} height 高度
 * @property {String} radius 圆角
 * @property {Boolean} preview 点击是否预览
 * @property {Boolean} lazyLoad 是否懒加载
 * @property {String} placeholderText 加载中文案
 * @property {String} errorText 加载失败文案
 * @property {String} fallback 加载失败时展示的图片
 * @event {Function} click 点击图片时触发
 * @event {Function} load 图片加载完成时触发
 * @event {Function} error 图片加载失败时触发
 */
export default {
	name: 'VuiImage',
	emits: ['click', 'load', 'error'],
	props: {
		src: {
			type: String,
			default: ''
		},
		mode: {
			type: String,
			default: 'aspectFill'
		},
		width: {
			type: String,
			default: '100%'
		},
		height: {
			type: String,
			default: '300rpx'
		},
		radius: {
			type: String,
			default: '0'
		},
		preview: {
			type: Boolean,
			default: false
		},
		lazyLoad: {
			type: Boolean,
			default: true
		},
		placeholderText: {
			type: String,
			default: ''
		},
		errorText: {
			type: String,
			default: '加载失败'
		},
		fallback: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			loading: true,
			failed: false
		};
	},
	computed: {
		currentSrc() {
			if (this.failed && this.fallback) return this.fallback;
			return this.src;
		},
		wrapStyle() {
			return 'width:' + this.width + ';height:' + this.height +
				';border-radius:' + this.radius + ';';
		}
	},
	watch: {
		src() {
			this.loading = true;
			this.failed = false;
		}
	},
	methods: {
		onLoad(event) {
			this.loading = false;
			this.failed = false;
			this.$emit('load', event);
		},
		onError(event) {
			this.loading = false;
			this.failed = true;
			this.$emit('error', event);
		},
		onClick() {
			if (this.preview && this.src) {
				uni.previewImage({
					urls: [this.src],
					current: this.src
				});
			}
			this.$emit('click');
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-image {
	position: relative;
	overflow: hidden;
	background-color: #f5f7fa;

	&__img {
		width: 100%;
		height: 100%;
	}

	&__placeholder,
	&__error {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f5f7fa;
	}

	&__placeholder-text,
	&__error-text {
		font-size: 24rpx;
		color: #c0c4cc;
	}
}
</style>
