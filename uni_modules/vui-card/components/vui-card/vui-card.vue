<template>
	<view class="vui-card" :class="{ 'vui-card--shadow': shadow, 'vui-card--border': border }" :style="cardStyle">
		<view v-if="title || extra || $slots.header || $slots.extra" class="vui-card__header">
			<slot name="header">
				<text class="vui-card__title">{{ title }}</text>
				<view class="vui-card__extra">
					<slot name="extra">{{ extra }}</slot>
				</view>
			</slot>
		</view>
		<view class="vui-card__body" :style="bodyStyle">
			<slot></slot>
		</view>
		<view v-if="$slots.footer" class="vui-card__footer">
			<slot name="footer"></slot>
		</view>
	</view>
</template>

<script>
/**
 * Card 卡片
 * @description 将信息聚合在卡片容器中展示
 * @property {String} title 标题
 * @property {String} extra 头部右侧附加内容
 * @property {Boolean} shadow 是否显示阴影
 * @property {Boolean} border 是否显示边框
 * @property {String} padding 内容内边距
 * @property {String} radius 圆角
 */
export default {
	name: 'VuiCard',
	props: {
		title: {
			type: String,
			default: ''
		},
		extra: {
			type: String,
			default: ''
		},
		shadow: {
			type: Boolean,
			default: true
		},
		border: {
			type: Boolean,
			default: false
		},
		padding: {
			type: String,
			default: '24rpx'
		},
		radius: {
			type: String,
			default: '16rpx'
		}
	},
	computed: {
		cardStyle() {
			return 'border-radius:' + this.radius + ';';
		},
		bodyStyle() {
			return 'padding:' + this.padding + ';';
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-card {
	overflow: hidden;
	background-color: #fff;

	&--shadow {
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
	}

	&--border {
		border: 1px solid #e5e6eb;
	}

	&__header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx;
		border-bottom: 1px solid #f2f3f5;
	}

	&__title {
		font-size: 30rpx;
		font-weight: bold;
		color: #333;
	}

	&__extra {
		font-size: 26rpx;
		color: #909399;
	}

	&__body {
		font-size: 28rpx;
		color: #606266;
	}

	&__footer {
		padding: 24rpx;
		border-top: 1px solid #f2f3f5;
	}
}
</style>
