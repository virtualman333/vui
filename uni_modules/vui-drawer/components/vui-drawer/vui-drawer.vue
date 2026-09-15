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
		background-color: #fff;
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
		border-bottom: 1px solid #f2f3f5;
	}

	&__title {
		font-size: 30rpx;
		font-weight: bold;
		color: #333;
	}

	&__close {
		font-size: 36rpx;
		color: #c0c4cc;
	}

	&__body {
		flex: 1;
		padding: 24rpx 32rpx;
	}
}
</style>
