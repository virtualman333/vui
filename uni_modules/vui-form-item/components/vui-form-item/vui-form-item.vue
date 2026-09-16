<template>
	<view class="vui-form-item" :class="{ 'is-error': error, 'is-required': isRequired }">
		<view class="vui-form-item__label" :style="labelStyle">
			<text class="vui-form-item__label-text">{{ label }}</text>
		</view>
		<view class="vui-form-item__content">
			<slot></slot>
			<text v-if="error" class="vui-form-item__error">{{ error }}</text>
		</view>
	</view>
</template>

<script>
/**
 * FormItem 表单项
 * @description Form 的表单项，承载标签、控件与校验信息
 * @property {String} label 标签文本
 * @property {String} prop 对应 model 中的字段名
 * @property {Boolean} required 是否必填（也可由 rules 推导）
 * @method validate() 校验当前项
 * @method resetField() 重置当前项
 * @method clearValidate() 清空校验信息
 */
export default {
	name: 'VuiFormItem',
	inject: {
		vuiForm: {
			default: null
		}
	},
	props: {
		label: {
			type: String,
			default: ''
		},
		prop: {
			type: String,
			default: ''
		},
		required: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			error: '',
			initialValue: undefined
		};
	},
	computed: {
		isRequired() {
			if (this.required) return true;
			return this.getRules().some((rule) => rule.required === true);
		},
		labelStyle() {
			const width = this.vuiForm ? this.vuiForm.labelWidth : '160rpx';
			return 'width:' + width + ';';
		}
	},
	mounted() {
		this.initialValue = this.getValue();
		if (this.vuiForm) this.vuiForm.addItem(this);
	},
	beforeUnmount() {
		if (this.vuiForm) this.vuiForm.removeItem(this);
	},
	methods: {
		getRules() {
			if (!this.vuiForm || !this.prop) return [];
			const rules = this.vuiForm.rules || {};
			return rules[this.prop] || [];
		},
		getValue() {
			if (!this.vuiForm || !this.prop) return undefined;
			const model = this.vuiForm.model || {};
			return model[this.prop];
		},
		setValue(value) {
			if (this.vuiForm && this.prop) this.vuiForm.model[this.prop] = value;
		},
		isEmpty(value) {
			return value === undefined || value === null || value === '';
		},
		validate(trigger) {
			const rules = this.getRules();
			const value = this.getValue();
			for (let i = 0; i < rules.length; i++) {
				const rule = rules[i];
				if (trigger && trigger !== 'all') {
					const ruleTrigger = rule.trigger || 'blur';
					const matched = Array.isArray(ruleTrigger)
						? ruleTrigger.indexOf(trigger) > -1
						: ruleTrigger === trigger;
					if (!matched) continue;
				}
				let message = '';
				if (rule.required && this.isEmpty(value)) {
					message = rule.message || (this.label || this.prop) + '不能为空';
				}
				if (!message && rule.pattern && !this.isEmpty(value) && !rule.pattern.test(value)) {
					message = rule.message || '格式不正确';
				}
				if (!message && rule.min !== undefined && String(value).length < rule.min) {
					message = rule.message || '长度不足';
				}
				if (!message && rule.max !== undefined && String(value).length > rule.max) {
					message = rule.message || '长度超出';
				}
				if (!message && typeof rule.validator === 'function') {
					const res = rule.validator(rule, value);
					if (res === false) message = rule.message || '校验未通过';
					else if (typeof res === 'string') message = res;
				}
				if (message) {
					this.error = message;
					return Promise.resolve(false);
				}
			}
			this.error = '';
			return Promise.resolve(true);
		},
		resetField() {
			this.error = '';
			this.setValue(this.initialValue);
		},
		clearValidate() {
			this.error = '';
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
.vui-form-item {
	display: flex;
	flex-direction: row;
	padding: 12rpx 0;

	&__label {
		display: flex;
		align-items: center;
		padding-right: 16rpx;
		box-sizing: border-box;
	}

	&__label-text {
		font-size: 28rpx;
		color: $vui-text-color-regular;
	}

	&.is-required &__label-text::before {
		content: '*';
		margin-right: 4rpx;
		color: $vui-error;
	}

	&__content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	&__error {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: $vui-error;
	}
}
</style>
