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
			<vui-input v-model="textValue" placeholder="请输入内容" label="标签:" :rules="[{ required: true, message: '用户昵称不能为空', trigger: 'blur' }]"></vui-input>
			{{ textValue }}
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
		return {
			textValue: '12345776'
		}
	},
	methods: {}
};
</script>

<style>
view {
	margin: 10px;
}
</style>
