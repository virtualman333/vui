<template>
	<view class="vui-table" :class="{ 'vui-table--border': border }">
		<view class="vui-table__header">
			<view
				v-for="(column, index) in columns"
				:key="index"
				class="vui-table__cell vui-table__cell--header"
				:style="cellStyle(column)"
			>
				<text class="vui-table__header-text">{{ column.title }}</text>
			</view>
		</view>
		<view v-if="data.length === 0" class="vui-table__empty">
			<text class="vui-table__empty-text">{{ emptyText }}</text>
		</view>
		<view
			v-for="(row, rowIndex) in data"
			:key="rowIndex"
			class="vui-table__row"
			:class="{ 'vui-table__row--stripe': stripe && rowIndex % 2 === 1 }"
			@click="onRowClick(row, rowIndex)"
		>
			<view
				v-for="(column, colIndex) in columns"
				:key="colIndex"
				class="vui-table__cell"
				:style="cellStyle(column)"
			>
				<slot :name="column.key" :row="row" :index="rowIndex">
					<text class="vui-table__cell-text">{{ row[column.key] }}</text>
				</slot>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * Table 表格
 * @description 展示多条结构类似的数据
 * @property {Array} columns 列配置 [{title, key, width, align}]
 * @property {Array} data 行数据
 * @property {Boolean} border 是否显示纵向边框
 * @property {Boolean} stripe 是否显示斑马纹
 * @property {String} emptyText 空数据文案
 * @event {Function} row-click 点击行时触发
 */
export default {
	name: 'VuiTable',
	emits: ['row-click'],
	props: {
		columns: {
			type: Array,
			default: () => []
		},
		data: {
			type: Array,
			default: () => []
		},
		border: {
			type: Boolean,
			default: false
		},
		stripe: {
			type: Boolean,
			default: false
		},
		emptyText: {
			type: String,
			default: '暂无数据'
		}
	},
	methods: {
		cellStyle(column) {
			let style = '';
			if (column.width) style += 'width:' + column.width + ';flex:0 0 auto;';
			else style += 'flex:1;';
			if (column.align) style += 'text-align:' + column.align + ';';
			return style;
		},
		onRowClick(row, index) {
			this.$emit('row-click', row, index);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-table {
	width: 100%;
	font-size: 26rpx;

	&--border &__cell {
		border-right: 1px solid #ebeef5;

		&:last-child {
			border-right: none;
		}
	}

	&__header {
		display: flex;
		flex-direction: row;
		background-color: #fafafa;
	}

	&__row {
		display: flex;
		flex-direction: row;
		border-top: 1px solid #ebeef5;

		&--stripe {
			background-color: #fafafa;
		}
	}

	&__cell {
		display: flex;
		align-items: center;
		padding: 20rpx 16rpx;
		box-sizing: border-box;
		overflow: hidden;
	}

	&__header-text {
		font-size: 26rpx;
		font-weight: bold;
		color: #333;
	}

	&__cell-text {
		font-size: 26rpx;
		color: #606266;
	}

	&__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 60rpx 0;
		border-top: 1px solid #ebeef5;
	}

	&__empty-text {
		font-size: 26rpx;
		color: #909399;
	}
}
</style>
