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
				<text v-for="(seg, si) in block.segments" :key="si" :class="segClass(seg)" @click="onSegTap(seg)">{{ seg.text }}</text>
			</text>

			<!-- 段落 -->
			<text v-else-if="block.type === 'p'" class="vui-markdown__p" :selectable="selectable">
				<text v-for="(seg, si) in block.segments" :key="si" :class="segClass(seg)" @click="onSegTap(seg)">{{ seg.text }}</text>
			</text>

			<!-- 引用 -->
			<view v-else-if="block.type === 'quote'" class="vui-markdown__quote">
				<text class="vui-markdown__quote-text" :selectable="selectable">
					<text v-for="(seg, si) in block.segments" :key="si" :class="segClass(seg)" @click="onSegTap(seg)">{{ seg.text }}</text>
				</text>
			</view>

			<!-- 列表：缩进层级 / 任务框 / 有序编号 -->
			<view v-else-if="block.type === 'list'" class="vui-markdown__list">
				<view
					v-for="(item, li) in block.items"
					:key="li"
					class="vui-markdown__li"
					:style="itemIndent(item)"
				>
					<view
						v-if="item.checked !== null && item.checked !== undefined"
						class="vui-markdown__task"
						:class="{ 'vui-markdown__task--done': item.checked }"
					>
						<text v-if="item.checked" class="vui-markdown__task-tick">✓</text>
					</view>
					<text v-else class="vui-markdown__li-marker">{{ liMarker(block, item, li) }}</text>
					<text class="vui-markdown__li-text" :selectable="selectable">
						<text v-for="(seg, si) in item.segments" :key="si" :class="segClass(seg)" @click="onSegTap(seg)">{{ seg.text }}</text>
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

			<!-- 表格（外层横向滚动：窄屏上宽表不该把整页撑破） -->
			<view v-else-if="block.type === 'table'" class="vui-markdown__table">
				<scroll-view class="vui-markdown__table-scroll" scroll-x>
					<view class="vui-markdown__table-inner">
						<view class="vui-markdown__tr vui-markdown__tr--head">
							<view
								v-for="(cell, ci) in block.header"
								:key="ci"
								class="vui-markdown__th"
								:style="cellStyle(block, ci)"
							>
								<text v-for="(seg, si) in cell.segments" :key="si" :class="segClass(seg)" @click="onSegTap(seg)">{{ seg.text }}</text>
							</view>
						</view>
						<view v-for="(row, ri) in block.rows" :key="ri" class="vui-markdown__tr">
							<view
								v-for="(cell, ci) in row"
								:key="ci"
								class="vui-markdown__td"
								:style="cellStyle(block, ci)"
							>
								<text v-for="(seg, si) in cell.segments" :key="si" :class="segClass(seg)" @click="onSegTap(seg)">{{ seg.text }}</text>
							</view>
						</view>
					</view>
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
 * @description 渲染常用 Markdown 语法（标题/段落/列表/引用/代码块/表格/分隔线 + 粗体/斜体/行内代码/链接）。
 * 列表支持**缩进层级**（2 空格一级，最多 3 级，子层换标记符号）、**任务框**（`- [ ]` / `- [x]`）
 * 与**有序列表的起始编号**，空行分隔的同类列表项视为同一个列表（编号连续，不各起一个）。
 * 不使用 v-html，全部通过结构化节点渲染，因此在小程序端同样可用。
 * @property {String} content Markdown 源文本
 * @property {Boolean} selectable 文字是否可选中
 * @property {Boolean} showCopy 代码块是否显示复制按钮
 * @property {String} codeMaxHeight 代码块最大高度
 * @event {Function} copy 代码块复制成功，参数为已复制内容
 * @event {Function} link 点击链接，参数为链接地址（组件已同时把地址复制到剪贴板）
 */

/**
 * 块级标记的**唯一来源**（模块级常量，主循环与列表续行判定共用同一组正则）。
 *
 * 为什么提到模块级：`parseBlocks` 的主循环里内联着这几个判定，而「列表项的续行该不该接」
 * 需要问**同一批问题**（这行是不是别的块的开始）。在续行那里再抄一份正则，两处就会各自
 * 演化 —— 本仓反复踩过的坑（同一件事写两遍，其中一份没跟上）。
 */
const MD_BLOCK = {
	fence: /^\s*```\s*([\w+#.-]*)\s*$/,
	fenceEnd: /^\s*```\s*$/,
	heading: /^\s*(#{1,6})\s+(.*)$/,
	quote: /^\s*>/,
	hr: /^\s*(?:\*\s*){3,}$|^\s*(?:-\s*){3,}$|^\s*(?:_\s*){3,}$/,
	tableStart: /^\s*\|/,
	blank: /^\s*$/,
	/** 有缩进**且**有内容 —— 列表续行的必要条件（只有空格的行算空行，不算续行） */
	indented: /^[ \t]+\S/
};

/**
 * 「词字符」—— 判断 `_` 是不是**词中间**那个下划线（词中间的下划线不是强调定界符）。
 *
 * 为什么不用 `\w`：CommonMark 判 flanking 看的是「旁边那个字符是不是标点」，
 * 而中文没有词间空格，`中文_变量_名` 里的下划线同样落在「非标点旁边」，一样不是定界符。
 * 所以汉字区段也算词字符（Ext-A / 基本区 / 兼容区三段，够覆盖常用字）。
 */
const WORD_CHAR = /[0-9A-Za-z_\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

export default {
	name: 'VuiMarkdown',
	emits: ['copy', 'link'],
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
						const it = b.items[j];
						items.push({
							segments: this.parseInline(it.text),
							text: it.text,
							level: it.level,
							num: it.num,
							checked: it.checked
						});
					}
					out.push({ type: 'list', ordered: b.ordered, items });
				} else if (b.type === 'table') {
					out.push({
						type: 'table',
						align: b.align,
						header: this.tableCells(b.header),
						rows: b.rows.map((row) => this.tableCells(row))
					});
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
		/**
		 * 列表项识别：`<缩进><标记><空白><内容>` → `{ indent, marker, ordered, num, text }`；
		 * 不是列表项时返回 null。
		 *
		 * 为什么收敛成一个方法：这段正则在「进入列表」「逐项收集」「空行之后还是不是这个列表」
		 * 三处都要跑，抄成三份必然漂移（本仓反复踩过的坑）。只有一份，「什么算列表项」就只有一处定义。
		 */
		listItem(line) {
			const m = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)(.*)$/.exec(line);
			if (!m) return null;
			const ordered = /\d/.test(m[2].charAt(0));
			return {
				indent: m[1],
				marker: m[2],
				ordered,
				num: ordered ? parseInt(m[2], 10) : null,
				text: m[4]
			};
		},
		/** 缩进宽度 → 层级（2 空格一级，tab 记 4 格，最多 3 级 —— 再深就该换组件了） */
		listLevel(indent) {
			let w = 0;
			for (let i = 0; i < indent.length; i++) {
				w += indent.charAt(i) === '\t' ? 4 : 1;
			}
			return Math.min(3, Math.floor(w / 2));
		},
		/** 列表项的缩进（层级靠 padding 表达，不靠标记符号的宽度） */
		itemIndent(item) {
			const lv = item && item.level ? item.level : 0;
			return lv ? 'padding-left:' + lv * 32 + 'rpx;' : '';
		},
		/** 列表项前面的标记：有序用数字，无序按层级换符号（子层一眼看得出从属关系） */
		liMarker(block, item, li) {
			if (block && block.ordered) {
				const n = item && item.num ? item.num : li + 1;
				return n + '.';
			}
			const lv = item && item.level ? item.level : 0;
			return lv === 0 ? '•' : lv === 1 ? '◦' : '▪';
		},
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
				m = MD_BLOCK.fence.exec(line);
				if (m) {
					flush();
					const lang = m[1] || '';
					const buf = [];
					i++;
					while (i < lines.length && !MD_BLOCK.fenceEnd.test(lines[i])) {
						buf.push(lines[i]);
						i++;
					}
					i++;
					blocks.push({ type: 'code', lang, text: buf.join('\n') });
					continue;
				}

				/* 表格：表头行 + 分隔行（| --- | :--: |）。两者必须紧邻，否则当普通段落 */
				if (i + 1 < lines.length) {
					const align = this.tableAlign(line, lines[i + 1]);
					if (align) {
						flush();
						const header = this.splitTableRow(line);
						i += 2;
						const rows = [];
						while (i < lines.length) {
							const cells = this.splitTableRow(lines[i]);
							if (!cells) break;
							rows.push(this.fitTableRow(cells, header.length));
							i++;
						}
						blocks.push({ type: 'table', align, header: this.fitTableRow(header, align.length), rows });
						continue;
					}
				}

				/* 标题 */
				m = MD_BLOCK.heading.exec(line);
				if (m) {
					flush();
					blocks.push({ type: 'h', level: m[1].length, text: m[2] });
					i++;
					continue;
				}

				/* 分隔线 */
				if (MD_BLOCK.hr.test(line)) {
					flush();
					blocks.push({ type: 'hr' });
					i++;
					continue;
				}

				/* 引用 */
				if (MD_BLOCK.quote.test(line)) {
					flush();
					const buf = [];
					while (i < lines.length && MD_BLOCK.quote.test(lines[i])) {
						buf.push(lines[i].replace(/^\s*>\s?/, ''));
						i++;
					}
					blocks.push({ type: 'quote', text: buf.join('\n') });
					continue;
				}

				/* 列表（支持缩进层级、任务框、空行分隔的松散列表） */
				m = this.listItem(line);
				if (m) {
					flush();
					const ordered = m.ordered;
					const items = [];
					/* 每个层级各记一个计数器：有序列表的数字在层级之间不该互相干扰 */
					const counters = [];
					while (i < lines.length) {
						const lm = this.listItem(lines[i]);
						if (!lm) {
							/* 松散列表：空行之后仍跟**同类型**的列表项，属同一个列表
							   （CommonMark 里空行只让列表变松散，不另起一个列表）。
							   否则 `1. 甲` 空行 `2. 乙` 会被拆成两个列表、各自从 1 开始编号。 */
							const nx = i + 1 < lines.length ? this.listItem(lines[i + 1]) : null;
							if (MD_BLOCK.blank.test(lines[i]) && nx && nx.ordered === ordered) {
								i++;
								continue;
							}
							break;
						}
						const level = this.listLevel(lm.indent);
						let text = lm.text;
						let checked = null;
						/* 任务框：`- [ ] 待办` / `- [x] 已完成` —— 把原文那对括号直接吐给用户是这类
						   语料下最常见的难看之处（模型输出的待办清单几乎都长这样） */
						const tk = /^\[([ xX])\][ \t]+(.*)$/.exec(text);
						if (tk) {
							checked = tk[1] !== ' ';
							text = tk[2];
						}
						let num = null;
						if (ordered) {
							num = lm.num === null ? (counters[level] || 0) + 1 : lm.num;
							counters[level] = num;
						}
						/* ── 列表项的**续行** ──────────────────────────────────────────────
						   紧跟在列表项后面、有缩进、又不是任何块级起点（也不是空行）的行，属于
						   这一项的正文 —— 模型把一条长要点折行、或给某一步补一段说明，是这类语料里
						   最常见的写法之一：

						       - 第一步先装依赖，装完再执行下面那条命令，
						         注意别在 root 下跑
						       - 第二步……

						   此前这类行会**把列表拦腰截断**：续行掉到列表外面变成一个独立段落
						   （还带着源文件里的缩进空格），后面的项另起一个列表 —— 层级、编号、
						   归属全散。这里把它接回上一项。
						   - 用 `\n` 连接而不是空格：与段落一致（`paragraph.join('\n')`），
						     且中文句子中间插一个空格比换行更难看；
						   - **顶格**的非列表行不接（那多半是作者有意另起的话，宁可少接不可乱接）；
						   - 缩进的块级起点（围栏 / 标题 / 分隔线 / 引用 / 表格行）不接 ——
						     那属于「列表项里的嵌套块」，本组件不做半吊子支持。 */
						let j = i + 1;
						const cont = [];
						while (j < lines.length) {
							const nx = lines[j];
							if (MD_BLOCK.blank.test(nx) || this.listItem(nx)) break;
							if (!MD_BLOCK.indented.test(nx)) break;
							if (
								MD_BLOCK.fence.test(nx) ||
								MD_BLOCK.heading.test(nx) ||
								MD_BLOCK.hr.test(nx) ||
								MD_BLOCK.quote.test(nx) ||
								MD_BLOCK.tableStart.test(nx)
							) {
								break;
							}
							cont.push(nx.trim());
							j++;
						}
						if (cont.length) {
							text += '\n' + cont.join('\n');
						}
						items.push({ text, level, num, checked });
						/* j 已经指向「下一项」或「第一个不是续行的行」；没有续行时 j === i + 1 */
						i = j;
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
		/**
		 * 行内解析：行内代码 / 链接 / 图片 / 粗体 / 斜体 / 粗斜体
		 *
		 * 五个容易踩的点：
		 *  ① **一次扫描，不逐轮 replace**。分轮替换会让前一轮产出的文本被后一轮再解析一遍，
		 *     典型后果是「代码里的 `[a](b)` 变成链接」「链接文字里的 `*` 变成斜体」。
		 *     这里用一条正则按出现位置切，**行内代码排在首位**，于是 `` `[a](b)` `` 只会是代码。
		 *  ② **`![...]` 必须排在 `[...]` 前面**：否则图片会被从 `[` 处切成普通链接，
		 *     前面的 `!` 变成一段孤零零的文本。
		 *  ③ **加粗里的链接要再走一遍**：`**[文档](url)**` 是模型输出的常客，而单遍扫描
		 *     不会回头解析 `**...**` 里面 —— 那就等于把原文 `[文档](url)` 直接给用户看。
		 *     所以命中外层强调 token 时，若内部还含行内语法，就递归一次并给片段打上修饰标记。
		 *  ④ **三重定界符要单独有一条备选**（`***` / `___` 与 `**` / `__` 并列）。
		 *     `***重点***` 是模型输出的常客，而它此前既匹配不上 `\*\*[^*]+\*\*`
		 *     （第二个字符就是 `*`，`[^*]+` 直接失败），也匹配不上 `\*[^*\n]+\*`；
		 *     正则于是**从第二个字符起**才匹配上 `**重点**`，多出来的那个 `*`
		 *     作为普通文本吐给用户 —— 实际渲染成 `*重点*`。两种写法（`***` / `___`）都会漏。
		 *     ⚠ 真正起作用的是「这条备选**存在**」，**不是备选之间的顺序**：三重那条要求
		 *     紧跟三个 `*`、双写那条要求第三个字符不是 `*`，两者在任一位置上互斥，
		 *     换序实测结果完全一致（第一版注释写成「顺序颠倒就退回旧行为」，已被注入实测推翻）。
		 *  ⑤ **认出来的定界符还要过 `delimiterOk` 这一关**：`3 * 4 * 5` 与
		 *     `user_name_count` 里的符号根本不是强调定界符，正则认出来了也不算数 —— 见该方法。
		 *  ⑥ **删除线 `~~x~~` 与强调共用同一套两侧判据**：`~~ 说明 ~~` 不成立（原文照收），
		 *     并且两端必须是一整对波浪号 —— `~~~~作废~~~~` 原样保留，不会留下两个孤零零的 `~`。
		 */
		/**
		 * 这一对定界符**算不算**强调 —— 判据是它两侧长什么样，不是「出现了几个相同符号」。
		 *
		 * 两条规则各自对应一类模型输出里天天出现的写法，而这两类此前都被**改坏了**：
		 *
		 *   ① **紧邻空白时不成立**：`计算 3 * 4 * 5 的结果` 是乘法。此前 `\*[^*\n]+\*` 会把
		 *      `* 4 *` 整个吃成斜体，用户看到的是「计算 3  4  5 的结果」—— 两个星号消失、
		 *      中间那个数字还变成了斜体。`** 说明 **` 这类带空格的强调标记同理。
		 *   ② **`_` 出现在词中间时不成立**（CommonMark 的 intraword 规则）：
		 *      `变量 user_name_count 与 my_var 在这里` 此前渲染成
		 *      `变量 usernamecount 与 my_var 在这里` —— 两个下划线被吃掉、单词被切成三段斜体；
		 *      `:white_check_mark:` 变成 `:whitecheckmark:`。**标识符是模型讲代码、讲数据库
		 *      字段、讲变量名时最常出现的词形**，而这类损坏一个字都不会报错。
		 *
		 * 返回 false 时调用方把整个 token 当**普通文本**收下（内容一个字都不改），只是不再
		 * 赋予它强调语义 —— 这正是 CommonMark 对待「不能成立的定界符」的方式（原文照旧）。
		 */
		delimiterOk(src, index, token) {
			const open = /^(\*+|_+|~+)/.exec(token);
			if (!open) return true; // 行内代码 / 链接，不归这条判据管
			const ch = token.charAt(0);
			/* 两端符号必须同族才谈得上「一对定界符」；不同族说明这条备选不是我们想的那种，
			   放行交给下游分支去判（宁可放行也不要在这里静默吃掉一个 token）。 */
			if (token.charAt(token.length - 1) !== ch) return true;
			const run = open[1].length;
			const inner = token.slice(run, token.length - run);
			if (!inner.length) return false;
			/* ① 开定界符后面、闭定界符前面不许紧邻空白 */
			if (/^\s/.test(inner) || /\s$/.test(inner)) return false;
			/* ② `_` 不许出现在词中间（外侧紧邻词字符即视为词中间） */
			if (ch === '_') {
				const before = index > 0 ? src.charAt(index - 1) : '';
				const after = index + token.length < src.length ? src.charAt(index + token.length) : '';
				if (WORD_CHAR.test(before) || WORD_CHAR.test(after)) return false;
			}
			/* ③ 删除线的两端必须是一整对波浪号：`~~~~作废~~~~` 里那四个是同一个符号串，
			   而正则只能从第二个 `~` 起匹配到中间那两个 —— 若不拦，用户会在两侧各看到
			   一个孤零零的 `~`（`~作废~` 那样的残渣）。前后紧邻还有 `~` 就说明这不是一对，
			   原文照收。注意这一条**不能**写成「run 必须等于 2」：正则会匹配出的 token
			   永远以 `~~` 开头，那是条走不到的死判据。 */
			if (ch === '~') {
				const before = index > 0 ? src.charAt(index - 1) : '';
				const after = index + token.length < src.length ? src.charAt(index + token.length) : '';
				if (before === '~' || after === '~') return false;
			}
			return true;
		},
		parseInline(text) {
			const segs = [];
			const src = text === null || text === undefined ? '' : String(text);
			/* ⚠ 这条正则的每条备选都是**一个「行内形态」**，而 `scripts/check-markdown.js`
			   的 INLINE_FORMS 是它的登记表：两边必须一一对应（少一条、多一条都红），
			   每条登记形态还配一个探针断言真渲染出声明的片段与样式类。
			   加新形态时**同时**改这两处 —— 否则用户会看到源码原文而没人报错。 */
			const re = /(`[^`]+`|!\[[^\]]*\]\([^)\s]+\)|\[[^\]]*\]\([^)\s]+\)|~~[^~\n]+~~|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
			let last = 0;
			let m;
			while ((m = re.exec(src)) !== null) {
				if (m.index > last) {
					segs.push({ type: 'text', text: src.slice(last, m.index) });
				}
				const token = m[0];
				const link = this.parseLinkToken(token);
				if (link) {
					segs.push(link);
				} else if (token.charAt(0) !== '`' && !this.delimiterOk(src, m.index, token)) {
					/* 定界符不成立 → 原文照收（内容一个字都不改），只是不当强调 —— 见 delimiterOk */
					segs.push({ type: 'text', text: token });
				} else if (token.indexOf('***') === 0 || token.indexOf('___') === 0) {
					/* 三重定界符 = 加粗 + 斜体。分支排在双写之前只是可读性上的写法，
					   没有语义依赖：`***x***` 即便落到双写分支，`slice(2,-2)` 拿到的是
					   `*x*`，递归后仍是「斜体 + 加粗标记」两层修饰，结果一致（实测过）。 */
					segs.push.apply(segs, this.emphasize(token.slice(3, -3), ['bold', 'italic']));
				} else if (token.indexOf('**') === 0 || token.indexOf('__') === 0) {
					segs.push.apply(segs, this.emphasize(token.slice(2, -2), 'bold'));
				} else if (token.charAt(0) === '`') {
					segs.push({ type: 'code', text: token.slice(1, -1) });
				} else if (token.indexOf('~~') === 0) {
					/* 删除线（GFM 的 `~~x~~`）。模型改口、标注作废项时常用；
					   此前这两个波浪号会**原样显示给用户**。 */
					segs.push.apply(segs, this.emphasize(token.slice(2, -2), 'strike'));
				} else {
					segs.push.apply(segs, this.emphasize(token.slice(1, -1), 'italic'));
				}
				last = m.index + token.length;
			}
			if (last < src.length) {
				segs.push({ type: 'text', text: src.slice(last) });
			}
			/* 相邻的普通 text 片段合并 —— 定界符判据不成立时我们把整个 token 原样收下，
			   于是会出现「前置文本 + token + 后置文本」三段首尾相接的文本片段
			   （`变量 user` / `_name_` / `count 与 my_var 在这里`）。渲染结果一样，
			   但在小程序端每一段都是一个节点，白白多两层嵌套。
			   只合并**没有修饰标记**的片段：带 bold / italic 标记的那种是强调里展开出来的
			   （见 emphasize），把后面的普通文本并进去会让它平白继承修饰。 */
			const plain = (s) => s && s.type === 'text' && !s.bold && !s.italic;
			const out = [];
			for (let k = 0; k < segs.length; k++) {
				const prev = out[out.length - 1];
				if (plain(segs[k]) && plain(prev)) prev.text += segs[k].text;
				else out.push(segs[k]);
			}
			return out;
		},
		/**
		 * `[文本](地址)` / `![替代文本](图片地址)` → link 片段；不是链接时返回 null。
		 *
		 * 图片**不内联渲染**，而是渲染成「替代文本」（缺省「图片」）并挂上图片地址：
		 * 远程图片在小程序端要域名白名单、在 App 端要额外配置，静默加载失败比干脆不显示更难查。
		 * 点击行为与普通链接一致（复制地址），宿主可用 `@link` 事件自行接管。
		 *
		 * 已知取舍：地址里含 `)` 时会在此处断句（`[a](x(y))` 只认到 `x(y`）——
		 * 这是行内写法本身的歧义，不猜。
		 */
		parseLinkToken(token) {
			const src = token === null || token === undefined ? '' : String(token);
			if (src.charAt(0) !== '[' && src.indexOf('![') !== 0) return null;
			const m = /^(!?)\[([^\]]*)\]\(([^)\s]+)\)$/.exec(src);
			if (!m) return null;
			const image = m[1] === '!';
			const text = m[2] || (image ? '图片' : m[3]);
			return { type: 'link', text, url: m[3], image };
		},
		/**
		 * 给一段强调文本产片段：里面没有别的行内语法时保持原来的单片段形态
		 * （`**重点**` 仍是 `{type:'bold'}`），含链接等才展开并打上 `bold` / `italic` 标记。
		 *
		 * `kind` 可以是单个修饰名，也可以是数组（三重定界符 = 加粗 + 斜体）。
		 * 单修饰仍走「单片段 + 专属 type」那条快路径（模板按 type 上样式类）；
		 * 多修饰时统一走「保留内部片段类型、另打 bold / italic 标记」那条，
		 * 于是 `*****` 内的链接 / 行内代码也照样能带上两层修饰（见 segClass）。
		 */
		emphasize(inner, kind) {
			const flags = Array.isArray(kind) ? kind : [kind];
			const nested = this.parseInline(inner);
			if (nested.length === 1 && nested[0].type === 'text' && flags.length === 1) {
				return [{ type: flags[0], text: inner }];
			}
			const flag = {};
			flags.forEach((k) => {
				flag[k] = true;
			});
			return nested.map((s) => Object.assign({}, s, flag));
		},
		/**
		 * 行内片段对应的样式类（类型 + 强调修饰标记）
		 *
		 * ⚠ 每个分支的类名必须**在样式块里真有定义**：`scripts/check-markdown.js` 的
		 * INLINE_FORMS 登记表会逐条核对「登记形态 → 片段类型 → 样式类 → 编译后的 CSS」，
		 * 少了任何一环都算「解析出来了但用户看不出差别」。
		 */
		segClass(seg) {
			if (!seg || !seg.type) return '';
			const cls = [];
			if (seg.type === 'bold') cls.push('vui-markdown__bold');
			else if (seg.type === 'italic') cls.push('vui-markdown__italic');
			else if (seg.type === 'code') cls.push('vui-markdown__code-inline');
			else if (seg.type === 'link') cls.push('vui-markdown__link');
			else if (seg.type === 'strike') cls.push('vui-markdown__strike');
			// 强调里的链接：类型是 link，但有 bold / italic 标记（见 emphasize()）
			if (seg.bold) cls.push('vui-markdown__bold');
			if (seg.italic) cls.push('vui-markdown__italic');
			if (seg.strike) cls.push('vui-markdown__strike');
			return cls.join(' ');
		},
		/** 片段点击：只有链接片段有行为，其余原样返回（模板里每个片段都挂这一个入口） */
		onSegTap(seg) {
			if (!seg || seg.type !== 'link' || !seg.url) return;
			this.$emit('link', seg.url);
			if (typeof uni === 'undefined' || typeof uni.setClipboardData !== 'function') return;
			try {
				uni.setClipboardData({
					data: String(seg.url),
					showToast: false,
					success: () => {
						// 链接没有像代码块那样的「已复制」按钮可以变字，所以必须给一次反馈，
						// 否则用户点了一下什么都没发生（复制本身是静默的）。
						if (typeof uni.showToast === 'function') {
							uni.showToast({ title: '链接已复制', icon: 'none' });
						}
					}
				});
			} catch (err) {
				/* 复制失败不打断阅读 */
			}
		},
		/**
		 * 表格行 → 单元格文本数组；不是表格行时返回 null。
		 *
		 * 刻意**要求以 `|` 开头**：普通文本里的单个竖线（`A | B`）不该被当成表格，
		 * 而模型输出的表格几乎都带首尾竖线。尾竖线可省（`| a | b` 也认）。
		 * `\|` 是转义，不当分隔符。
		 */
		splitTableRow(line) {
			const src = line === null || line === undefined ? '' : String(line);
			const trimmed = src.replace(/^\s+|\s+$/g, '');
			if (trimmed.charAt(0) !== '|') return null;
			if (trimmed.indexOf('|', 1) === -1) return null;
			let body = trimmed.replace(/^\|/, '');
			if (body.charAt(body.length - 1) === '|' && body.charAt(body.length - 2) !== '\\') {
				body = body.slice(0, -1);
			}
			const cells = [];
			let cur = '';
			for (let k = 0; k < body.length; k++) {
				const ch = body.charAt(k);
				if (ch === '\\' && body.charAt(k + 1) === '|') {
					cur += '|';
					k++;
					continue;
				}
				if (ch === '|') {
					cells.push(cur.replace(/^\s+|\s+$/g, ''));
					cur = '';
					continue;
				}
				cur += ch;
			}
			cells.push(cur.replace(/^\s+|\s+$/g, ''));
			return cells;
		},
		/** 单元格补齐 / 截断到 n 列，避免列数不齐时整张表错位 */
		fitTableRow(cells, n) {
			const out = [];
			const src = cells || [];
			for (let k = 0; k < n; k++) {
				out.push(k < src.length ? src[k] : '');
			}
			return out;
		},
		/**
		 * 「表头 + 分隔行」→ 对齐数组（left / center / right）；不是表格时返回 null。
		 * 列数以**表头**为准（用户看到的就是这一行），分隔行多出的列忽略、缺少的按左对齐。
		 */
		tableAlign(headerLine, sepLine) {
			const header = this.splitTableRow(headerLine);
			if (!header || !header.length) return null;
			const sep = this.splitTableRow(sepLine);
			if (!sep || !sep.length) return null;
			const align = [];
			for (let k = 0; k < sep.length; k++) {
				const cell = sep[k];
				if (!/^:?-+:?$/.test(cell)) return null;
				const left = cell.charAt(0) === ':';
				const right = cell.charAt(cell.length - 1) === ':';
				align.push(left && right ? 'center' : right ? 'right' : 'left');
			}
			const out = [];
			for (let k = 0; k < header.length; k++) {
				out.push(align[k] || 'left');
			}
			return out;
		},
		/** 单元格走与段落同一套行内解析（粗体 / 斜体 / 行内代码） */
		tableCells(texts) {
			const out = [];
			const src = texts || [];
			for (let k = 0; k < src.length; k++) {
				out.push({ text: src[k], segments: this.parseInline(src[k]) });
			}
			return out;
		},
		/** 单元格对齐方式（分隔行里的 `:--` / `:-:` / `--:`）；左对齐不写 inline style */
		cellStyle(block, ci) {
			const align = (block && block.align) || [];
			const v = align[ci];
			return v && v !== 'left' ? 'text-align:' + v + ';' : '';
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

	/* 删除线：`~~作废~~`。用 text-decoration 而不是虚线边框 —— 删除线的语义就是「划掉」，
	   而它在小程序 / App / H5 三端对嵌套 <text> 的支持是一致的（链接那处刻意没用
	   text-decoration 是另一回事：那里要的是「看起来能点」，各端差异会误导用户）。 */
	&__strike {
		text-decoration: line-through;
	}

	&__code-inline {
		padding: 2rpx 8rpx;
		border-radius: 6rpx;
		font-family: Consolas, Monaco, Menlo, monospace;
		font-size: 26rpx;
		color: $vui-error;
		background-color: $vui-fill-color;
	}

	/* 链接：只靠颜色区分。刻意不加 text-decoration —— 小程序端对嵌套 <text> 的
	   下划线支持不一致，会出现「有的端有、有的端没有」的差异，比不加更难查。 */
	&__link {
		color: $vui-primary;
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

	/* 任务框：与 li-marker 同宽同高，保证勾选框与文字左边缘对齐 */
	&__task {
		flex-shrink: 0;
		box-sizing: border-box;
		width: 26rpx;
		height: 26rpx;
		margin: 11rpx 6rpx 0 0;
		border: 1px solid $vui-border-color;
		border-radius: 6rpx;
		/* 未勾选：保持空框即可（不写颜色，跟着主题走） */
		background-color: $vui-bg-color;

		&--done {
			border-color: $vui-primary;
			background-color: $vui-primary;
		}
	}

	&__task-tick {
		display: block;
		font-size: 20rpx;
		line-height: 24rpx;
		text-align: center;
		color: $vui-text-color-inverse;
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

	/* 表格：外层 scroll-x 承担超宽，内层表格按内容撑开（inlne-flex 才能比容器宽） */
	&__table {
		margin: 16rpx 0;
	}

	&__table-scroll {
		width: 100%;
	}

	&__table-inner {
		display: inline-flex;
		flex-direction: column;
		min-width: 100%;
		border: 1px solid $vui-border-color-light;
		border-radius: 8rpx;
		overflow: hidden;
	}

	&__tr {
		display: flex;
		flex-direction: row;
		border-bottom: 1px solid $vui-border-color-light;

		&:last-child {
			border-bottom: 0;
		}
	}

	&__tr--head {
		background-color: $vui-fill-color-light;
	}

	&__th,
	&__td {
		flex: 1;
		min-width: 0;
		padding: 12rpx 16rpx;
		font-size: 26rpx;
		line-height: 1.6;
		word-break: break-all;
	}

	&__th {
		font-weight: 600;
		color: $vui-text-color;
	}

	&__td {
		color: $vui-text-color-regular;
	}
}
</style>
