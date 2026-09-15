<template>
	<view class="vui-form" :class="'vui-form--label-' + labelPosition">
		<slot></slot>
	</view>
</template>

<script>
/**
 * Form 表单
 * @description 由输入框、选择器、单选框等控件组成，用以收集、校验、提交数据
 * @property {Object} model 表单数据对象
 * @property {Object} rules 表单校验规则 {prop: [{required, message, pattern, min, max, validator, trigger}]}
 * @property {String} labelWidth 标签宽度
 * @property {String} labelPosition 标签位置 left / top
 * @method validate() 整体校验，返回 Promise<boolean>
 * @method validateField(props) 校验指定字段
 * @method resetFields() 重置表单
 * @method clearValidate() 清空校验结果
 */
export default {
	name: 'VuiForm',
	props: {
		model: {
			type: Object,
			default: () => ({})
		},
		rules: {
			type: Object,
			default: () => ({})
		},
		labelWidth: {
			type: String,
			default: '160rpx'
		},
		labelPosition: {
			type: String,
			default: 'left'
		}
	},
	data() {
		return {
			items: []
		};
	},
	provide() {
		return {
			vuiForm: this
		};
	},
	methods: {
		addItem(item) {
			if (item) this.items.push(item);
		},
		removeItem(item) {
			const index = this.items.indexOf(item);
			if (index > -1) this.items.splice(index, 1);
		},
		validate() {
			if (this.items.length === 0) return Promise.resolve(true);
			return Promise.all(this.items.map((item) => item.validate('all'))).then((results) => {
				return results.every((valid) => valid === true);
			});
		},
		validateField(props) {
			const targets = Array.isArray(props) ? props : [props];
			const items = this.items.filter((item) => targets.indexOf(item.prop) > -1);
			if (items.length === 0) return Promise.resolve(true);
			return Promise.all(items.map((item) => item.validate('all'))).then((results) => {
				return results.every((valid) => valid === true);
			});
		},
		resetFields() {
			this.items.forEach((item) => item.resetField());
		},
		clearValidate() {
			this.items.forEach((item) => item.clearValidate());
		}
	}
};
</script>

<style lang="scss" scoped>
.vui-form {
	width: 100%;
}
</style>
