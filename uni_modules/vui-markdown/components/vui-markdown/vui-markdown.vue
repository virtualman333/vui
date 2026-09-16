<template>
	<view class="vui-markdown">
		<view v-for="(block, bi) in blocks" :key="bi" class="vui-markdown__block">
			<!-- 标题 -->
			<text
				v-if="block.type === 'h'"
				class="vui-markdown__h"
				:class="'vui-markdown__h--' + block.level"
				:selectable="selectable"
			>
				<text v-for="(seg, si) in block.segments" :key="si" :class="segClass(seg)">{{ seg.text }}</text>
			</text>

			<!-- 段落 -->
			<text v-else-if="block.type === 'p'" class="vui-markdown__p" :selectable="selectable">
				<text v-for="(seg, si) in block.segments" :key="si" :class="segClass(seg)">{{ seg.text }}</text>
			</text>

			<!-- 引用 -->
			<view v-else-if="block.type === 'quote'" class="vui-markdown__quote">
				<text class="vui-markdown__quote-text" :selectable="selectable">
					<text v-for="(seg, si) in block.segments" :key="si" :class="segClass(seg)">{{ seg.text }}</text>
				</text>
			</view>

			<!-- 列表 -->
			<view v-else-if="block.type === 'list'" class="vui-markdown__list">
				<view v-for="(item, li) in block.items" :key="li" class="vui-markdown__li">
					<text class="vui-markdown__li-marker">{{ block.ordered ? li + 1 + '.' : '•' }}</text>
					<text class="vui-markdown__li-text" :selectable="selectable">
						<text v-for="(seg, si) in item.segments" :key="si" :class="segClass(seg)">{{ seg.text }}</text>
					</text>
				</view>
			</view>

			<!-- 代码块 -->
			<view v-else-if="block.type === 'code'" class="vui-markdown__code">
				<view class="vui-markdown__code-head">
					<text class="vui-markdown__code-lang">{{ block.lang || 'text' }}</text>
					<view v-if="showCopy" class="vui-markdown__code-copy" @click="onCopy(block.text, bi)">
						<text class="vui-markdown__code-copy-text">{{ copiedIndex === bi ? '已复制' : '复制' }}</text>
					</view>
				</view>
				<scroll-view class="vui-markdown__code-body" scroll-y :style="codeStyle">
					<text class="vui-markdown__code-text" selectable>{{ block.text }}</text>
				</scroll-view>
			</view>

			<!-- 分隔线 -->
			<view v-else-if="block.type === 'hr'" class="vui-markdown__hr"></view>
		</view>
	</view>
</template>

<script>
/**
 * 轻量 Markdown 渲染
 * @description 渲染常用 Markdown 语法（标题/段落/列表/引用/代码块/分隔线 + 粗体/斜体/行内代码）。
 * 不使用 v-html，全部通过结构化节点渲染，因此在小程序端同样可用。
 * @property {String} content Markdown 源文本
 * @property {Boolean} selectable 文字是否可选中
 * @property {Boolean} showCopy 代码块是否显示复制按钮
 * @property {String} codeMaxHeight 代码块最大高度
 * @event {Function} copy 代码块复制成功，参数为已复制内容
 */
export default {
	name: 'VuiMarkdown',
	emits: ['copy'],
	props: {
		content: {
			type: String,
			default: ''
		},
		selectable: {
			type: Boolean,
			default: true
		},
		showCopy: {
			type: Boolean,
			default: true
		},
		codeMaxHeight: {
			type: String,
			default: '600rpx'
		}
	},
	data() {
		return {
			copiedIndex: -1,
			timer: null
		};
	},
	computed: {
		blocks() {
			const raw = this.parseBlocks(this.content);
			const out = [];
			for (let i = 0; i < raw.length; i++) {
				const b = raw[i];
				if (b.type === 'p' || b.type === 'quote' || b.type === 'h') {
					out.push({ type: b.type, level: b.level, text: b.text, segments: this.parseInline(b.text) });
				} else if (b.type === 'list') {
					const items = [];
					for (let j = 0; j < b.items.length; j++) {
						items.push({ segments: this.parseInline(b.items[j]) });
					}
					out.push({ type: 'list', ordered: b.ordered, items });
				} else {
					out.push(b);
				}
			}
			return out;
		},
		codeStyle() {
			return this.codeMaxHeight ? 'max-height:' + this.codeMaxHeight + ';' : '';
		}
	},
	beforeUnmount() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	},
	methods: {
		/** 块级解析：把 Markdown 源文本切成块数组 */
		parseBlocks(src) {
			const text = src === null || src === undefined ? '' : String(src);
			const lines = text.replace(/\r\n/g, '\n').split('\n');
			const blocks = [];
			let paragraph = [];
			let i = 0;

			const flush = () => {
				if (paragraph.length) {
					blocks.push({ type: 'p', text: paragraph.join('\n') });
					paragraph = [];
				}
			};

			while (i < lines.length) {
				const line = lines[i];
				let m;

				/* 代码围栏 */
				m = /^\s*```\s*([\w+#.-]*)\s*$/.exec(line);
				if (m) {
					flush();
					const lang = m[1] || '';
					const buf = [];
					i++;
					while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
						buf.push(lines[i]);
						i++;
					}
					i++;
					blocks.push({ type: 'code', lang, text: buf.join('\n') });
					continue;
				}

				/* 标题 */
				m = /^\s*(#{1,6})\s+(.*)$/.exec(line);
				if (m) {
					flush();
					blocks.push({ type: 'h', level: m[1].length, text: m[2] });
					i++;
					continue;
				}

				/* 分隔线 */
				if (/^\s*(?:\*\s*){3,}$/.test(line) || /^\s*(?:-\s*){3,}$/.test(line) || /^\s*(?:_\s*){3,}$/.test(line)) {
					flush();
					blocks.push({ type: 'hr' });
					i++;
					continue;
				}

				/* 引用 */
				if (/^\s*>/.test(line)) {
					flush();
					const buf = [];
					while (i < lines.length && /^\s*>/.test(lines[i])) {
						buf.push(lines[i].replace(/^\s*>\s?/, ''));
						i++;
					}
					blocks.push({ type: 'quote', text: buf.join('\n') });
					continue;
				}

				/* 列表 */
				m = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
				if (m) {
					flush();
					const ordered = /\d/.test(m[1].charAt(0));
					const items = [];
					while (i < lines.length) {
						const lm = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
						if (!lm) break;
						items.push(lm[2]);
						i++;
					}
					blocks.push({ type: 'list', ordered, items });
					continue;
				}

				/* 空行 */
				if (/^\s*$/.test(line)) {
					flush();
					i++;
					continue;
				}

				paragraph.push(line);
				i++;
			}
			flush();
			return blocks;
		},
		/** 行内解析：粗体 / 斜体 / 行内代码 */
		parseInline(text) {
			const segs = [];
			const src = text === null || text === undefined ? '' : String(text);
			const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;
			let last = 0;
			let m;
			while ((m = re.exec(src)) !== null) {
				if (m.index > last) {
					segs.push({ type: 'text', text: src.slice(last, m.index) });
				}
				const token = m[0];
				if (token.indexOf('**') === 0 || token.indexOf('__') === 0) {
					segs.push({ type: 'bold', text: token.slice(2, -2) });
				} else if (token.charAt(0) === '`') {
					segs.push({ type: 'code', text: token.slice(1, -1) });
				} else {
					segs.push({ type: 'italic', text: token.slice(1, -1) });
				}
				last = m.index + token.length;
			}
			if (last < src.length) {
				segs.push({ type: 'text', text: src.slice(last) });
			}
			return segs;
		},
		/** 行内片段对应的样式类 */
		segClass(seg) {
			if (!seg || !seg.type || seg.type === 'text') return '';
			if (seg.type === 'bold') return 'vui-markdown__bold';
			if (seg.type === 'italic') return 'vui-markdown__italic';
			if (seg.type === 'code') return 'vui-markdown__code-inline';
			return '';
		},
		onCopy(text, index) {
			if (!text) return;
			if (typeof uni === 'undefined' || typeof uni.setClipboardData !== 'function') return;
			try {
				uni.setClipboardData({
					data: String(text),
					showToast: false,
					success: () => {
						this.copiedIndex = index;
						this.$emit('copy', text);
						if (this.timer) clearTimeout(this.timer);
						this.timer = setTimeout(() => {
							this.copiedIndex = -1;
							this.timer = null;
						}, 1500);
					}
				});
			} catch (err) {
				/* 复制失败不打断阅读 */
			}
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
.vui-markdown {
	width: 100%;
	box-sizing: border-box;

	&__block {
		display: block;
	}

	&__h {
		display: block;
		margin: 20rpx 0 12rpx;
		font-weight: bold;
		color: $vui-text-color;
		line-height: 1.5;

		&--1 {
			font-size: 40rpx;
		}

		&--2 {
			font-size: 36rpx;
		}

		&--3 {
			font-size: 32rpx;
		}

		&--4,
		&--5,
		&--6 {
			font-size: 28rpx;
		}
	}

	&__p {
		display: block;
		margin: 8rpx 0;
		font-size: 28rpx;
		line-height: 1.7;
		color: $vui-text-color;
		word-break: break-all;
	}

	&__bold {
		font-weight: bold;
		color: $vui-text-color;
	}

	&__italic {
		font-style: italic;
	}

	&__code-inline {
		padding: 2rpx 8rpx;
		border-radius: 6rpx;
		font-family: Consolas, Monaco, Menlo, monospace;
		font-size: 26rpx;
		color: $vui-error;
		background-color: $vui-fill-color;
	}

	&__quote {
		margin: 12rpx 0;
		padding: 12rpx 20rpx;
		border-left: 6rpx solid $vui-border-color;
		background-color: $vui-fill-color-lighter;
	}

	&__quote-text {
		font-size: 26rpx;
		line-height: 1.7;
		color: $vui-text-color-secondary;
	}

	&__list {
		margin: 8rpx 0;
	}

	&__li {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin: 6rpx 0;
	}

	&__li-marker {
		flex-shrink: 0;
		min-width: 32rpx;
		font-size: 28rpx;
		line-height: 1.7;
		color: $vui-text-color-secondary;
	}

	&__li-text {
		flex: 1;
		min-width: 0;
		font-size: 28rpx;
		line-height: 1.7;
		color: $vui-text-color;
		word-break: break-all;
	}

	&__code {
		margin: 16rpx 0;
		overflow: hidden;
		border-radius: 12rpx;
		background-color: $vui-code-bg;
	}

	&__code-head {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 12rpx 20rpx;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	&__code-lang {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.55);
	}

	&__code-copy {
		padding: 4rpx 12rpx;
		border-radius: 20rpx;
		background-color: rgba(255, 255, 255, 0.08);
	}

	&__code-copy-text {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.8);
	}

	&__code-body {
		padding: 20rpx;
	}

	&__code-text {
		font-family: Consolas, Monaco, Menlo, monospace;
		font-size: 24rpx;
		line-height: 1.7;
		color: $vui-code-color;
		white-space: pre-wrap;
		word-break: break-all;
	}

	&__hr {
		height: 1px;
		margin: 20rpx 0;
		background-color: $vui-border-color-light;
	}
}
</style>
