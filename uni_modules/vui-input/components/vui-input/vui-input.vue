<template>
	<view class="input-container">
		<view class="input-wrapper">
			<text v-if="label" class="input-label" :style="{ width: labelWidth }">{{ label }}</text>
			<input
				:type="type"
				:placeholder="placeholder"
				:value="modelValue"
				:disabled="disabled"
				:style="computedInputStyle"
				@input="onInput"
				@blur="onBlur"
				@change="onChange"
				class="custom-input"
				:class="{ error: hasError }"
			/>
		</view>
		<text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>
	</view>
</template>

<script>
/**
 * Input 输入框
 * @description 带校验能力的输入框，支持 Vue3 v-model 双向绑定
 * @property {String|Number} modelValue 绑定值，支持 v-model
 * @property {String} label 左侧标签文本
 * @property {String} labelWidth 标签宽度
 * @property {String} placeholder 占位文案
 * @property {String} type 输入类型 text / number / idcard / digit
 * @property {Boolean} disabled 是否禁用
 * @property {Array} rules 校验规则 [{ required, message, min, max, pattern, type, trigger }]
 * @property {String} inputStyle 输入框自定义内联样式
 * @property {String} width 输入框宽度
 * @event {Function} update:modelValue 值变化时触发（v-model）
 * @event {Function} input 值变化时触发（兼容写法）
 * @event {Function} blur 失焦时触发，参数为当前值
 * @event {Function} change 内容确认变化时触发，参数为当前值
 */
export default {
	name: 'VuiInput',
	emits: ['update:modelValue', 'input', 'blur', 'change'],
	props: {
		modelValue: {
			type: [String, Number],
			default: ''
		},
		label: {
			type: String,
			default: ''
		},
		labelWidth: {
			type: String,
			default: ''
		},
		placeholder: {
			type: String,
			default: '请输入...'
		},
		type: {
			type: String,
			default: 'text'
		},
		disabled: {
			type: Boolean,
			default: false
		},
		rules: {
			type: Array,
			default: () => []
		},
		inputStyle: {
			type: String,
			default: ''
		},
		width: {
			type: String,
			default: '100%'
		}
	},
	data() {
		return {
			errorMessage: '',
			hasError: false
		};
	},
	computed: {
		computedInputStyle() {
			const parts = [];
			if (this.width) parts.push('width:' + this.width);
			if (this.inputStyle) parts.push(this.inputStyle.replace(/;\s*$/, ''));
			return parts.join(';');
		}
	},
	watch: {
		modelValue: {
			immediate: true,
			handler() {
				// 父组件值变化时按 rules 重跑校验
				this.validateWith(this.modelValue);
			}
		}
	},
	methods: {
		onInput(event) {
			const val = event.detail.value;
			this.$emit('update:modelValue', val);
			this.$emit('input', val);
			this.validateWith(val);
		},
		/**
		 * 失焦：**先跑按 trigger 配置的校验，再把事件转发给宿主**。
		 *
		 * 为什么必须转发：这两个事件此前只跑校验、从不 `$emit`，而 `emits` 与 JSDoc
		 * 都声明了它们、文档也写着「失焦时触发」。宿主写 `@blur="onBlur"` 时——
		 * Vue 3 不会把**已声明**的事件透传到 `$attrs`，所以 handler 一次都不会执行，
		 * 而且不报任何错。表单「失焦即校验/提交前确认」这类写法会静默失效。
		 */
		onBlur(event) {
			this.triggerValidation('blur');
			this.$emit('blur', this.inputValueOf(event));
		},
		/** 内容确认变化（uni 端在失焦或点确认时触发）：同样先校验再转发 */
		onChange(event) {
			this.triggerValidation('change');
			this.$emit('change', this.inputValueOf(event));
		},
		/** 取事件里的当前值；事件结构因端而异时退回 `modelValue`（不编造、不写死路径） */
		inputValueOf(event) {
			const v = event && event.detail ? event.detail.value : undefined;
			return v === undefined || v === null ? this.modelValue : v;
		},
		triggerValidation(triggerType) {
			this.rules.forEach((rule) => {
				const triggers = Array.isArray(rule.trigger) ? rule.trigger : [rule.trigger];
				if (triggers.includes(triggerType)) {
					this.validateRuleWith(rule, this.modelValue);
				}
			});
		},
		validateRuleWith(rule, value) {
			let message = '';
			const text = value === undefined || value === null ? '' : String(value);

			if (rule.required && !text) {
				message = rule.message;
				this.hasError = true;
			}

			if (rule.min !== undefined || rule.max !== undefined) {
				if (text.length < (rule.min || 0) || text.length > (rule.max || Infinity)) {
					message = rule.message;
					this.hasError = true;
				}
			}

			if (rule.pattern && !rule.pattern.test(text)) {
				message = rule.message;
				this.hasError = true;
			}

			if (rule.type && !this.isTypeValid(rule.type, text)) {
				message = rule.message;
				this.hasError = true;
			}

			if (message) {
				this.errorMessage = message;
			}
		},
		isTypeValid(type, value) {
			switch (type) {
				case 'email':
					return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
				case 'phone':
					return /^1[3456789]\d{9}$/.test(value);
				default:
					return true;
			}
		},
		validateWith(value) {
			this.errorMessage = '';
			this.hasError = false;
			this.rules.forEach((rule) => this.validateRuleWith(rule, value));
			return !this.hasError;
		},
		/** 供父组件通过 ref 主动触发校验，返回校验是否通过 */
		validate() {
			return this.validateWith(this.modelValue);
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
.input-container {
	width: 100%;
	margin: 0 0 4px 0;
	display: flex;
	flex-direction: column;
}

.input-wrapper {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0;
}

.input-label {
	font-size: 14px;
	margin-right: 6px;
}

.custom-input {
	padding: 4px 10px;
	border: 1px solid $vui-gray-color;
	border-radius: 4px;
	flex: 1;
	box-sizing: border-box;
}

.error-message {
	color: $vui-error;
	font-size: 12px;
	margin-top: 4px;
}

.error {
	border-color: $vui-error;
	box-shadow: 0 0 4px $vui-error;
}
</style>
