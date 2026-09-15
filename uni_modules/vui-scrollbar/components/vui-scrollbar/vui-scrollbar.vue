<template>
	<view class="vui-scrollbar" :style="wrapStyle">
		<scroll-view
			class="vui-scrollbar__view"
			:scroll-y="!horizontal"
			:scroll-x="horizontal"
			:show-scrollbar="false"
			@scroll="onScroll"
		>
			<view class="vui-scrollbar__content" :style="contentStyle">
				<slot></slot>
			</view>
		</scroll-view>
		<view
			v-if="showBar"
			class="vui-scrollbar__bar"
			:class="horizontal ? 'vui-scrollbar__bar--horizontal' : 'vui-scrollbar__bar--vertical'"
			:style="barStyle"
		>
			<view class="vui-scrollbar__thumb" :style="thumbStyle"></view>
		</view>
	</view>
</template>

<script>
/**
 * Scrollbar 滚动条
 * @description 自定义滚动条样式的滚动容器
 * @property {String} height 容器高度（纵向滚动时必填）
 * @property {Boolean} horizontal 是否横向滚动
 * @property {Boolean} always 是否常显滚动条
 * @property {String} barSize 滚动条厚度
 * @property {String} color 滚动条颜色
 */
export default {
	name: 'VuiScrollbar',
	props: {
		height: {
			type: String,
			default: '400rpx'
		},
		horizontal: {
			type: Boolean,
			default: false
		},
		always: {
			type: Boolean,
			default: false
		},
		barSize: {
			type: String,
			default: '8rpx'
		},
		color: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			clientSize: 0,
			contentSize: 0,
			scrollSize: 0,
			scrolling: false,
			timer: null
		};
	},
	computed: {
		wrapStyle() {
			return this.horizontal ? 'height:auto;' : 'height:' + this.height + ';';
		},
		contentStyle() {
			return this.horizontal ? 'display:inline-flex;flex-direction:row;' : '';
		},
		thumbColor() {
			return this.color || '#c0c4cc';
		},
		showBar() {
			return this.contentSize > this.clientSize + 1;
		},
		thumbLength() {
			if (!this.showBar) return 0;
			const ratio = this.clientSize / this.contentSize;
			return Math.max(20, Math.round(this.clientSize * ratio));
		},
		thumbOffset() {
			if (!this.showBar) return 0;
			const max = this.contentSize - this.clientSize;
			const ratio = max > 0 ? this.scrollSize / max : 0;
			return Math.round((this.clientSize - this.thumbLength) * Math.min(1, Math.max(0, ratio)));
		},
		barStyle() {
			return this.horizontal
				? 'height:' + this.barSize + ';'
				: 'width:' + this.barSize + ';';
		},
		thumbStyle() {
			if (this.horizontal) {
				return 'width:' + this.thumbLength + 'px;height:100%;margin-left:' + this.thumbOffset +
					'px;background-color:' + this.thumbColor + ';opacity:' + (this.always || this.scrolling ? 1 : 0.35) + ';';
			}
			return 'height:' + this.thumbLength + 'px;width:100%;margin-top:' + this.thumbOffset +
				'px;background-color:' + this.thumbColor + ';opacity:' + (this.always || this.scrolling ? 1 : 0.35) + ';';
		}
	},
	mounted() {
		this.$nextTick(() => {
			this.measure();
		});
	},
	beforeUnmount() {
		if (this.timer) clearTimeout(this.timer);
	},
	methods: {
		measure() {
			uni.createSelectorQuery()
				.in(this)
				.select('.vui-scrollbar__view')
				.boundingClientRect((rect) => {
					if (!rect) return;
					this.clientSize = this.horizontal ? rect.width : rect.height;
				})
				.exec();
			uni.createSelectorQuery()
				.in(this)
				.select('.vui-scrollbar__content')
				.boundingClientRect((rect) => {
					if (!rect) return;
					this.contentSize = this.horizontal ? rect.width : rect.height;
				})
				.exec();
		},
		onScroll(event) {
			const detail = event.detail || {};
			this.scrollSize = this.horizontal ? detail.scrollLeft || 0 : detail.scrollTop || 0;
			if (!this.contentSize) this.measure();
			this.scrolling = true;
			if (this.timer) clearTimeout(this.timer);
			this.timer = setTimeout(() => {
				this.scrolling = false;
			}, 800);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-scrollbar {
	position: relative;
	width: 100%;
	overflow: hidden;

	&__view {
		width: 100%;
		height: 100%;
	}

	&__bar {
		position: absolute;
		z-index: 2;
		border-radius: 999rpx;
		background-color: transparent;

		&--vertical {
			right: 2rpx;
			top: 0;
			bottom: 0;
		}

		&--horizontal {
			left: 0;
			right: 0;
			bottom: 2rpx;
		}
	}

	&__thumb {
		border-radius: 999rpx;
		background-color: #c0c4cc;
		transition: opacity 0.2s;
	}
}
</style>
