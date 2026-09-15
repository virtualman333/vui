<template>
	<view class="vui-popover">
		<view class="vui-popover__reference" @click="onTrigger">
			<slot></slot>
		</view>
		<view v-if="visible && mask" class="vui-popover__mask" @click="onClose"></view>
		<view
			v-if="visible"
			class="vui-popover__content"
			:class="'vui-popover__content--' + placement"
			:style="contentStyle"
		>
			<slot name="content">
				<text class="vui-popover__text">{{ content }}</text>
			</slot>
		</view>
	</view>
</template>

<script>
/**
 * Popover 弹出框
 * @description 点击某个元素弹出卡片式的浮层
 * @property {Boolean} modelValue 是否显示，支持 v-model
 * @property {String} content 弹出框内容
 * @property {String} placement 弹出位置 top / bottom / left / right
 * @property {String} trigger 触发方式 click / manual
 * @property {Boolean} mask 是否显示遮罩
 * @property {String} width 弹出框宽度
 * @event {Function} change 显示状态变化时触发
 */
export default {
	name: 'VuiPopover',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		content: {
			type: String,
			default: ''
		},
		placement: {
			type: String,
			default: 'bottom'
		},
		trigger: {
			type: String,
			default: 'click'
		},
		mask: {
			type: Boolean,
			default: true
		},
		width: {
			type: String,
			default: '300rpx'
		}
	},
	data() {
		return {
			visible: false
		};
	},
	computed: {
		contentStyle() {
			return 'width:' + this.width + ';';
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
		onTrigger() {
			if (this.trigger !== 'click') return;
			this.setVisible(!this.visible);
		},
		onClose() {
			this.setVisible(false);
		},
		setVisible(val) {
			this.visible = val;
			this.$emit('update:modelValue', val);
			this.$emit('change', val);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-popover {
	position: relative;
	display: inline-block;

	&__reference {
		display: inline-block;
	}

	&__mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 998;
		background-color: transparent;
	}

	&__content {
		position: absolute;
		z-index: 999;
		padding: 20rpx;
		box-sizing: border-box;
		border-radius: 12rpx;
		background-color: #fff;
		box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.12);

		&--bottom {
			left: 50%;
			top: 100%;
			transform: translate(-50%, 12rpx);
		}

		&--top {
			left: 50%;
			bottom: 100%;
			transform: translate(-50%, -12rpx);
		}

		&--left {
			right: 100%;
			top: 50%;
			transform: translate(-12rpx, -50%);
		}

		&--right {
			left: 100%;
			top: 50%;
			transform: translate(12rpx, -50%);
		}
	}

	&__text {
		font-size: 26rpx;
		color: #606266;
		line-height: 1.6;
	}
}
</style>
