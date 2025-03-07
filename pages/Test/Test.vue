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
		<view>
			<vui-auto-scroll :list="list" width="7.06rem" height="6.75rem" scrollViewHeight="6.75rem"></vui-auto-scroll>
			<vui-auto-scroll :list="list" width="7.06rem" height="6.75rem" scrollViewHeight="6.75rem">
				<template #default="{ item }">
				    <view style="background-color: aqua;width: 100%;height: 100%;text-align: center;margin: 0;">
				        <text>自定义内容: {{ item.name}}</text>
						welcome!
				    </view>
				</template>
			</vui-auto-scroll>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			textValue: '12345776',
			list:[1,2,3,4,5,6,7,{name:8},{name:9}]
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
