<template>
	<view>
		<picker mode="multiSelector" @columnchange="OnColumnchange" :value="sel" range-key="name" :range="lists"
			@change="onChange">
			<input class="vui-region-input" :disabled="true" :value="displayText" />
		</picker>
	</view>
</template>
<script>
	import city from './data/city.json'
	import province from './data/province.json'
	import county from './data/county.json'
	import town from './data/town.json'

	// 各层的下级表：第 0 层是省（数组），第 1~3 层都是「按父级 id 索引的字典」
	// 写成行注释而非块注释：AGENTS.md §4 要求脚本里第一块 JSDoc 就是组件描述。
	// （别把 JSDoc 起止符的字面量写进注释 —— 生成器与 check:rules 都用正则找第一块，
	//   它们认不出"这是散文里的例子"，会把这段注释当成组件描述。）
	const CHILD_TABLES = [null, city, county, town]

	/**
	 * 城市选择器
	 * @description 用于选择中国城市地区 组件
	 * @tutorial https://github.com/virtualman333/vui
	 * @property {Number} level = [1 / 2 / 3 / 4] 生效层级：1 省，2 省市，3 省市区，4 省市区镇（越界与非法值按 3）
	 * @property {Array} value = [省下标, 市下标, 区下标, 镇下标] 各列初始选中的下标（缺项与越界一律按 0，不会报错）
	 * @event {Function} change 选完一列并确认时触发，参数为 picker 的 change 事件对象
	 * @event {Function} columnchange 滚动某一列时触发，参数为当前各列选中下标数组
	 * @event {Function} update:value 选中项变化时触发，参数为当前各列选中下标数组（不用 v-model 也能拿到）
	 */
	export default {
		name: 'vuiRegionPicker',
		emits: ['change', 'columnchange', 'update:value'],
		props: {
			value: {
				type: Array,
				default: [0, 0, 0, 0]
			},
			level: {
				type: Number,
				default: 3,
			}
		},
		data() {
			return {
				/** 当前各列的可选项 */
				lists: [],
				/** 各列当前选中的下标（**本地**状态，不再就地改写宿主传进来的数组） */
				sel: []
			};
		},

		computed: {
			/** 生效层级：只认 1~4，其余（含字符串、越界、NaN）一律退回默认 3 */
			levelInt() {
				const n = parseInt(this.level, 10);
				return n >= 1 && n <= 4 ? n : 3;
			},
			/** 选中的名字拼成一行 —— 旧实现在模板里按 level 各写一遍（三处），收敛到这里 */
			displayText() {
				return this.sel
					.slice(0, this.levelInt)
					.map((i, col) => {
						const row = (this.lists[col] || [])[i];
						return row ? row.name : '';
					})
					.filter(Boolean)
					.join('-');
			}
		},
		created() {
			this.getData();
		},
		mounted() {

		},
		methods: {
			/** 第 depth 层在 parentId 下的下级列表；取不到一律给空数组，绝不返回 undefined */
			childList(depth, parentId) {
				if (depth === 0) return Array.isArray(province) ? province.slice() : [];
				const table = CHILD_TABLES[depth];
				const rows = table ? table[parentId] : null;
				return Array.isArray(rows) ? rows.slice() : [];
			},
			/** 下标收敛：缺失 / 非数 / 负数 / 越界 / 小数 → 合法下标（越界退 0，不 deref undefined） */
			clampIndex(rows, want) {
				const n = Number(want);
				return rows.length && Number.isFinite(n) && n >= 0 && n < rows.length ? Math.trunc(n) : 0;
			},
			/**
			 * 重建每一列。
			 *
			 * `kept` 是「本轮之前已经选定的下标」（列滚动时用）；不给就用宿主的 `value`。
			 * 旧实现在这里对 `undefined` 取 `.id`：宿主传 `[2]`（只想指定省）、传 `[]`、
			 * 或下标越界（`[99,0,0]`）时会**在 created 里直接抛 TypeError**（整页白屏，
			 * 报错还挂在组件的生命周期栈上）；`level=4` 时更是整块 switch 没有 case，
			 * `lists` 停在 `[[],[],[]]` —— picker 三列全空，而文档承诺了「4：省市区镇」。
			 */
			getData(kept) {
				const n = this.levelInt;
				const source = kept || this.value || [];
				const lists = [];
				const sel = [];
				let parentId = null;
				for (let col = 0; col < n; col += 1) {
					const rows = this.childList(col, parentId);
					lists.push(rows);
					const idx = this.clampIndex(rows, source[col]);
					sel.push(idx);
					parentId = rows.length ? rows[idx].id : null;
				}
				this.lists = lists;
				this.sel = sel;
			},
			OnColumnchange(e) {
				const col = Number(e && e.detail && e.detail.column);
				const idx = Number(e && e.detail && e.detail.value);
				if (!(col >= 0) || !(idx >= 0)) return;
				const kept = this.sel.slice();
				kept[col] = idx;
				// 本列之后的下级列回到第一项：换了省，原来的市/区已经不属于它了
				for (let c = col + 1; c < kept.length; c += 1) kept[c] = 0;
				this.getData(kept);
				this.$emit('columnchange', this.sel.slice());
				this.$emit('update:value', this.sel.slice());
			},
			onChange(e) {
				this.$emit('update:value', this.sel.slice());
				this.$emit('change', e);
			}
		}
	};
</script>
<style lang="scss">
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
	.vui-region-input {
		outline-style: none;
		border: 1px solid $vui-text-color-placeholder;
		border-radius: 5px;
		width: 100%;
		height: 100%;
		padding: 0;
		padding: 10px 15px;
		box-sizing: border-box;
		font-family: "Microsoft soft";
		font-size: 13px;

		&:focus {
			border-color: $vui-region-active-color;
			outline: 0;
			-webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
				$vui-region-active-color;
			box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
				$vui-region-active-color;
		}
	}
</style>