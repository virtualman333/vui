<template>
	<view class="page">
		<view class="hero">
			<text class="hero__title">AI 组件</text>
			<text class="hero__desc">11 个面向大模型对话场景的组件，覆盖「输入 → 流式输出 → 推理展示 → 富文本渲染 → 反馈」完整链路</text>
		</view>

		<!-- 模型选择 + 复制 -->
		<view class="card">
			<text class="card__title">模型选择与复制</text>
			<vui-model-select
				v-model="model"
				:options="models"
				title="选择模型"
				placeholder="请选择模型"
				clearable
				show-desc
				@change="onModelChange"
			/>
			<view class="card__row">
				<vui-copy :content="copyTarget" text="复制当前模型名" @success="onCopied" />
				<text v-if="copiedText" class="card__hint">{{ copiedText }}</text>
			</view>
		</view>

		<!-- 对话演示 -->
		<view class="card">
			<text class="card__title">对话演示（含流式输出与推理过程）</text>

			<view v-if="!messages.length" class="empty">
				<text class="empty__text">点下方按钮发一条消息，看看完整效果</text>
			</view>

			<view v-for="(msg, index) in messages" :key="msg.id" class="chat-item">
				<vui-chat-bubble
					:content="msg.content"
					:placement="msg.role === 'user' ? 'right' : 'left'"
					:name="msg.role === 'user' ? '我' : 'VUI 助手'"
					:status="msg.status === 'loading' ? 'loading' : ''"
				>
					<view v-if="msg.role === 'assistant' && msg.thinking" class="chat-item__thinking">
						<vui-thinking
							v-model="msg.thinkingOpen"
							:content="msg.thinking"
							:loading="msg.status === 'loading' && !msg.content"
							:duration="msg.duration"
						/>
					</view>

					<view v-if="msg.role === 'assistant' && msg.status === 'done'" class="chat-item__feedback">
						<vui-feedback
							v-model="feedback[msg.id]"
							show-text
							like-text="有帮助"
							dislike-text="没帮助"
							@change="onFeedback(msg.id, $event)"
						>
							<vui-copy :content="msg.content" text="复制" />
						</vui-feedback>
					</view>
				</vui-chat-bubble>
			</view>

			<view class="card__row">
				<vui-button type="primary" @click="onSend('介绍一下 VUI 的 AI 组件')">发一条示例消息</vui-button>
				<view class="card__spacer"></view>
				<vui-copy :content="transcript" text="复制全部对话" />
			</view>

			<view class="input-wrap">
				<vui-chat-input
					v-model="input"
					:loading="loading"
					show-count
					:maxlength="500"
					placeholder="输入消息，回车发送"
					@send="onSend"
					@stop="onStop"
				/>
			</view>
		</view>

		<!-- Markdown -->
		<view class="card">
			<text class="card__title">Markdown 渲染</text>
			<text class="card__desc">不用 v-html（小程序不支持），全部走结构化节点，因此全端可用。</text>
			<view class="md-wrap">
				<vui-markdown :content="md" />
			</view>
		</view>

		<!-- 代码块 -->
		<view class="card">
			<text class="card__title">代码块</text>
			<vui-code :code="code" language="javascript" show-line-numbers :max-height="'400rpx'" />
		</view>

		<!-- 提示词卡片 -->
		<view class="card">
			<text class="card__title">提示词卡片</text>
			<view v-for="(item, index) in prompts" :key="index" class="prompt-wrap">
				<vui-prompt-card
					v-model="item.selected"
					:title="item.title"
					:content="item.content"
					:tags="item.tags"
					:icon="item.icon"
					:max-lines="2"
					@change="onPromptChange(index, $event)"
				/>
			</view>
			<text class="card__hint">已选 {{ selectedPromptTitle || '无' }}</text>
		</view>

		<!-- 打字机 -->
		<view class="card">
			<text class="card__title">打字机 / 流式文本</text>
			<text class="card__desc">text 递增时会自动续播，适合直接对接 SSE 流式返回。</text>
			<view class="typing-box">
				<vui-typing :text="typingText" :speed="50" :typing="typingRunning" />
			</view>
			<view class="card__row">
				<vui-button type="primary" @click="startTyping">开始输出</vui-button>
				<vui-button @click="appendTyping">追加一段（模拟流式）</vui-button>
			</view>
		</view>

		<!-- 语音输入 -->
		<view class="card">
			<text class="card__title">语音输入</text>
			<text class="card__desc">
				按住按钮录音，上滑取消。录音依赖平台能力，H5 端通常不可用——此时组件仍会派发事件但不产生音频文件。
			</text>
			<vui-voice-input
				v-model="recording"
				:max-duration="30"
				tip-text="按住说话"
				release-text="松手发送"
				@finish="onVoiceFinish"
				@error="onVoiceError"
			/>
			<text v-if="voiceTip" class="card__hint">{{ voiceTip }}</text>
		</view>

		<view class="footer">
			<text class="footer__text">Virtual UI · AI 组件演示</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			model: 'vui-pro',
			models: [
				{ label: 'VUI Pro', value: 'vui-pro', desc: '综合能力最强，适合复杂推理与长文本', tag: '推荐', icon: '✨' },
				{ label: 'VUI Turbo', value: 'vui-turbo', desc: '响应更快，适合日常对话', tag: '快', icon: '⚡' },
				{ label: 'VUI Mini', value: 'vui-mini', desc: '轻量低成本，适合简单任务', icon: '🍃' },
				{ label: 'VUI Vision', value: 'vui-vision', desc: '支持图片理解', tag: '内测', icon: '👁', disabled: true }
			],
			input: '',
			messages: [],
			feedback: {},
			loading: false,
			seed: 0,
			timer: null,
			copiedText: '',
			selectedPromptTitle: '',
			typingText: '',
			typingRunning: false,
			recording: false,
			voiceTip: '',
			md: [
				'# Markdown 渲染',
				'',
				'支持 **粗体**、*斜体*、***粗斜体***、`行内代码` 与 [链接](https://uniapp.dcloud.net.cn/)（点击复制地址）。',
				'',
				'## 列表',
				'',
				'- 无序项一',
				'- 无序项二',
				'',
				'1. 有序项一',
				'2. 有序项二',
				'',
				'> 引用段落',
				'',
				'| 组件 | 用途 |',
				'| --- | --- |',
				'| vui-markdown | 富文本渲染 |',
				'| vui-code | 代码块 |',
				'',
				'```js',
				'const a = 1;',
				'```',
				'',
				'---'
			].join('\n'),
			code: 'function greet(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(greet("VUI"));',
			prompts: [
				{
					title: '代码审查',
					content: '请审查以下代码，指出潜在 bug、边界条件与可读性问题，并给出修改建议。',
					tags: ['开发', '审查'],
					icon: '🔍',
					selected: false
				},
				{
					title: '长文摘要',
					content: '把下面这篇文章压缩成 5 条要点，每条不超过 30 字，保留关键数字。',
					tags: ['写作', '摘要'],
					icon: '📝',
					selected: false
				},
				{
					title: '数据解读',
					content: '基于给定数据，先用一句话给出结论，再用表格列出支撑论据，最后提示风险。',
					tags: ['分析', '表格'],
					icon: '📊',
					selected: false
				}
			]
		};
	},
	computed: {
		copyTarget() {
			const current = this.models.find((m) => m.value === this.model);
			return current ? current.label : '未选择模型';
		},
		transcript() {
			return this.messages
				.map((m) => (m.role === 'user' ? '我：' : 'VUI 助手：') + m.content)
				.join('\n\n');
		}
	},
	beforeUnmount() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	},
	methods: {
		onModelChange(option) {
			this.copiedText = '';
			if (option) this.voiceTip = '';
		},
		onCopied() {
			this.copiedText = '已复制到剪贴板';
		},
		onFeedback(id, value) {
			this.voiceTip = value ? `消息 ${id} 的评价：${value}` : `消息 ${id} 取消了评价`;
		},
		onPromptChange(index, selected) {
			/* 单选：选中一个时取消其他 */
			if (selected) {
				this.prompts.forEach((item, i) => {
					if (i !== index) item.selected = false;
				});
				this.selectedPromptTitle = this.prompts[index].title;
			} else {
				this.selectedPromptTitle = '';
			}
		},

		/** 发送消息并模拟一次流式回答 */
		onSend(text) {
			const content = (text || '').trim();
			if (!content) {
				this.voiceTip = '内容为空，未发送';
				return;
			}
			if (this.loading) {
				this.voiceTip = '正在生成中，请先停止或等待完成';
				return;
			}
			this.messages.push({
				id: ++this.seed,
				role: 'user',
				content,
				thinking: '',
				thinkingOpen: false,
				status: 'done',
				duration: 0
			});
			this.input = '';
			this.loading = true;

			const index = this.messages.length;
			this.messages.push({
				id: ++this.seed,
				role: 'assistant',
				content: '',
				thinking: '',
				thinkingOpen: true,
				status: 'loading',
				duration: 0
			});

			this.timer = setTimeout(() => this.stream(index), 400);
		},
		/** 逐字填充「推理过程」再填充「回答」，模拟真实流式返回 */
		stream(index) {
			const THINK = '用户在问 VUI 的 AI 组件覆盖什么。我按对话链路来组织回答：先讲消息气泡负责布局，再讲打字机负责流式观感，然后说推理面板用来展示思考过程，最后补 Markdown 渲染与交互反馈。';
			const ANSWER = 'VUI 的 AI 组件覆盖了对话的完整链路：\n\n1. 消息布局 —— vui-chat-bubble 负责气泡与头像；\n2. 输入环节 —— vui-chat-input 支持自适应高度与发送/停止切换；\n3. 流式观感 —— vui-typing 逐字输出，文本递增时自动续播；\n4. 推理展示 —— vui-thinking 可折叠，并显示耗时；\n5. 内容渲染 —— vui-markdown 与 vui-code 负责富文本；\n6. 收尾交互 —— vui-feedback、vui-copy 完成评价与复制。';
			let thinkDone = false;

			const tick = () => {
				const msg = this.messages[index];
				if (!msg) return;

				if (msg.thinking.length < THINK.length) {
					msg.thinking = THINK.slice(0, msg.thinking.length + 1);
					this.timer = setTimeout(tick, 24);
					return;
				}

				if (!thinkDone) {
					thinkDone = true;
					msg.duration = 3;
					msg.thinkingOpen = false;
				}

				if (msg.content.length < ANSWER.length) {
					msg.content = ANSWER.slice(0, msg.content.length + 1);
					this.timer = setTimeout(tick, 22);
					return;
				}

				msg.status = 'done';
				this.loading = false;
				this.timer = null;
			};
			tick();
		},
		onStop() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			const last = this.messages[this.messages.length - 1];
			if (last && last.role === 'assistant') {
				last.status = 'done';
				last.thinkingOpen = false;
			}
			this.loading = false;
		},

		/** 打字机演示 */
		startTyping() {
			this.typingRunning = true;
			this.typingText = '';
			setTimeout(() => {
				this.typingText = '这是第一段流式文本，';
				setTimeout(() => {
					this.typingText += '后面还可以继续追加内容，';
					setTimeout(() => {
						this.typingText += '组件会自动接着往下播。';
						this.typingRunning = false;
					}, 600);
				}, 500);
			}, 100);
		},
		appendTyping() {
			this.typingRunning = true;
			this.typingText += '【新增的一段内容，用来模拟 SSE 分片到达】';
		},

		onVoiceFinish(res) {
			this.voiceTip = res && res.tempFilePath
				? '录音完成：' + res.tempFilePath
				: '录音完成（当前环境未产生音频文件）';
		},
		onVoiceError(err) {
			this.voiceTip = '录音不可用：' + ((err && err.message) || '当前环境不支持');
		}
	}
};
</script>

<style lang="scss" scoped>
/* _____ */
/* 演示页：仅做主题变量兜底，保证脱离项目 uni.scss 也能编译 */
$vui-text-color: #333 !default;
$vui-text-color-secondary: #909399 !default;
$vui-text-color-placeholder: #c0c4cc !default;
$vui-bg-color: #fff !default;
$vui-fill-color-lighter: #fafafa !default;

.page {
	min-height: 100vh;
	padding: 24rpx 24rpx 60rpx;
	background-color: #f5f6f8;
	box-sizing: border-box;
}

.hero {
	padding: 32rpx 24rpx;

	&__title {
		display: block;
		font-size: 44rpx;
		font-weight: bold;
		color: $vui-text-color;
	}

	&__desc {
		display: block;
		margin-top: 12rpx;
		font-size: 26rpx;
		line-height: 1.6;
		color: $vui-text-color-secondary;
	}
}

.card {
	margin-bottom: 24rpx;
	padding: 28rpx 24rpx;
	border-radius: 20rpx;
	background-color: $vui-bg-color;

	&__title {
		display: block;
		margin-bottom: 12rpx;
		font-size: 30rpx;
		font-weight: bold;
		color: $vui-text-color;
	}

	&__desc {
		display: block;
		margin-bottom: 20rpx;
		font-size: 24rpx;
		line-height: 1.6;
		color: $vui-text-color-secondary;
	}

	&__hint {
		margin-left: 16rpx;
		font-size: 24rpx;
		color: $vui-text-color-secondary;
	}

	&__row {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		margin-top: 24rpx;
	}

	&__spacer {
		flex: 1;
	}
}

.empty {
	padding: 40rpx 0;

	&__text {
		font-size: 26rpx;
		color: $vui-text-color-placeholder;
	}
}

.chat-item {
	margin-bottom: 28rpx;

	&__thinking {
		margin-bottom: 8rpx;
	}

	&__feedback {
		margin-top: 16rpx;
	}
}

.input-wrap {
	margin-top: 24rpx;
	overflow: hidden;
	border-radius: 16rpx;
}

.md-wrap {
	margin-top: 16rpx;
	padding: 24rpx;
	border-radius: 16rpx;
	background-color: $vui-fill-color-lighter;
}

.prompt-wrap {
	margin-bottom: 16rpx;
}

.typing-box {
	min-height: 120rpx;
	margin-bottom: 8rpx;
	padding: 24rpx;
	border-radius: 16rpx;
	background-color: $vui-fill-color-lighter;
}

.footer {
	padding: 40rpx 0 20rpx;
	text-align: center;

	&__text {
		font-size: 24rpx;
		color: $vui-text-color-placeholder;
	}
}
</style>
