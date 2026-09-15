<template>
	<view class="vui-pagination">
		<text v-if="showTotal" class="vui-pagination__total">共 {{ total }} 条</text>
		<view class="vui-pagination__pager">
			<view class="vui-pagination__btn" :class="{ 'is-disabled': current <= 1 }" @click="onPrev">
				<text class="vui-pagination__btn-text">{{ prevText }}</text>
			</view>
			<view
				v-for="(page, index) in pages"
				:key="index"
				class="vui-pagination__item"
				:class="{ 'is-active': page === current, 'is-ellipsis': page === '...' }"
				:style="itemStyle(page)"
				@click="onJump(page)"
			>
				<text class="vui-pagination__item-text" :style="textStyle(page)">{{ page }}</text>
			</view>
			<view class="vui-pagination__btn" :class="{ 'is-disabled': current >= pageCount }" @click="onNext">
				<text class="vui-pagination__btn-text">{{ nextText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * Pagination 分页
 * @description 数据过多时分页展示
 * @property {Number} modelValue 当前页码，支持 v-model
 * @property {Number} total 数据总条数
 * @property {Number} pageSize 每页条数
 * @property {Number} pagerCount 中间页码按钮数量
 * @property {Boolean} showTotal 是否显示总条数
 * @property {String} prevText 上一页文本
 * @property {String} nextText 下一页文本
 * @event {Function} change 页码变化时触发
 */
export default {
	name: 'VuiPagination',
	emits: ['update:modelValue', 'change'],
	props: {
		modelValue: {
			type: Number,
			default: 1
		},
		total: {
			type: Number,
			default: 0
		},
		pageSize: {
			type: Number,
			default: 10
		},
		pagerCount: {
			type: Number,
			default: 5
		},
		showTotal: {
			type: Boolean,
			default: false
		},
		prevText: {
			type: String,
			default: '‹'
		},
		nextText: {
			type: String,
			default: '›'
		},
		color: {
			type: String,
			default: ''
		}
	},
	computed: {
		current() {
			const val = Number(this.modelValue) || 1;
			return val < 1 ? 1 : val;
		},
		pageCount() {
			const size = Number(this.pageSize) || 10;
			return Math.max(1, Math.ceil((Number(this.total) || 0) / size));
		},
		activeColor() {
			return this.color || '#2979ff';
		},
		pages() {
			const count = this.pageCount;
			const pagerCount = Number(this.pagerCount) || 5;
			if (count <= pagerCount) {
				return this.range(1, count);
			}
			const half = Math.floor(pagerCount / 2);
			let start = Math.max(1, this.current - half);
			let end = start + pagerCount - 1;
			if (end > count) {
				end = count;
				start = end - pagerCount + 1;
			}
			const list = [];
			if (start > 1) {
				list.push(1);
				if (start > 2) list.push('...');
			}
			list.push.apply(list, this.range(start, end));
			if (end < count) {
				if (end < count - 1) list.push('...');
				list.push(count);
			}
			return list;
		}
	},
	methods: {
		range(start, end) {
			const arr = [];
			for (let i = start; i <= end; i++) arr.push(i);
			return arr;
		},
		itemStyle(page) {
			if (page !== this.current) return '';
			return 'background-color:' + this.activeColor + ';border-color:' + this.activeColor + ';';
		},
		textStyle(page) {
			if (page !== this.current) return '';
			return 'color:#fff;';
		},
		update(page) {
			const target = Math.min(Math.max(1, page), this.pageCount);
			if (target === this.current) return;
			this.$emit('update:modelValue', target);
			this.$emit('change', target);
		},
		onPrev() {
			this.update(this.current - 1);
		},
		onNext() {
			this.update(this.current + 1);
		},
		onJump(page) {
			if (page === '...') return;
			this.update(page);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-pagination {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;

	&__total {
		margin-right: 16rpx;
		font-size: 26rpx;
		color: #606266;
	}

	&__pager {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	&__btn,
	&__item {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 56rpx;
		height: 56rpx;
		margin: 0 6rpx;
		padding: 0 8rpx;
		box-sizing: border-box;
		border: 1px solid #e5e6eb;
		border-radius: 8rpx;
		background-color: #fff;
		/* #ifdef H5 */
		cursor: pointer;
		/* #endif */
	}

	&__btn-text,
	&__item-text {
		font-size: 26rpx;
		color: #606266;
	}

	&__item.is-active {
		background-color: #2979ff;
		border-color: #2979ff;
	}

	&__item.is-active &__item-text {
		color: #fff;
	}

	&__item.is-ellipsis {
		border-color: transparent;
		/* #ifdef H5 */
		cursor: default;
		/* #endif */
	}

	&__btn.is-disabled {
		opacity: 0.5;
		/* #ifdef H5 */
		cursor: not-allowed;
		/* #endif */
	}
}
</style>
