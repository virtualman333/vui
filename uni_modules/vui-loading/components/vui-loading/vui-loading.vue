<template>
	<view
		v-if="visible"
		class="vui-loading"
		:class="{ 'vui-loading--mask': mask, 'vui-loading--vertical': vertical }"
		:style="maskStyle"
		@click.stop
	>
		<view class="vui-loading__spinner" :style="spinnerStyle">
			<view v-if="type === 'dot'" class="vui-loading__dots">
				<view
					v-for="i in 3"
					:key="i"
					class="vui-loading__dot"
					:style="dotStyle(i)"
				></view>
			</view>
			<view v-else class="vui-loading__ring" :class="'vui-loading__ring--' + type" :style="ringStyle"></view>
		</view>
		<text v-if="text" class="vui-loading__text" :style="textStyle">{{ text }}</text>
	</view>
</template>

<script>
/**
 * Loading 加载
 * @description 加载数据时显示动效
 * @property {Boolean} modelValue 是否显示，支持 v-model
 * @property {String} type 类型 circle / spinner / dot
 * @property {Number|String} size 尺寸，数字按 rpx 处理，默认 48
 * @property {String} color 主题色
 * @property {String} text 加载文案
 * @property {Boolean} mask 是否显示遮罩
 * @property {Boolean} vertical 图标与文案是否纵向排列
 */
export default {
	name: 'VuiLoading',
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		type: {
			type: String,
			default: 'circle'
		},
		size: {
			type: [Number, String],
			default: 48
		},
		color: {
			type: String,
			default: ''
		},
		text: {
			type: String,
			default: ''
		},
		mask: {
			type: Boolean,
			default: false
		},
		vertical: {
			type: Boolean,
			default: true
		}
	},
	data() {
		return {
			visible: false
		};
	},
	computed: {
		iconSize() {
			return typeof this.size === 'number' ? this.size + 'rpx' : this.size;
		},
		activeColor() {
			return this.color || '#2979ff';
		},
		spinnerStyle() {
			return 'width:' + this.iconSize + ';height:' + this.iconSize + ';';
		},
		ringStyle() {
			const num = typeof this.size === 'number' ? this.size : parseFloat(this.size) || 48;
			const border = Math.max(2, Math.round(num / 16));
			return 'width:' + this.iconSize + ';height:' + this.iconSize + ';' +
				'border-width:' + border + 'rpx;border-color:' + this.activeColor + ';' +
				'border-top-color:transparent;' +
				(this.type === 'spinner' ? 'border-right-color:transparent;' : '');
		},
		textStyle() {
			return 'color:' + this.activeColor + ';font-size:26rpx;';
		},
		maskStyle() {
			return this.mask ? 'background-color:rgba(255,255,255,0.6);' : '';
		}
	},
	watch: {
		modelValue: {
			immediate: true,
			handler(val) {
				this.visible = val === true;
			}
		}
	},
	methods: {
		dotStyle(i) {
			const num = typeof this.size === 'number' ? this.size : parseFloat(this.size) || 48;
			const dot = num / 5;
			return 'width:' + dot + 'rpx;height:' + dot + 'rpx;border-radius:50%;' +
				'background-color:' + this.activeColor + ';' +
				'animation-delay:' + (i - 1) * 0.16 + 's;';
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-loading {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	padding: 20rpx;

	&--vertical {
		flex-direction: column;
	}

	&--mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 1000;
	}

	&__spinner {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__ring {
		box-sizing: border-box;
		border-style: solid;
		border-radius: 50%;
		animation: vui-loading-spin 0.8s linear infinite;
	}

	&__dots {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	&__dot {
		animation: vui-loading-bounce 0.9s ease-in-out infinite;
	}

	&__text {
		font-size: 26rpx;
		color: #2979ff;

		.vui-loading--vertical & {
			margin-top: 16rpx;
		}

		.vui-loading:not(.vui-loading--vertical) & {
			margin-left: 16rpx;
		}
	}
}

@keyframes vui-loading-spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

@keyframes vui-loading-bounce {
	0%,
	100% {
		transform: scale(0.6);
		opacity: 0.4;
	}
	50% {
		transform: scale(1);
		opacity: 1;
	}
}
</style>
