<template>
	<view class="v-header">
		
		<view style="text-align: center;">{{title}}</view>
	</view>
</template>
<script>
const app = getApp();
export default {
	props:{
		title:{
			default:'标题',
			type:String
		}
	},
	data(){
		return{

		}
	},
	methods:{
		
	},
	created() {
		
		
		
	}
}
</script>
<style>
	.v-header{
		background-color: #f1f1f1;
		height: 30px;
		width: 750rpx;
		
	}
	
</style>
