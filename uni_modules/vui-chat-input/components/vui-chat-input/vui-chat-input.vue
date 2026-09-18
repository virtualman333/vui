<template>
	<view class="vui-chat-input" :class="{ 'vui-chat-input--disabled': disabled }">
		<view class="vui-chat-input__field">
			<textarea
				v-if="autoHeight"
				class="vui-chat-input__textarea"
				:value="innerValue"
				:placeholder="placeholder"
				:placeholder-class="'vui-chat-input__placeholder'"
				:disabled="disabled"
				:maxlength="maxlength"
				:auto-height="true"
				:confirm-type="confirmType"
				:show-confirm-bar="false"
				:adjust-position="true"
				:disable-default-padding="true"
				@input="onInput"
				@focus="onFocus"
				@blur="onBlur"
				@confirm="onConfirm"
			/>
			<input
				v-else
				class="vui-chat-input__inner"
				:value="innerValue"
				:placeholder="placeholder"
				:placeholder-class="'vui-chat-input__placeholder'"
				:disabled="disabled"
				:maxlength="maxlength"
				:confirm-type="confirmType"
				@input="onInput"
				@focus="onFocus"
				@blur="onBlur"
				@confirm="onConfirm"
			/>
			<text v-if="showCount && maxlength > 0" class="vui-chat-input__count">{{ length }}/{{ maxlength }}</text>
		</view>

		<view v-if="showVoice" class="vui-chat-input__action vui-chat-input__action--voice" @click="onVoice">
			<text class="vui-chat-input__voice-char">🎤</text>
		</view>

		<view class="vui-chat-input__action" :class="actionClass" @click="onAction">
			<!-- 生成中：方块 + stopText 文案。stopText 传空串时只留方块（老样子） -->
			<view v-if="loading" class="vui-chat-input__stop"></view>
			<text v-if="loading && stopText" class="vui-chat-input__stop-text">{{ stopText }}</text>
			<text v-else-if="!loading" class="vui-chat-input__send-text">{{ sendText }}</text>
		</view>
	</view>
</template>

<script>
/**
 * AI 对话输入框
 * @description 适配 AI 对话场景的输入框，支持多行自适应、发送/停止切换、字数统计与语音入口
 * @property {String} modelValue 输入内容，支持 v-model
 * @property {String} placeholder 占位文案
 * @property {Boolean} disabled 是否禁用
 * @property {Boolean} loading 是否处于生成中（显示停止按钮）
 * @property {Boolean} autoHeight 是否随内容自适应高度
 * @property {Number} maxlength 最大输入长度
 * @property {Boolean} showCount 是否显示字数
 * @property {String} sendText 发送按钮文案
 * @property {String} stopText 停止按钮文案
 * @property {Boolean} showVoice 是否显示语音入口
 * @property {String} confirmType 键盘右下角按钮类型
 * @event {Function} update:modelValue 输入内容变化
 * @event {Function} send 点击发送时触发，参数为当前文本
 * @event {Function} stop 生成中点击停止时触发
 * @event {Function} voice 点击语音入口时触发
 * @event {Function} focus 输入框聚焦
 * @event {Function} blur 输入框失焦
 * @event {Function} clear 内容被清空
 */
export default {
	name: 'VuiChatInput',
	emits: ['update:modelValue', 'send', 'stop', 'voice', 'focus', 'blur', 'clear'],
	props: {
		modelValue: {
			type: String,
			default: ''
		},
		placeholder: {
			type: String,
			default: '输入消息，Enter 发送'
		},
		disabled: {
			type: Boolean,
			default: false
		},
		loading: {
			type: Boolean,
			default: false
		},
		autoHeight: {
			type: Boolean,
			default: true
		},
		maxlength: {
			type: Number,
			default: -1
		},
		showCount: {
			type: Boolean,
			default: false
		},
		sendText: {
			type: String,
			default: '发送'
		},
		stopText: {
			type: String,
			default: '停止'
		},
		showVoice: {
			type: Boolean,
			default: false
		},
		confirmType: {
			type: String,
			default: 'send'
		}
	},
	data() {
		return {
			innerValue: this.modelValue
		};
	},
	computed: {
		length() {
			return this.innerValue ? this.innerValue.length : 0;
		},
		canSend() {
			return !this.disabled && !!(this.innerValue || '').trim();
		},
		actionClass() {
			if (this.loading) return 'vui-chat-input__action--stop';
			return this.canSend ? 'vui-chat-input__action--active' : 'vui-chat-input__action--idle';
		}
	},
	watch: {
		modelValue(val) {
			if (val !== this.innerValue) {
				this.innerValue = val == null ? '' : val;
			}
		}
	},
	methods: {
		onInput(e) {
			const val = e && e.detail ? e.detail.value : '';
			this.innerValue = val;
			this.$emit('update:modelValue', val);
			if (!val) this.$emit('clear');
		},
		onAction() {
			if (this.loading) {
				this.$emit('stop');
				return;
			}
			if (!this.canSend) return;
			this.$emit('send', this.innerValue);
		},
		onVoice() {
			if (this.disabled) return;
			this.$emit('voice');
		},
		onConfirm() {
			if (this.loading || !this.canSend) return;
			this.$emit('send', this.innerValue);
		},
		onFocus(e) {
			this.$emit('focus', e);
		},
		onBlur(e) {
			this.$emit('blur', e);
		},
		/** 清空输入内容并同步 v-model */
		clear() {
			this.innerValue = '';
			this.$emit('update:modelValue', '');
			this.$emit('clear');
		},
		/** 聚焦输入框 */
		focus() {
			return this.innerValue;
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
.vui-chat-input {
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	padding: 16rpx 24rpx;
	background-color: $vui-bg-color;
	border-top: 1px solid $vui-border-color-light;
	box-sizing: border-box;

	&--disabled {
		opacity: 0.6;
	}

	&__field {
		position: relative;
		flex: 1;
		min-width: 0;
		padding: 14rpx 24rpx;
		border-radius: 20rpx;
		background-color: $vui-fill-color-light;
	}

	&__inner {
		width: 100%;
		height: 44rpx;
		font-size: 28rpx;
		line-height: 44rpx;
		color: $vui-text-color;
	}

	&__textarea {
		width: 100%;
		max-height: 240rpx;
		font-size: 28rpx;
		line-height: 44rpx;
		color: $vui-text-color;
	}

	&__placeholder {
		font-size: 28rpx;
		color: $vui-text-color-placeholder;
	}

	&__count {
		position: absolute;
		right: 16rpx;
		bottom: 6rpx;
		font-size: 20rpx;
		color: $vui-text-color-placeholder;
	}

	&__action {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 112rpx;
		height: 72rpx;
		margin-left: 16rpx;
		padding: 0 24rpx;
		border-radius: 36rpx;
		box-sizing: border-box;

		&--voice {
			min-width: 72rpx;
			width: 72rpx;
			padding: 0;
			margin-left: 16rpx;
			background-color: $vui-fill-color-light;
		}

		&--idle {
			background-color: $vui-fill-color;
		}

		&--active {
			background-color: $vui-primary;
		}

		&--stop {
			background-color: $vui-error;
		}
	}

	&__send-text {
		font-size: 28rpx;
		color: $vui-text-color-inverse;
	}

	/* 停止按钮文案：与方块同排（__action 是 flex 居中），方块右侧留 8rpx */
	&__stop-text {
		margin-left: 8rpx;
		font-size: 28rpx;
		color: $vui-text-color-inverse;
	}

	&__voice-char {
		font-size: 32rpx;
		line-height: 1;
	}

	&__stop {
		width: 24rpx;
		height: 24rpx;
		border-radius: 4rpx;
		background-color: $vui-text-color-inverse;
	}
}
</style>
