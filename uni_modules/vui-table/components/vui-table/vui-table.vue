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
 * @slot column.key {row, index} 自定义该列单元格；插槽名取该列的 column.key（key 为 name 时写 #name）
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
/* ===== VUI 主题变量（兼底定义，可在项目 uni.scss 中覆盖） ===== */
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
$vui-text-color-disabled: #e4e7ed !default;
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
/* 代码块（深色底 + 配套前景）—— vui-code / vui-markdown 共用 */
$vui-code-bg: #282c34 !default;
$vui-code-color: #abb2bf !default;
/* ===== VUI 主题变量结束 ===== */
.vui-table {
	width: 100%;
	font-size: 26rpx;

	&--border &__cell {
		border-right: 1px solid $vui-border-color-light;

		&:last-child {
			border-right: none;
		}
	}

	&__header {
		display: flex;
		flex-direction: row;
		background-color: $vui-fill-color-lighter;
	}

	&__row {
		display: flex;
		flex-direction: row;
		border-top: 1px solid $vui-border-color-light;

		&--stripe {
			background-color: $vui-fill-color-lighter;
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
		color: $vui-text-color;
	}

	&__cell-text {
		font-size: 26rpx;
		color: $vui-text-color-regular;
	}

	&__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 60rpx 0;
		border-top: 1px solid $vui-border-color-light;
	}

	&__empty-text {
		font-size: 26rpx;
		color: $vui-text-color-secondary;
	}
}
</style>
