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
		color: #606266;
	}

	&.is-required &__label-text::before {
		content: '*';
		margin-right: 4rpx;
		color: #e43d33;
	}

	&__content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	&__error {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: #e43d33;
	}
}
</style>
