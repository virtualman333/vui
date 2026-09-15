<template>
	<view>
		<picker mode="multiSelector" @columnchange="OnColumnchange" :value="value" range-key="name" :range="lists"
			@change="onChange">
			<input v-if="level==3" class="vui-region-input" :disabled="true"
				:value="lists[0][value[0]].name+'-'+lists[1][value[1]].name+'-'+lists[2][value[2]].name" />
			<input v-if="level==2" class="vui-region-input" :disabled="true"
				:value="lists[0][value[0]].name+'-'+lists[1][value[1]].name" />
			<input v-if="level==1" class="vui-region-input" :disabled="true"
				:value="lists[0][value[0]].name" />
		</picker>
	</view>
</template>
<script>
	import city from './data/city.json'
	import province from './data/province.json'
	import county from './data/county.json'
	/**
	 * 城市选择器
	 * @description 用于选择中国城市地区 组件
	 * @tutorial https://github.com/virtualman333/vui
	 * @property {Number} level = [1：省|2：省市|3：省市区|4：省市区镇] 
	 * @property {Array} value = [默认值] 
	 */
	export default {
		name: 'vuiRegionPicker',
		emits: ['change'],
		props: {
			value: {
				type: Array,
				default: [0,0,0]
			},
			level: {
				type: Number,
				default: 3,
			}
		},
		data() {
			return {
				lists: [
					[],
					[],
					[]
				],
				now_ids: [0,0, 0],
				now_provice_id: 0,
				now_city_id: 0,
				now_county_id: 0,
			};
		},

		computed: {

		},
		created() {
			this.getData(0);
		},
		mounted() {

		},
		methods: {
			getData(type) {
				var that = this;

				var list_province = [];
				var list_city = [];
				var list_county = [];
				for (var i in province) {
					list_province.push(province[i])
				}
				if (this.now_provice_id == 0) {
					this.now_provice_id = province[this.value[0]].id
				}
				if (type == 0) {
					this.now_city_id = city[this.now_provice_id][this.value[1]].id
					this.now_county_id = county[this.now_city_id][this.value[2]].id
				}
				if (type == 1) {

					this.now_county_id = county[this.now_city_id][0].id
				}

				for (var i in city[this.now_provice_id]) {
					list_city.push(city[this.now_provice_id][i])
				}
				for (var i in county[this.now_city_id]) {
					list_county.push(county[this.now_city_id][i])
				}
				var level_int = parseInt(this.level)
				switch (level_int) {
					case 1:
						this.lists = [list_province]
						break;
					case 2:
						this.lists = [list_province, list_city]
						break;
					case 3:
						this.lists = [list_province, list_city, list_county]
						break;
					case 4:
						break;
				}

				console.log((this.lists));
			},
			OnColumnchange(e) {
				console.log(e.detail);
				var that = this;
				this.value[e.detail.column] = e.detail.value;
				this.now_ids[e.detail.column] = this.lists[e.detail.column][e.detail.value].id;
				console.log(this.value, this.now_ids);
				switch (e.detail.column) {
					case 0:
						that.now_provice_id = this.lists[0][e.detail.value].id;
						this.now_city_id = 0;
						this.value[1] = 0;
						this.value[2] = 0;
						this.now_county_id = 0;
						break;
					case 1:
						that.now_city_id = this.lists[1][e.detail.value].id;
						this.now_county_id = 0;
						this.value[2] = 0;
						break;
					case 2:
						that.now_county_id = this.lists[2][e.detail.value].id;
						break;
				}
				this.getData(e.detail.column);
				this.$emit('columnchange');
			},
			onChange(e) {
				console.log(e);

				this.$emit('change', e);
			}
		}
	};
</script>
<style lang="scss">
/* ===== VUI 主题变量（兜底定义，可在项目 uni.scss 中覆盖） ===== */
/* 功能色 */
$vui-primary: #2979ff !default;
$vui-success: #18bc37 !default;
$vui-warning: #f3a73f !default;
$vui-error: #e43d33 !default;
$vui-info: #8f939c !default;
$vui-region-active-color: #f07b00 !default;
/* 文字色 */
$vui-text-color: #333 !default;
$vui-text-color-regular: #606266 !default;
$vui-text-color-secondary: #909399 !default;
$vui-text-color-placeholder: #c0c4cc !default;
$vui-text-color-inverse: #fff !default;
/* 边框色 */
$vui-border-color: #dcdfe6 !default;
$vui-border-color-light: #ebeef5 !default;
$vui-border-color-lighter: #e5e6eb !default;
/* 填充与背景色 */
$vui-bg-color: #fff !default;
$vui-bg-color-hover: #f2f3f5 !default;
$vui-fill-color: #f1f1f1 !default;
$vui-fill-color-light: #f5f7fa !default;
$vui-fill-color-lighter: #fafafa !default;
$vui-track-color: #ebedf0 !default;
$vui-active-bg-color: #f5f9ff !default;
$vui-gray-color: #ccc !default;
$vui-white: #fff !default;
/* ===== VUI 主题变量结束 ===== */
	.vui-region-input {
		outline-style: none;
		border: 1px solid $vui-text-color-placeholder;
		border-radius: 5px;
		width: 100%;
		height: 100%;
		padding: 0;
		padding: 10px 15px;
		box-sizing: border-box;
		font-family: "Microsoft soft";
		font-size: 13px;

		&:focus {
			border-color: $vui-region-active-color;
			outline: 0;
			-webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
				$vui-region-active-color;
			box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
				$vui-region-active-color;
		}
	}
</style>