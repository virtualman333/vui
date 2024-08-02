<template>
	<view>
		<view>
			<vui-button type="primary" @click="console.log(1)">按钮</vui-button>
		</view>

		<view>
			<vui-tag text="标签" type="default"></vui-tag>
			<vui-tag text="标签" type="primary"></vui-tag>
			<vui-tag text="标签" type="warning"></vui-tag>
			<vui-tag text="标签" type="success"></vui-tag>
			<vui-tag text="标签" type="error"></vui-tag>
		</view>

		<view>
			<vui-input placeholder="请输入内容" type="password" label="标签:" errorMessage="错误"></vui-input>
		</view>

		<view>
			<vui-region-picker :level="3"></vui-region-picker>
		</view>

		<view>
			<vui-switch></vui-switch>
			<vui-switch disabled="true"></vui-switch>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {};
	},
	methods: {}
};
</script>

<style>
view {
	margin: 10px;
}
</style>
