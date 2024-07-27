<template>
	<switch :disabled="disabled" ></switch>
</template>
<script>
	export default {
		name: 'VuiSwitch',
		
		props: {
			
			type: {
				type: String,
				default: 'default'
			},
			size: String,
			disabled:{
				type:Boolean,
				default:false,
			}
		},
	
		computed: {},
	
		methods: {
			handleClick(evt) {
				this.$emit('click', evt);
			}
		}
	};
</script>
<style>
</style>
