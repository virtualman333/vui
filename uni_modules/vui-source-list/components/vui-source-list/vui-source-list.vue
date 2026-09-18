<template>
	<view class="vui-source-list" :class="'vui-source-list--' + variant">
		<view v-if="hasHead" class="vui-source-list__head">
			<slot name="title">
				<text class="vui-source-list__title">{{ title }}</text>
				<text v-if="items.length" class="vui-source-list__count">{{ items.length }}</text>
			</slot>
		</view>

		<view v-if="!items.length" class="vui-source-list__empty">
			<text class="vui-source-list__empty-text">{{ emptyText }}</text>
		</view>

		<view v-else class="vui-source-list__body">
			<view
				v-for="(item, index) in items"
				:key="index"
				class="vui-source-list__item"
				:class="{
					'vui-source-list__item--active': isActive(index, item),
					'vui-source-list__item--link': clickable
				}"
				@click="onSelect(item, index)"
			>
				<view v-if="showIndex" class="vui-source-list__index">
					<text class="vui-source-list__index-text">{{ index + 1 }}</text>
				</view>

				<view class="vui-source-list__main">
					<text class="vui-source-list__name" :style="nameStyle">{{ item.title }}</text>
					<view v-if="variant === 'list'" class="vui-source-list__meta">
						<text v-if="item.tag" class="vui-source-list__tag">{{ item.tag }}</text>
						<text v-if="siteOf(item)" class="vui-source-list__site">{{ siteOf(item) }}</text>
					</view>
					<text
						v-if="variant === 'list' && item.snippet"
						class="vui-source-list__snippet"
						:style="snippetStyle"
					>{{ item.snippet }}</text>
				</view>

				<view v-if="variant === 'list'" class="vui-source-list__arrow">
					<text class="vui-source-list__arrow-text">›</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * 引用来源列表
 * @description 展示 AI 回答引用的来源（RAG / 联网检索）：支持序号角标、站点名、摘要截断、紧凑模式，以及与正文角标联动高亮
 * @property {Array} sources 来源数组，元素为对象 { title, url, domain, snippet, tag, id }，也可直接传 URL 字符串
 * @property {String} title 列表标题，默认「参考来源」
 * @property {String} variant 展示形态 list（卡片列表，默认）/ compact（单行标签）
 * @property {Boolean} showIndex 是否显示序号角标，默认 true
 * @property {Number|String} activeIndex 高亮项的序号（从 1 开始）或来源的 id，用于与正文角标联动
 * @property {Number} maxTitleLines 标题最大行数，默认 2，传 0 表示不截断
 * @property {Number} maxSnippetLines 摘要最大行数，默认 2，传 0 表示不截断
 * @property {String} emptyText 无来源时的占位文案
 * @property {Boolean} clickable 是否可点击，默认 true
 * @event {Function} select 点击某条来源时触发，参数为 (来源对象, 从 0 开始的索引)
 * @slot title 列表标题，覆盖 title 与条数角标
 */
export default {
	name: 'VuiSourceList',
	emits: ['select'],
	props: {
		sources: {
			type: Array,
			default: () => []
		},
		title: {
			type: String,
			default: '参考来源'
		},
		variant: {
			type: String,
			default: 'list'
		},
		showIndex: {
			type: Boolean,
			default: true
		},
		activeIndex: {
			type: [Number, String],
			default: ''
		},
		maxTitleLines: {
			type: Number,
			default: 2
		},
		maxSnippetLines: {
			type: Number,
			default: 2
		},
		emptyText: {
			type: String,
			default: '暂无引用来源'
		},
		clickable: {
			type: Boolean,
			default: true
		}
	},
	computed: {
		/** 归一化：字符串当 URL 用；对象补齐 title；非对象一律丢掉（不渲染空壳） */
		items() {
			const list = Array.isArray(this.sources) ? this.sources : [];
			const out = [];
			for (let i = 0; i < list.length; i++) {
				const raw = list[i];
				if (typeof raw === 'string') {
					if (!raw) continue;
					out.push({ title: raw, url: raw, domain: '', snippet: '', tag: '', id: '' });
					continue;
				}
				if (!raw || typeof raw !== 'object') continue;
				const title = raw.title || raw.url || raw.domain || '';
				if (!title) continue;
				out.push({
					title: String(title),
					url: raw.url || '',
					domain: raw.domain || '',
					snippet: raw.snippet || raw.desc || '',
					tag: raw.tag || '',
					id: raw.id === 0 || raw.id ? String(raw.id) : ''
				});
			}
			return out;
		},
		hasHead() {
			return !!this.title || !!(this.$slots && this.$slots.title);
		},
		nameStyle() {
			return clampStyle(this.maxTitleLines);
		},
		snippetStyle() {
			return clampStyle(this.maxSnippetLines);
		}
	},
	methods: {
		onSelect(item, index) {
			if (!this.clickable) return;
			this.$emit('select', item, index);
		},
		/** 站点名：优先用 sources 里给的 domain，否则从 url 里取主机名 */
		siteOf(item) {
			if (item.domain) return item.domain;
			const url = item.url || '';
			const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url);
			if (!m) return '';
			return m[1].replace(/^www\./i, '');
		},
		/** 与正文里的 [1] 角标联动：序号（从 1 开始）或 id 命中即高亮 */
		isActive(index, item) {
			const a = this.activeIndex;
			if (a === '' || a === null || a === undefined) return false;
			if (String(a) === String(index + 1)) return true;
			return !!item.id && String(a) === item.id;
		}
	}
};

/** 多行截断（0 = 不截断）。写成模块级纯函数是安全的：它只在 computed 里被调用，模板不引用它 */
function clampStyle(lines) {
	const n = Number(lines);
	if (!n || n <= 0) return '';
	return 'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + n + ';overflow:hidden;';
}
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
.vui-source-list {
	padding: 20rpx 24rpx;
	border-radius: 16rpx;
	border: 1px solid $vui-border-color-light;
	background-color: $vui-bg-color;

	&--compact {
		padding: 12rpx 16rpx;
	}

	&__head {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 12rpx;
	}

	&__title {
		font-size: 26rpx;
		font-weight: bold;
		color: $vui-text-color;
	}

	&__count {
		margin-left: 12rpx;
		padding: 0 12rpx;
		border-radius: 999rpx;
		font-size: 20rpx;
		line-height: 32rpx;
		color: $vui-text-color-secondary;
		background-color: $vui-fill-color-light;
	}

	&__empty {
		padding: 24rpx 0;
		text-align: center;
	}

	&__empty-text {
		font-size: 24rpx;
		color: $vui-text-color-placeholder;
	}

	&__body {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
	}

	&__item {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		width: 100%;
		padding: 16rpx;
		margin-bottom: 12rpx;
		border-radius: 12rpx;
		border: 1px solid $vui-border-color-lighter;
		background-color: $vui-fill-color-lighter;

		&--link {
			/* 可点击的视觉暗示交给 active 态，这里只留指针语义（H5 生效） */
			cursor: pointer;
		}

		&--active {
			border-color: $vui-primary;
			background-color: $vui-active-bg-color;
		}
	}

	&__index {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36rpx;
		height: 36rpx;
		margin-right: 16rpx;
		border-radius: 8rpx;
		background-color: $vui-fill-color-light;
	}

	&__index-text {
		font-size: 22rpx;
		line-height: 1;
		color: $vui-text-color-regular;
	}

	&__main {
		flex: 1;
		min-width: 0;
	}

	&__name {
		display: block;
		font-size: 26rpx;
		line-height: 1.5;
		color: $vui-text-color;
		word-break: break-all;
	}

	&__meta {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		margin-top: 6rpx;
	}

	&__tag {
		margin-right: 12rpx;
		padding: 2rpx 12rpx;
		border-radius: 6rpx;
		font-size: 20rpx;
		color: $vui-text-color-secondary;
		background-color: $vui-fill-color;
	}

	&__site {
		font-size: 22rpx;
		color: $vui-text-color-placeholder;
	}

	&__snippet {
		display: block;
		margin-top: 8rpx;
		font-size: 24rpx;
		line-height: 1.6;
		color: $vui-text-color-secondary;
		word-break: break-all;
	}

	&__arrow {
		flex-shrink: 0;
		margin-left: 12rpx;
	}

	&__arrow-text {
		font-size: 30rpx;
		line-height: 1;
		color: $vui-text-color-placeholder;
	}

	/* 紧凑模式：单行标签流 */
	&--compact &__item {
		width: auto;
		align-items: center;
		padding: 6rpx 16rpx;
		margin: 0 12rpx 8rpx 0;
		border-radius: 999rpx;
		background-color: $vui-fill-color-light;
	}

	&--compact &__index {
		width: auto;
		height: auto;
		min-width: 28rpx;
		margin-right: 8rpx;
		background-color: transparent;
	}

	&--compact &__name {
		font-size: 24rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&--compact &__main {
		flex: 0 1 auto;
		max-width: 420rpx;
	}
}
</style>
