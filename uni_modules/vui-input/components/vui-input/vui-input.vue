<template>
	<view class="input-container">
		<view class="input-wrapper">
			<text v-if="label" class="input-label" :style="{ width: labelWidth }">{{ label }}</text>
			<input
				:type="type"
				:placeholder="placeholder"
				v-model = "value"
				:value="value"
				@input="onInput"
				@blur="triggerValidation('blur')"
				@change="triggerValidation('change')"
				:style="inputStyle"
				class="custom-input"
				:class="{ error: hasError }"
				:width="width"
			/>
		</view>
		<text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>
	</view>
</template>

<script>
export default {
	name: 'VuiInput',
	model: {
		prop: 'value',
		event: 'input'
	},
	props: {
		label: {
			type: String,
			default: ''
		},
		placeholder: {
			type: String,
			default: '请输入...'
		},
		// defautValue: {
		// 	type: String,
		// 	default: ''
		// },
		type: {
			type: String,
			default: 'text'
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
		},
		labelWidth: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			internalValue: '',
			errorMessage: '',
			hasError: false // 添加错误状态标识
		};
	},
	mounted() {
		this.internalValue = this.value;
		console.log(this.value, 'propsValue');
	},
	watch: {
		value: {
			immediate: true, // 立即执行 :当刷新页面时会立即执行一次handler函数
			handler(val) {
				this.internalValue = val;
				this.validate(); // 监听父组件传递的值进行校验
			}
		}
	},
	methods: {
		onInput(event) {
			this.internalValue = event.detail.value;
			this.$emit('input', this.internalValue);
			console.log(this.internalValue)
			// 触发即时校验
			this.validate();
		},
		triggerValidation(triggerType) {
			this.rules.forEach((rule) => {
				if (Array.isArray(rule.trigger) ? rule.trigger.includes(triggerType) : rule.trigger === triggerType) {
					this.validateRule(rule);
				}
			});
		},
		validateRule(rule) {
			let message = '';
			const value = this.internalValue;

			// 校验 required
			if (rule.required && !value) {
				message = rule.message;
				this.hasError = true; // 有错误
			}

			// 校验长度
			if (rule.min !== undefined || rule.max !== undefined) {
				if (value.length < (rule.min || 0) || value.length > (rule.max || Infinity)) {
					message = rule.message;
					this.hasError = true; // 有错误
				}
			}

			// 校验正则
			if (rule.pattern && !rule.pattern.test(value)) {
				message = rule.message;
				this.hasError = true; // 有错误
			}

			// 校验类型
			if (rule.type && !this.isTypeValid(rule.type)) {
				message = rule.message;
				this.hasError = true; // 有错误
			}
			// 更新错误消息
			this.errorMessage = message;
		},
		isTypeValid(type) {
			switch (type) {
				case 'email':
					const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
					return emailRegex.test(this.internalValue);
				case 'phone':
					const phoneRegex = /^1[3456789]\d{9}$/;
					return phoneRegex.test(this.internalValue);
				default:
					return true;
			}
		},
		validate() {
			this.errorMessage = ''; // 清空错误消息
			this.hasError = false; // 在每次校验时重置错误状态
			this.rules.forEach((rule) => this.validateRule(rule));
		}
	}
};
</script>

<style lang="scss" scoped>
/* ===== VUI 主题变量（兜底定义，可在项目 uni.scss 中覆盖） ===== */
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
/* ===== VUI 主题变量结束 ===== */
.input-container {
	width: 100%;
	margin: 0 0 4px 0;
	display: flex;
	flex-direction: column; /* 修改为垂直排列 */
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
}

.error-message {
	color: $vui-error;
	font-size: 12px;
	margin-top: 4px; /* 错误消息与输入框的间距 */
}

.error {
	border-color: red;
	box-shadow: 0 0 4px red;
}
</style>
