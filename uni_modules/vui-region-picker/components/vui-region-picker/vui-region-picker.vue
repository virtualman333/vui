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
<style>
	.vui-region-input {
		outline-style: none;
		border: 1px solid #c0c4cc;
		border-radius: 5px;
		width: 100%;
		height: 100%;
		padding: 0;
		padding: 10px 15px;
		box-sizing: border-box;
		font-family: "Microsoft soft";
		font-size: 13px;

		&:focus {
			border-color: #f07b00;
			outline: 0;
			-webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
				#f07b00;
			box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
				#f07b00;
		}
	}
</style>