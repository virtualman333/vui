<template>
	<view class="vui-voice-input">
		<view
			class="vui-voice-input__btn"
			:class="{ 'vui-voice-input__btn--recording': recording, 'vui-voice-input__btn--disabled': disabled }"
			@touchstart.stop.prevent="onTouchStart"
			@touchmove.stop.prevent="onTouchMove"
			@touchend.stop.prevent="onTouchEnd"
			@touchcancel.stop.prevent="onTouchCancel"
		>
			<text class="vui-voice-input__btn-char">🎤</text>
			<text class="vui-voice-input__btn-text">{{ tipText }}</text>
		</view>

		<view v-if="recording" class="vui-voice-input__overlay">
			<view class="vui-voice-input__panel" :class="{ 'vui-voice-input__panel--cancel': canceling }">
				<view class="vui-voice-input__wave">
					<view v-for="i in 5" :key="i" class="vui-voice-input__bar"></view>
				</view>
				<text class="vui-voice-input__time">{{ seconds }}s / {{ maxDuration }}s</text>
				<text class="vui-voice-input__hint">{{ canceling ? '松手取消' : releaseText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * 语音输入
 * @description 按住说话的语音录制按钮，基于 uni.getRecorderManager 实现，支持上滑取消与最长时长限制。
 * 注意：录音依赖平台能力，H5 端通常不可用，此时组件仍会派发 start/stop 事件但不产生音频文件。
 * @property {Boolean} modelValue 是否正在录音，支持 v-model
 * @property {Boolean} disabled 是否禁用
 * @property {Number} maxDuration 最长录音秒数
 * @property {String} tipText 按住时的提示文案
 * @property {String} releaseText 松手发送提示
 * @property {String} format 录音格式 mp3 / aac / wav
 * @event {Function} update:modelValue 录音状态变化
 * @event {Function} start 开始录音
 * @event {Function} stop 结束录音（非取消）
 * @event {Function} cancel 上滑取消录音
 * @event {Function} finish 录音结束并拿到文件，参数为 { tempFilePath, duration, fileSize }
 * @event {Function} error 录音失败或当前环境不支持录音
 */
export default {
	name: 'VuiVoiceInput',
	emits: ['update:modelValue', 'start', 'stop', 'cancel', 'finish', 'error'],
	props: {
		modelValue: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		},
		maxDuration: {
			type: Number,
			default: 60
		},
		tipText: {
			type: String,
			default: '按住说话'
		},
		releaseText: {
			type: String,
			default: '松手发送'
		},
		format: {
			type: String,
			default: 'mp3'
		}
	},
	data() {
		return {
			recording: false,
			seconds: 0,
			timer: null,
			canceling: false,
			startY: 0
		};
	},
	watch: {
		modelValue(val) {
			if (val && !this.recording) {
				this.begin();
			} else if (!val && this.recording) {
				this.end(false);
			}
		}
	},
	mounted() {
		this.initRecorder();
	},
	beforeUnmount() {
		this.clearTimer();
	},
	methods: {
		/** 初始化录音管理器（部分平台无此 API，需优雅降级） */
		initRecorder() {
			if (typeof uni === 'undefined' || typeof uni.getRecorderManager !== 'function') {
				this.recorder = null;
				return;
			}
			try {
				this.recorder = uni.getRecorderManager();
				this.recorder.onStop((res) => this.handleRecorderStop(res));
				this.recorder.onError((err) => {
					this.clearTimer();
					this.setRecording(false);
					this.$emit('error', err);
				});
			} catch (err) {
				this.recorder = null;
			}
		},
		onTouchStart(e) {
			if (this.disabled) return;
			const touch = e && e.touches && e.touches[0] ? e.touches[0] : null;
			this.startY = touch ? touch.clientY : 0;
			this.canceling = false;
			this.begin();
		},
		onTouchMove(e) {
			if (!this.recording) return;
			const touch = e && e.touches && e.touches[0] ? e.touches[0] : null;
			if (!touch) return;
			this.canceling = this.startY - touch.clientY > 60;
		},
		onTouchEnd() {
			const cancel = this.canceling;
			this.canceling = false;
			if (this.recording) this.end(cancel);
		},
		onTouchCancel() {
			this.canceling = false;
			if (this.recording) this.end(true);
		},
		/** 开始录音 */
		begin() {
			if (this.disabled || this.recording) return;
			this.setRecording(true);
			this.seconds = 0;
			this.$emit('start');
			this.startTimer();
			if (this.recorder && typeof this.recorder.start === 'function') {
				try {
					this.recorder.start({
						duration: this.maxSeconds * 1000,
						format: this.format
					});
				} catch (err) {
					this.$emit('error', err);
				}
			} else if (!this.warned) {
				/* 只提示一次，避免每次按压都刷错误 */
				this.warned = true;
				this.$emit('error', new Error('vui-voice-input: 当前环境不支持录音（uni.getRecorderManager 不可用）'));
			}
		},
		/** 结束录音，cancel 为 true 表示上滑取消 */
		end(cancel) {
			this.clearTimer();
			const wasRecording = this.recording;
			this.setRecording(false);
			if (this.recorder && typeof this.recorder.stop === 'function') {
				this.pendingCancel = !!cancel;
				try {
					this.recorder.stop();
				} catch (err) {
					this.$emit('error', err);
				}
			}
			if (!wasRecording) return;
			if (cancel) this.$emit('cancel');
			else this.$emit('stop');
		},
		/** 录音管理器回调 */
		handleRecorderStop(res) {
			if (this.pendingCancel) {
				this.pendingCancel = false;
				return;
			}
			this.$emit('finish', res || {});
		},
		/** 同步录音状态与 v-model */
		setRecording(val) {
			if (this.recording === val) return;
			this.recording = val;
			this.$emit('update:modelValue', val);
		},
		startTimer() {
			this.clearTimer();
			this.timer = setInterval(() => {
				this.seconds += 1;
				if (this.seconds >= this.maxSeconds) this.end(false);
			}, 1000);
		},
		clearTimer() {
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
		}
	},
	computed: {
		maxSeconds() {
			return this.maxDuration > 0 ? this.maxDuration : 60;
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
.vui-voice-input {
	display: inline-flex;

	&__btn {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		height: 88rpx;
		padding: 0 32rpx;
		border-radius: 44rpx;
		border: 1px solid $vui-border-color;
		background-color: $vui-bg-color;

		&--recording {
			border-color: $vui-primary;
			background-color: $vui-active-bg-color;
		}

		&--disabled {
			opacity: 0.5;
		}
	}

	&__btn-char {
		font-size: 32rpx;
		line-height: 1;
	}

	&__btn-text {
		margin-left: 12rpx;
		font-size: 28rpx;
		color: $vui-text-color;
	}

	&__overlay {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 999;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 320rpx;
		padding: 40rpx 48rpx;
		border-radius: 24rpx;
		background-color: rgba(0, 0, 0, 0.82);

		&--cancel {
			background-color: rgba($vui-error, 0.9);
		}
	}

	&__wave {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 60rpx;
	}

	&__bar {
		width: 10rpx;
		height: 20rpx;
		margin: 0 6rpx;
		border-radius: 6rpx;
		background-color: $vui-text-color-inverse;
		animation: vui-voice-wave 0.9s infinite ease-in-out;

		&:nth-child(2) {
			animation-delay: 0.15s;
		}

		&:nth-child(3) {
			animation-delay: 0.3s;
		}

		&:nth-child(4) {
			animation-delay: 0.45s;
		}

		&:nth-child(5) {
			animation-delay: 0.6s;
		}
	}

	&__time {
		margin-top: 20rpx;
		font-size: 26rpx;
		color: $vui-text-color-inverse;
	}

	&__hint {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.7);
	}
}

@keyframes vui-voice-wave {
	0%,
	100% {
		height: 20rpx;
	}
	50% {
		height: 56rpx;
	}
}
</style>
