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
					:class="{ 'is-active': index === currentIndex, 'is-disabled': item.disabled }"
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
/* VUI 主题色（与 uni.scss 中 $vui-* 变量保持一致，可通过 props 覆盖） */
const VUI_COLOR = {
	primary: '#2979ff',
	white: '#fff',
};
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
			return this.color || VUI_COLOR.primary;
		},
		/* 当前标签索引：把宿主传进来的值收成 [0, list.length - 1] 的整数。
		
		   旧实现在**五个地方**各拿 `this.modelValue` 直接比（模板里的
		   `index === modelValue`，以及 itemStyle / textStyle / onChange / lineStyle 四处），
		   于是一份入参有四种静默失效：
		     · 宿主绑字符串（'1' —— v-model 挂在 data 上，或者索引来自路由参数 / 接口，
		       很常见）：`index === '1'` 恒 false → 下划线**停在正确的标签下面**，
		       却没有任何标签高亮、卡片模式也不填充 —— 看起来像「当前项被跳过了」；
		     · 越界（99）→ `translateX(9900%)`，下划线直接飞出容器；
		     · 负数（-3）→ `translateX(-300%)`；
		     · 小数（1.7）→ 下划线卡在两个标签之间，同样不高亮。
		   四种都不报错、页面也不缺东西，所以只能靠人盯着才看得出来。
		
		   这与 vui-steps 第 27 轮修掉的是**同一个形状**；那次只修了一个组件，
		   所以这一次除了这里，还把「谁在拿宿主入参当索引比」整条对账补进了
		   check:logic（`宿主入参收敛` 一节），第三个组件不会再静默地长出来。
		
		   上界是 `list.length - 1` —— 标签没有「已走完」这种状态，
		   与 steps 允许取到 `list.length` 的语义不同。 */
		currentIndex() {
			const n = this.list.length;
			if (n <= 0) return 0;
			const raw = Number(this.modelValue);
			if (!isFinite(raw)) return 0;
			const i = Math.floor(raw);
			if (i < 0) return 0;
			return i > n - 1 ? n - 1 : i;
		},
		scrollIntoView() {
			return 'vui-tab-' + this.currentIndex;
		},
		lineStyle() {
			const count = this.list.length || 1;
			const width = 100 / count;
			return 'width:' + width + '%;transform:translateX(' + this.currentIndex * 100 + '%);' +
				'background-color:' + this.activeColor + ';';
		}
	},
	methods: {
		itemStyle(index) {
			let style = this.scrollable ? 'flex:0 0 auto;padding:0 24rpx;' : 'flex:1;';
			if (this.type === 'card' && index === this.currentIndex) {
				style += 'background-color:' + this.activeColor + ';border-color:' + this.activeColor + ';';
			}
			return style;
		},
		textStyle(index) {
			if (index !== this.currentIndex) return '';
			return this.type === 'card' ? 'color:' + VUI_COLOR.white + ';' : 'color:' + this.activeColor + ';';
		},
		onChange(index, item) {
			if (item.disabled) return;
			if (index === this.currentIndex) return;
			this.$emit('update:modelValue', index);
			this.$emit('change', index, item);
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
.vui-tabs {
	width: 100%;
	background-color: $vui-bg-color;

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
		color: $vui-text-color-regular;
	}

	&--card &__item {
		margin-right: 8rpx;
		border-width: 1px;
		border-style: solid;
		border-color: $vui-border-color-lighter;
		border-radius: 8rpx 8rpx 0 0;
	}

	&__line {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 4rpx;
		border-radius: 4rpx;
		background-color: $vui-primary;
		transition: transform 0.25s;
	}
}
</style>
