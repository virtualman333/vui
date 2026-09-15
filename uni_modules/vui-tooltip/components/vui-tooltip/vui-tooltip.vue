<template>
	<view class="vui-tooltip">
		<view
			class="vui-tooltip__reference"
			@click="onTrigger"
			@mouseenter="onMouseEnter"
			@mouseleave="onMouseLeave"
		>
			<slot></slot>
		</view>
		<view
			v-if="visible"
			class="vui-tooltip__content"
			:class="'vui-tooltip__content--' + placement"
		>
			<text class="vui-tooltip__text"><slot name="content">{{ content }}</slot></text>
		</view>
	</view>
</template>

<script>
/**
 * Tooltip 提示
 * @description 常用于展示鼠标 hover 或点击时的提示信息
 * @property {String} content 提示内容
 * @property {String} placement 提示位置 top / bottom / left / right
 * @property {String} trigger 触发方式 click / hover（hover 仅 H5 生效）
 * @property {Boolean} modelValue 是否显示，支持 v-model
 * @event {Function} change 显示状态变化时触发
 */
export default {
	name: 'VuiTooltip',
	emits: ['update:modelValue', 'change'],
	props: {
		content: {
			type: String,
			default: ''
		},
		placement: {
			type: String,
			default: 'top'
		},
		trigger: {
			type: String,
			default: 'click'
		},
		modelValue: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			visible: false
		};
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
			if (this.trigger === 'hover') return;
			this.setVisible(!this.visible);
		},
		onMouseEnter() {
			if (this.trigger !== 'hover') return;
			this.setVisible(true);
		},
		onMouseLeave() {
			if (this.trigger !== 'hover') return;
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
.vui-tooltip {
	position: relative;
	display: inline-block;

	&__reference {
		display: inline-block;
	}

	&__content {
		position: absolute;
		z-index: 999;
		padding: 12rpx 20rpx;
		border-radius: 8rpx;
		background-color: rgba(0, 0, 0, 0.75);

		&--top {
			left: 50%;
			bottom: 100%;
			transform: translate(-50%, -12rpx);
		}

		&--bottom {
			left: 50%;
			top: 100%;
			transform: translate(-50%, 12rpx);
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
		font-size: 24rpx;
		color: #fff;
		white-space: nowrap;
	}
}
</style>
