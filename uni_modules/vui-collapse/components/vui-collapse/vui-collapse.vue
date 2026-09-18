<template>
	<view class="vui-collapse">
		<view v-for="(item, index) in list" :key="index" class="vui-collapse__item">
			<view class="vui-collapse__header" @click="onToggle(index)">
				<text class="vui-collapse__title">{{ item.title }}</text>
				<text v-if="arrow" class="vui-collapse__arrow" :class="{ 'is-active': isOpen(index) }">›</text>
			</view>
			<view v-if="isOpen(index)" class="vui-collapse__content">
				<slot name="content" :item="item" :index="index">
					<text class="vui-collapse__text">{{ item.content }}</text>
				</slot>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * Collapse 折叠面板
 * @description 可以折叠 / 展开的内容区域
 * @property {Array} items 面板数据 [{title, content}]
 * @property {Array} modelValue 展开的面板索引数组，支持 v-model
 * @property {Boolean} accordion 是否手风琴模式（同时只展开一个）
 * @property {Boolean} arrow 是否显示箭头
 * @event {Function} change 展开状态变化时触发
 * @slot content {item, index} 面板内容，覆盖 items[].content
 */
export default {
	name: 'VuiCollapse',
	emits: ['update:modelValue', 'change'],
	props: {
		items: {
			type: Array,
			default: () => []
		},
		modelValue: {
			type: Array,
			default: () => []
		},
		accordion: {
			type: Boolean,
			default: false
		},
		arrow: {
			type: Boolean,
			default: true
		}
	},
	data() {
		return {
			activeList: []
		};
	},
	computed: {
		list() {
			return (this.items || []).map((item) => {
				return typeof item === 'string' ? { title: item, content: '' } : item;
			});
		}
	},
	watch: {
		modelValue: {
			immediate: true,
			handler(val) {
				this.activeList = Array.isArray(val) ? val.slice() : [];
			}
		}
	},
	methods: {
		isOpen(index) {
			return this.activeList.indexOf(index) > -1;
		},
		onToggle(index) {
			let next = [];
			if (this.accordion) {
				next = this.isOpen(index) ? [] : [index];
			} else if (this.isOpen(index)) {
				next = this.activeList.filter((i) => i !== index);
			} else {
				next = this.activeList.concat([index]);
			}
			this.activeList = next;
			this.$emit('update:modelValue', next);
			this.$emit('change', next);
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
.vui-collapse {
	width: 100%;
	background-color: $vui-bg-color;

	&__item {
		border-bottom: 1px solid $vui-bg-color-hover;
	}

	&__header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx;
		/* #ifdef H5 */
		cursor: pointer;
		/* #endif */
	}

	&__title {
		font-size: 28rpx;
		color: $vui-text-color;
	}

	&__arrow {
		font-size: 32rpx;
		color: $vui-text-color-placeholder;
		transform: rotate(90deg);
		transition: transform 0.25s;

		&.is-active {
			transform: rotate(-90deg);
		}
	}

	&__content {
		padding: 0 24rpx 24rpx 24rpx;
	}

	&__text {
		font-size: 26rpx;
		color: $vui-text-color-regular;
		line-height: 1.6;
	}
}
</style>
