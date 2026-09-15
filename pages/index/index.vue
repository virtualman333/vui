<template>
	<view class="content">
		<view style="margin: 10rpx;">
			VUI，一款UI组件
		</view>
		<vui-header></vui-header>
		<view class="entry">
			<button class="entry-btn" type="default" @click="go('/pages/demo/demo')">组件总览</button>
			<button class="entry-btn" type="primary" @click="go('/pages/demo/ai')">AI 组件演示</button>
			<button class="entry-btn" type="default" @click="go('/pages/Test/Test')">开发者测试页面</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				title: 'Hello'
			}
		},
		methods: {
			go(url) {
				uni.navigateTo({
					url: url
				})
			}
		}
	}
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
	}

	.entry {
		display: flex;
		flex-direction: column;
		padding: 40rpx;
	}

	.entry-btn {
		margin-bottom: 24rpx;
	}
</style>
