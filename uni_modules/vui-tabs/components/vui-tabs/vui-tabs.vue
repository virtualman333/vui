<template>
	<view class="vui-tabs" :class="'vui-tabs--' + type">
		<scroll-view
			class="vui-tabs__scroll"
			:scroll-x="scrollable"
			:show-scrollbar="false"
			:scroll-into-view="scrollIntoView"
			scroll-with-animation
		>
			<view class="vui-tabs__nav">
				<view
					v-for="(item, index) in list"
					:key="index"
					:id="'vui-tab-' + index"
					class="vui-tabs__item"
					:class="{ 'is-active': index === modelValue, 'is-disabled': item.disabled }"
					:style="itemStyle(index)"
					@click="onChange(index, item)"
				>
					<text class="vui-tabs__item-text" :style="textStyle(index)">{{ item.title }}</text>
				</view>
				<view v-if="type === 'line'" class="vui-tabs__line" :style="lineStyle"></view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
/**
 * Tabs 标签页
 * @description 分隔内容上有关联但属于不同类别的数据集合
 * @property {Array} items 标签数据 ['标签1'] 或 [{title, disabled}]
 * @property {Number} modelValue 当前索引，支持 v-model
 * @property {String} type 样式 line / card
 * @property {String} color 激活颜色
 * @property {Boolean} scrollable 是否可横向滚动
 * @event {Function} change 切换标签时触发
 */
export default {
	name: 'VuiTabs',
	emits: ['update:modelValue', 'change'],
	props: {
		items: {
			type: Array,
			default: () => []
		},
		modelValue: {
			type: Number,
			default: 0
		},
		type: {
			type: String,
			default: 'line'
		},
		color: {
			type: String,
			default: ''
		},
		scrollable: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		list() {
			return (this.items || []).map((item) => {
				return typeof item === 'string' ? { title: item, disabled: false } : item;
			});
		},
		activeColor() {
			return this.color || '#2979ff';
		},
		scrollIntoView() {
			return 'vui-tab-' + this.modelValue;
		},
		lineStyle() {
			const count = this.list.length || 1;
			const width = 100 / count;
			return 'width:' + width + '%;transform:translateX(' + this.modelValue * 100 + '%);' +
				'background-color:' + this.activeColor + ';';
		}
	},
	methods: {
		itemStyle(index) {
			let style = this.scrollable ? 'flex:0 0 auto;padding:0 24rpx;' : 'flex:1;';
			if (this.type === 'card' && index === this.modelValue) {
				style += 'background-color:' + this.activeColor + ';border-color:' + this.activeColor + ';';
			}
			return style;
		},
		textStyle(index) {
			if (index !== this.modelValue) return '';
			return this.type === 'card' ? 'color:#fff;' : 'color:' + this.activeColor + ';';
		},
		onChange(index, item) {
			if (item.disabled) return;
			if (index === this.modelValue) return;
			this.$emit('update:modelValue', index);
			this.$emit('change', index, item);
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-tabs {
	width: 100%;
	background-color: #fff;

	&__scroll {
		width: 100%;
	}

	&__nav {
		position: relative;
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 80rpx;
	}

	&__item {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 80rpx;
		padding: 0 12rpx;
		box-sizing: border-box;
		/* #ifdef H5 */
		cursor: pointer;
		/* #endif */

		&.is-disabled {
			opacity: 0.5;
			/* #ifdef H5 */
			cursor: not-allowed;
			/* #endif */
		}
	}

	&__item-text {
		font-size: 28rpx;
		color: #606266;
	}

	&--card &__item {
		margin-right: 8rpx;
		border-width: 1px;
		border-style: solid;
		border-color: #e5e6eb;
		border-radius: 8rpx 8rpx 0 0;
	}

	&__line {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 4rpx;
		border-radius: 4rpx;
		background-color: #2979ff;
		transition: transform 0.25s;
	}
}
</style>
