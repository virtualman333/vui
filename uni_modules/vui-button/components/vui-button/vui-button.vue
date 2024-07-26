<template>
	<!-- 通过传递不同的class，从而展示不同的样式 -->
	<button @click="handleClick" :class="'el-button--' + type">
		<slot></slot>
	</button>
</template>

<script>
export default {
	name: 'VuiButton',
	props: {
		type: {
			type: String,
			default: 'default'
		},
		size: String
	},

	computed: {},

	methods: {
		handleClick(evt) {
			this.$emit('click', evt);
		}
	}
};
</script>

<style lang="scss" scoped>
$vui-primary: #2979ff !default;
$vui-success: #18bc37 !default;
$vui-warning: #f3a73f !default;
$vui-error: #e43d33 !default;
$vui-info: #8f939c !default;

.vui-button {
}
.el-button--default {
}
.el-button--primary {
	background-color: $vui-primary;
	color: #fff;
}
.el-button--success {
	background-color: $vui-success;
	color: #fff;
}
.el-button--warning {
	background-color: $vui-warning;
	color: #fff;
}
.el-button--error {
	background-color: $vui-error;
}
</style>
