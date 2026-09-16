/**
 * VUI (Virtual UI) 类型声明
 * 由各组件实际的 props 定义自动生成，与源码保持同步。
 */
import type { DefineComponent, Plugin } from 'vue';

/** AutoScroll 自动滚动 */
export interface VuiAutoScrollProps {
	/** 数据列表，通过默认插槽自定义每一项内容 */
	list?: any[];
	/** 容器宽度（CSS 值） */
	width?: string;
	/** 容器高度（CSS 值） */
	height?: string;
	/** 内层 scroll-view 高度（CSS 值） */
	scrollViewHeight?: string;
}

export const VuiAutoScroll: DefineComponent<VuiAutoScrollProps>;

/** Backtop 回到顶部 */
export interface VuiBacktopProps {
	/** 页面滚动距离 */
	scrollTop?: number;
	/** 滚动高度达到该值时显示 */
	visibilityHeight?: number;
	/** 距离右侧位置 */
	right?: string;
	/** 距离底部位置 */
	bottom?: string;
	/** 回到顶部的动画时长 */
	duration?: number;
	/** 按钮文案 */
	text?: string;
}

/** Backtop 回到顶部 事件 */
export interface VuiBacktopEmits {
	/** 点击时触发 */
	click: (...args: any[]) => void;
}

export const VuiBacktop: DefineComponent<VuiBacktopProps>;

/** Button 按钮 */
export interface VuiButtonProps {
	/** 按钮类型 default / primary / success / warning / error */
	type?: string;
}

/** Button 按钮 事件 */
export interface VuiButtonEmits {
	/** 点击按钮时触发 */
	click: (...args: any[]) => void;
}

export const VuiButton: DefineComponent<VuiButtonProps>;

/** Calendar 日历 */
export interface VuiCalendarProps {
	/** 选中日期 YYYY-MM-DD，支持 v-model */
	modelValue?: string;
	/** 每周起始日 0 周日 / 1 周一 */
	startWeek?: any;
	/** 选中颜色 */
	color?: string;
	/** 可选最小日期 YYYY-MM-DD */
	minDate?: string;
	/** 可选最大日期 YYYY-MM-DD */
	maxDate?: string;
}

/** Calendar 日历 事件 */
export interface VuiCalendarEmits {
	/** 选中日期变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiCalendarModelValue = VuiCalendarProps['modelValue'];

export const VuiCalendar: DefineComponent<VuiCalendarProps>;

/** Card 卡片 */
export interface VuiCardProps {
	/** 标题 */
	title?: string;
	/** 头部右侧附加内容 */
	extra?: string;
	/** 是否显示阴影 */
	shadow?: boolean;
	/** 是否显示边框 */
	border?: boolean;
	/** 内容内边距 */
	padding?: string;
	/** 圆角 */
	radius?: string;
}

export const VuiCard: DefineComponent<VuiCardProps>;

/** Carousel 轮播图 */
export interface VuiCarouselProps {
	/** 图片数据，字符串数组或 [{url, title}] */
	list?: any[];
	/** 高度 */
	height?: string;
	/** 是否自动播放 */
	autoplay?: boolean;
	/** 自动切换时间间隔 */
	interval?: number;
	/** 滑动动画时长 */
	duration?: number;
	/** 是否采用衔接滑动 */
	circular?: boolean;
	/** 是否显示指示器 */
	indicator?: boolean;
	/** 指示器类型 dot / number */
	indicatorType?: string;
	/** 图片裁剪模式 */
	mode?: string;
	/** 是否显示图片标题 */
	showTitle?: boolean;
	/** 指示器颜色 */
	indicatorColor?: string;
	/** 当前选中指示器的颜色 */
	indicatorActiveColor?: string;
}

/** Carousel 轮播图 事件 */
export interface VuiCarouselEmits {
	/** 切换时触发 */
	change: (...args: any[]) => void;
	/** 点击图片时触发 */
	click: (...args: any[]) => void;
}

export const VuiCarousel: DefineComponent<VuiCarouselProps>;

/** AI 对话消息气泡 */
export interface VuiChatBubbleProps {
	/** 消息文本内容 */
	content?: string;
	/** 气泡位置 left / right，默认 left */
	placement?: string;
	/** 头像图片地址 */
	avatar?: string;
	/** 名称 */
	name?: string;
	/** 是否显示头像 */
	showAvatar?: boolean;
	/** 消息状态 '' / loading / error */
	status?: string;
	/** 时间文本 */
	time?: string;
	/** 气泡最大宽度 */
	maxWidth?: string;
	/** 气泡背景色 */
	color?: string;
	/** 文字颜色 */
	textColor?: string;
	/** 文字是否可选中 */
	selectable?: boolean;
}

/** AI 对话消息气泡 事件 */
export interface VuiChatBubbleEmits {
	/** 点击气泡时触发 */
	click: (...args: any[]) => void;
	/** 长按气泡时触发 */
	longpress: (...args: any[]) => void;
}

export const VuiChatBubble: DefineComponent<VuiChatBubbleProps>;

/** AI 对话输入框 */
export interface VuiChatInputProps {
	/** 输入内容，支持 v-model */
	modelValue?: string;
	/** 占位文案 */
	placeholder?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 是否处于生成中（显示停止按钮） */
	loading?: boolean;
	/** 是否随内容自适应高度 */
	autoHeight?: boolean;
	/** 最大输入长度 */
	maxlength?: number;
	/** 是否显示字数 */
	showCount?: boolean;
	/** 发送按钮文案 */
	sendText?: string;
	/** 停止按钮文案 */
	stopText?: string;
	/** 是否显示语音入口 */
	showVoice?: boolean;
	/** 键盘右下角按钮类型 */
	confirmType?: string;
}

/** AI 对话输入框 事件 */
export interface VuiChatInputEmits {
	/** :modelValue 输入内容变化 */
	update: (...args: any[]) => void;
	/** 点击发送时触发，参数为当前文本 */
	send: (...args: any[]) => void;
	/** 生成中点击停止时触发 */
	stop: (...args: any[]) => void;
	/** 点击语音入口时触发 */
	voice: (...args: any[]) => void;
	/** 输入框聚焦 */
	focus: (...args: any[]) => void;
	/** 输入框失焦 */
	blur: (...args: any[]) => void;
	/** 内容被清空 */
	clear: (...args: any[]) => void;
}

export type VuiChatInputModelValue = VuiChatInputProps['modelValue'];

export const VuiChatInput: DefineComponent<VuiChatInputProps>;

/** Checkbox 复选框 */
export interface VuiCheckboxProps {
	/** 是否选中，支持 v-model */
	modelValue?: boolean;
	/** 文本内容 */
	label?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 是否为半选状态 */
	indeterminate?: boolean;
	/** 选中颜色 */
	color?: string;
	/** 图标尺寸，数字按 rpx 处理，默认 36 */
	size?: any;
}

/** Checkbox 复选框 事件 */
export interface VuiCheckboxEmits {
	/** 选中状态变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiCheckboxModelValue = VuiCheckboxProps['modelValue'];

export const VuiCheckbox: DefineComponent<VuiCheckboxProps>;

/** 代码块 */
export interface VuiCodeProps {
	/** 代码内容 */
	code?: string;
	/** 语言标识（仅用于展示标签） */
	language?: string;
	/** 标题，不传则显示 language */
	title?: string;
	/** 是否显示行号 */
	showLineNumbers?: boolean;
	/** 是否显示复制按钮 */
	showCopy?: boolean;
	/** 是否自动换行 */
	wrap?: boolean;
	/** 最大高度，超出滚动 */
	maxHeight?: string;
}

/** 代码块 事件 */
export interface VuiCodeEmits {
	/** 点击复制按钮，参数为已复制的内容 */
	copy: (...args: any[]) => void;
}

export const VuiCode: DefineComponent<VuiCodeProps>;

/** Collapse 折叠面板 */
export interface VuiCollapseProps {
	/** 面板数据 [{title, content}] */
	items?: any[];
	/** 展开的面板索引数组，支持 v-model */
	modelValue?: any[];
	/** 是否手风琴模式（同时只展开一个） */
	accordion?: boolean;
	/** 是否显示箭头 */
	arrow?: boolean;
}

/** Collapse 折叠面板 事件 */
export interface VuiCollapseEmits {
	/** 展开状态变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiCollapseModelValue = VuiCollapseProps['modelValue'];

export const VuiCollapse: DefineComponent<VuiCollapseProps>;

/** 一键复制 */
export interface VuiCopyProps {
	/** 需要复制的内容 */
	content?: string;
	/** 按钮显示文案 */
	text?: string;
	/** 是否显示图标 */
	showIcon?: boolean;
	/** 复制成功提示文案 */
	successText?: string;
	/** 提示停留时间 */
	duration?: number;
}

/** 一键复制 事件 */
export interface VuiCopyEmits {
	/** 复制成功，参数为已复制的内容 */
	success: (...args: any[]) => void;
	/** 复制失败，参数为错误对象 */
	error: (...args: any[]) => void;
}

export const VuiCopy: DefineComponent<VuiCopyProps>;

/** CountTo 数字滚动 */
export interface VuiCountToProps {
	/** 起始数值 */
	start?: number;
	/** 目标数值 */
	end?: number;
	/** 动画时长（毫秒），传 0 表示直接显示终值 */
	duration?: number;
	/** 保留小数位数 */
	decimals?: number;
	/** 千分位分隔符，如传 "," 则 1234567 显示为 1,234,567 */
	separator?: string;
	/** 前缀，如 "¥" */
	prefix?: string;
	/** 后缀，如 " USDT" */
	suffix?: string;
	/** 是否挂载后自动开始滚动 */
	autoplay?: boolean;
	/** 缓动函数 linear / easeOutQuad / easeOutCubic */
	easing?: string;
	/** 文字颜色 */
	color?: string;
	/** 字号，数字按 rpx 处理 */
	fontSize?: any;
	/** 是否加粗 */
	bold?: boolean;
}

/** CountTo 数字滚动 事件 */
export interface VuiCountToEmits {
	/** 滚动结束时触发，参数为终值 */
	finish: (...args: any[]) => void;
	/** 点击时触发 */
	click: (...args: any[]) => void;
}

export const VuiCountTo: DefineComponent<VuiCountToProps>;

/** DatePicker 日期选择器 */
export interface VuiDatePickerProps {
	/** 选中日期 YYYY-MM-DD，支持 v-model */
	modelValue?: string;
	/** 可选最小日期 */
	minDate?: string;
	/** 可选最大日期 */
	maxDate?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 高度 */
	height?: string;
}

/** DatePicker 日期选择器 事件 */
export interface VuiDatePickerEmits {
	/** 日期变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiDatePickerModelValue = VuiDatePickerProps['modelValue'];

export const VuiDatePicker: DefineComponent<VuiDatePickerProps>;

/** Drawer 抽屉 */
export interface VuiDrawerProps {
	/** 是否显示，支持 v-model */
	modelValue?: boolean;
	/** 弹出方向 left / right / top / bottom */
	position?: string;
	/** 标题 */
	title?: string;
	/** 宽度（left / right） */
	width?: string;
	/** 高度（top / bottom） */
	height?: string;
	/** 是否显示遮罩 */
	mask?: boolean;
	/** 点击遮罩是否关闭 */
	maskClosable?: boolean;
}

/** Drawer 抽屉 事件 */
export interface VuiDrawerEmits {
	/** 关闭时触发 */
	close: (...args: any[]) => void;
	/** */
	change: (...args: any[]) => void;
}

export type VuiDrawerModelValue = VuiDrawerProps['modelValue'];

export const VuiDrawer: DefineComponent<VuiDrawerProps>;

/** AI 回答评价 */
export interface VuiFeedbackProps {
	/** 当前评价 '' / like / dislike，支持 v-model */
	modelValue?: string;
	/** 赞同文案 */
	likeText?: string;
	/** 不赞同文案 */
	dislikeText?: string;
	/** 是否显示文案 */
	showText?: boolean;
	/** 是否禁用 */
	disabled?: boolean;
}

/** AI 回答评价 事件 */
export interface VuiFeedbackEmits {
	/** :modelValue 评价变化 */
	update: (...args: any[]) => void;
	/** 评价变化时触发，参数为当前值 */
	change: (...args: any[]) => void;
	/** 选中赞同 */
	like: (...args: any[]) => void;
	/** 选中不赞同 */
	dislike: (...args: any[]) => void;
}

export type VuiFeedbackModelValue = VuiFeedbackProps['modelValue'];

export const VuiFeedback: DefineComponent<VuiFeedbackProps>;

/** FormItem 表单项 */
export interface VuiFormItemProps {
	/** 标签文本 */
	label?: string;
	/** 对应 model 中的字段名 */
	prop?: string;
	/** 是否必填（也可由 rules 推导） */
	required?: boolean;
}

export const VuiFormItem: DefineComponent<VuiFormItemProps>;

/** Form 表单 */
export interface VuiFormProps {
	/** 表单数据对象 */
	model?: Record<string, any>;
	/** 表单校验规则 {prop: [{required, message, pattern, min, max, validator, trigger}]} */
	rules?: Record<string, any>;
	/** 标签宽度 */
	labelWidth?: string;
	/** 标签位置 left / top */
	labelPosition?: string;
}

export const VuiForm: DefineComponent<VuiFormProps>;

/** Header 头部标题 */
export interface VuiHeaderProps {
	/** 标题文本 */
	title?: string;
}

export const VuiHeader: DefineComponent<VuiHeaderProps>;

/** Icon 图标 */
export interface VuiIconProps {
	/** 图标名称，如 check / close / arrow-right */
	name?: string;
	/** 自定义字符，优先级高于 name */
	char?: string;
	/** 图标大小，数字按 rpx 处理，默认 32 */
	size?: any;
	/** 图标颜色 */
	color?: string;
	/** 是否旋转 */
	spin?: boolean;
}

/** Icon 图标 事件 */
export interface VuiIconEmits {
	/** 点击图标触发 */
	click: (...args: any[]) => void;
}

export const VuiIcon: DefineComponent<VuiIconProps>;

/** Image 图片 */
export interface VuiImageProps {
	/** 图片地址 */
	src?: string;
	/** 裁剪模式，同 image 组件 */
	mode?: string;
	/** 宽度 */
	width?: string;
	/** 高度 */
	height?: string;
	/** 圆角 */
	radius?: string;
	/** 点击是否预览 */
	preview?: boolean;
	/** 是否懒加载 */
	lazyLoad?: boolean;
	/** 加载中文案 */
	placeholderText?: string;
	/** 加载失败文案 */
	errorText?: string;
	/** 加载失败时展示的图片 */
	fallback?: string;
}

/** Image 图片 事件 */
export interface VuiImageEmits {
	/** 点击图片时触发 */
	click: (...args: any[]) => void;
	/** 图片加载完成时触发 */
	load: (...args: any[]) => void;
	/** 图片加载失败时触发 */
	error: (...args: any[]) => void;
}

export const VuiImage: DefineComponent<VuiImageProps>;

/** Input 输入框 */
export interface VuiInputProps {
	/** 绑定值，支持 v-model */
	modelValue?: any;
	/** 左侧标签文本 */
	label?: string;
	/** 标签宽度 */
	labelWidth?: string;
	/** 占位文案 */
	placeholder?: string;
	/** 输入类型 text / number / idcard / digit */
	type?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 校验规则 [{ required, message, min, max, pattern, type, trigger }] */
	rules?: any[];
	/** 输入框自定义内联样式 */
	inputStyle?: string;
	/** 输入框宽度 */
	width?: string;
}

/** Input 输入框 事件 */
export interface VuiInputEmits {
	/** :modelValue 值变化时触发（v-model） */
	update: (...args: any[]) => void;
	/** 值变化时触发（兼容写法） */
	input: (...args: any[]) => void;
	/** 失焦时触发 */
	blur: (...args: any[]) => void;
	/** 内容确认变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiInputModelValue = VuiInputProps['modelValue'];

export const VuiInput: DefineComponent<VuiInputProps>;

/** Loading 加载 */
export interface VuiLoadingProps {
	/** 是否显示，支持 v-model */
	modelValue?: boolean;
	/** 类型 circle / spinner / dot */
	type?: string;
	/** 尺寸，数字按 rpx 处理，默认 48 */
	size?: any;
	/** 主题色 */
	color?: string;
	/** 加载文案 */
	text?: string;
	/** 是否显示遮罩 */
	mask?: boolean;
	/** 图标与文案是否纵向排列 */
	vertical?: boolean;
}

export type VuiLoadingModelValue = VuiLoadingProps['modelValue'];

export const VuiLoading: DefineComponent<VuiLoadingProps>;

/** 轻量 Markdown 渲染 */
export interface VuiMarkdownProps {
	/** Markdown 源文本 */
	content?: string;
	/** 文字是否可选中 */
	selectable?: boolean;
	/** 代码块是否显示复制按钮 */
	showCopy?: boolean;
	/** 代码块最大高度 */
	codeMaxHeight?: string;
}

/** 轻量 Markdown 渲染 事件 */
export interface VuiMarkdownEmits {
	/** 代码块复制成功，参数为已复制内容 */
	copy: (...args: any[]) => void;
	/** 点击链接，参数为链接地址（组件已同时把地址复制到剪贴板） */
	link: (...args: any[]) => void;
}

export const VuiMarkdown: DefineComponent<VuiMarkdownProps>;

/** Message 消息提示 */
export interface VuiMessageProps {
	/** 是否显示，支持 v-model */
	modelValue?: boolean;
	/** 消息内容 */
	message?: string;
	/** 类型 primary / success / warning / error / info */
	type?: string;
	/** 自动关闭时间，0 表示不自动关闭 */
	duration?: number;
	/** 距离顶部的距离（rpx） */
	offset?: number;
}

/** Message 消息提示 事件 */
export interface VuiMessageEmits {
	/** 关闭时触发 */
	close: (...args: any[]) => void;
}

export type VuiMessageModelValue = VuiMessageProps['modelValue'];

export const VuiMessage: DefineComponent<VuiMessageProps>;

/** Modal 对话框 */
export interface VuiModalProps {
	/** 是否显示，支持 v-model */
	modelValue?: boolean;
	/** 标题 */
	title?: string;
	/** 内容 */
	content?: string;
	/** 是否显示取消按钮 */
	showCancel?: boolean;
	/** 取消按钮文案 */
	cancelText?: string;
	/** 确定按钮文案 */
	confirmText?: string;
	/** 点击遮罩是否关闭 */
	maskClosable?: boolean;
	/** 对话框宽度 */
	width?: string;
	/** */
	color?: string;
}

/** Modal 对话框 事件 */
export interface VuiModalEmits {
	/** 点击确定时触发 */
	confirm: (...args: any[]) => void;
	/** 点击取消时触发 */
	cancel: (...args: any[]) => void;
	/** */
	close: (...args: any[]) => void;
}

export type VuiModalModelValue = VuiModalProps['modelValue'];

export const VuiModal: DefineComponent<VuiModalProps>;

/** 模型选择 */
export interface VuiModelSelectProps {
	/** 选中值，支持 v-model */
	modelValue?: string;
	/** 模型列表 [{ label, value, desc, tag, icon, disabled }] */
	options?: any[];
	/** 弹层标题 */
	title?: string;
	/** 占位文案 */
	placeholder?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 是否可清空 */
	clearable?: boolean;
	/** 是否在触发器上显示当前模型的描述 */
	showDesc?: boolean;
}

/** 模型选择 事件 */
export interface VuiModelSelectEmits {
	/** :modelValue 选中值变化 */
	update: (...args: any[]) => void;
	/** 选中值变化时触发，参数为选中项对象 */
	change: (...args: any[]) => void;
}

export type VuiModelSelectModelValue = VuiModelSelectProps['modelValue'];

export const VuiModelSelect: DefineComponent<VuiModelSelectProps>;

/** Notification 通知 */
export interface VuiNotificationProps {
	/** 是否显示，支持 v-model */
	modelValue?: boolean;
	/** 标题 */
	title?: string;
	/** 内容 */
	message?: string;
	/** 类型 primary / success / warning / error / info */
	type?: string;
	/** 位置 top-right / top-left / bottom-right / bottom-left */
	position?: string;
	/** 自动关闭时间，0 表示不自动关闭 */
	duration?: number;
	/** 是否显示关闭按钮 */
	closable?: boolean;
}

/** Notification 通知 事件 */
export interface VuiNotificationEmits {
	/** 关闭时触发 */
	close: (...args: any[]) => void;
}

export type VuiNotificationModelValue = VuiNotificationProps['modelValue'];

export const VuiNotification: DefineComponent<VuiNotificationProps>;

/** Pagination 分页 */
export interface VuiPaginationProps {
	/** 当前页码，支持 v-model */
	modelValue?: number;
	/** 数据总条数 */
	total?: number;
	/** 每页条数 */
	pageSize?: number;
	/** 中间页码按钮数量 */
	pagerCount?: number;
	/** 是否显示总条数 */
	showTotal?: boolean;
	/** 上一页文本 */
	prevText?: string;
	/** 下一页文本 */
	nextText?: string;
	/** */
	color?: string;
}

/** Pagination 分页 事件 */
export interface VuiPaginationEmits {
	/** 页码变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiPaginationModelValue = VuiPaginationProps['modelValue'];

export const VuiPagination: DefineComponent<VuiPaginationProps>;

/** Popover 弹出框 */
export interface VuiPopoverProps {
	/** 是否显示，支持 v-model */
	modelValue?: boolean;
	/** 弹出框内容 */
	content?: string;
	/** 弹出位置 top / bottom / left / right */
	placement?: string;
	/** 触发方式 click / manual */
	trigger?: string;
	/** 是否显示遮罩 */
	mask?: boolean;
	/** 弹出框宽度 */
	width?: string;
}

/** Popover 弹出框 事件 */
export interface VuiPopoverEmits {
	/** 显示状态变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiPopoverModelValue = VuiPopoverProps['modelValue'];

export const VuiPopover: DefineComponent<VuiPopoverProps>;

/** Progress 进度条 */
export interface VuiProgressProps {
	/** 百分比 0-100 */
	percentage?: number;
	/** 进度条高度，数字按 rpx 处理，默认 12 */
	strokeWidth?: any;
	/** 进度条颜色，优先级高于 status */
	color?: string;
	/** 状态 primary / success / warning / error */
	status?: string;
	/** 是否显示文字 */
	showText?: boolean;
	/** 文字是否内显 */
	textInside?: boolean;
	/** 自定义文字，支持 {value} 占位 */
	format?: string;
}

export const VuiProgress: DefineComponent<VuiProgressProps>;

/** 提示词卡片 */
export interface VuiPromptCardProps {
	/** 是否选中，支持 v-model */
	modelValue?: boolean;
	/** 标题 */
	title?: string;
	/** 提示词内容 */
	content?: string;
	/** 标签数组 */
	tags?: any[];
	/** 图标字符或图片地址 */
	icon?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 是否可选中 */
	selectable?: boolean;
	/** 内容最大行数 */
	maxLines?: number;
}

/** 提示词卡片 事件 */
export interface VuiPromptCardEmits {
	/** 点击卡片时触发 */
	click: (...args: any[]) => void;
	/** :modelValue 选中状态变化 */
	update: (...args: any[]) => void;
	/** 选中状态变化时触发，参数为当前是否选中 */
	change: (...args: any[]) => void;
}

export type VuiPromptCardModelValue = VuiPromptCardProps['modelValue'];

export const VuiPromptCard: DefineComponent<VuiPromptCardProps>;

/** Radio 单选框 */
export interface VuiRadioProps {
	/** 是否选中，支持 v-model */
	modelValue?: boolean;
	/** 文本內容 */
	label?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 选中颜色 */
	color?: string;
	/** 形状 circle / square */
	shape?: string;
	/** 图标尺寸，数字按 rpx 处理，默认 36 */
	size?: any;
}

/** Radio 单选框 事件 */
export interface VuiRadioEmits {
	/** 选中状态变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiRadioModelValue = VuiRadioProps['modelValue'];

export const VuiRadio: DefineComponent<VuiRadioProps>;

/** 城市选择器 */
export interface VuiRegionPickerProps {
	/** = [默认值] */
	value?: any[];
	/** = [1：省|2：省市|3：省市区|4：省市区镇] */
	level?: number;
}

/** 城市选择器 事件 */
export interface VuiRegionPickerEmits {
	/** */
	change: (...args: any[]) => void;
}

export const VuiRegionPicker: DefineComponent<VuiRegionPickerProps>;

/** Scrollbar 滚动条 */
export interface VuiScrollbarProps {
	/** 容器高度（纵向滚动时必填） */
	height?: string;
	/** 是否横向滚动 */
	horizontal?: boolean;
	/** 是否常显滚动条 */
	always?: boolean;
	/** 滚动条厚度 */
	barSize?: string;
	/** 滚动条颜色 */
	color?: string;
}

export const VuiScrollbar: DefineComponent<VuiScrollbarProps>;

/** Select 下拉选择 */
export interface VuiSelectProps {
	/** 选中值，支持 v-model */
	modelValue?: any;
	/** 选项数据 [{label, value, disabled}]，也支持字符串数组 */
	options?: any[];
	/** 占位文案 */
	placeholder?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 是否可清空 */
	clearable?: boolean;
	/** 下拉最大高度 */
	maxHeight?: string;
}

/** Select 下拉选择 事件 */
export interface VuiSelectEmits {
	/** 选中值变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiSelectModelValue = VuiSelectProps['modelValue'];

export const VuiSelect: DefineComponent<VuiSelectProps>;

/** Slider 滑块 */
export interface VuiSliderProps {
	/** 当前值，支持 v-model */
	modelValue?: number;
	/** 最小值 */
	min?: number;
	/** 最大值 */
	max?: number;
	/** 步长 */
	step?: number;
	/** 是否禁用 */
	disabled?: boolean;
	/** 是否显示当前值 */
	showValue?: boolean;
	/** 激活段颜色 */
	color?: string;
	/** 轨道高度，数字按 rpx 处理，默认 8 */
	barHeight?: any;
}

/** Slider 滑块 事件 */
export interface VuiSliderEmits {
	/** 值变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiSliderModelValue = VuiSliderProps['modelValue'];

export const VuiSlider: DefineComponent<VuiSliderProps>;

/** Steps 步骤条 */
export interface VuiStepsProps {
	/** 步骤数据 [{title, desc}] */
	items?: any[];
	/** 当前步骤索引，支持 v-model */
	modelValue?: number;
	/** 方向 horizontal / vertical */
	direction?: string;
	/** 完成态颜色 */
	color?: string;
	/** 圆点尺寸，数字按 rpx 处理，默认 48 */
	size?: any;
}

/** Steps 步骤条 事件 */
export interface VuiStepsEmits {
	/** 点击步骤时触发 */
	change: (...args: any[]) => void;
}

export type VuiStepsModelValue = VuiStepsProps['modelValue'];

export const VuiSteps: DefineComponent<VuiStepsProps>;

/** Switch 开关 */
export interface VuiSwitchProps {
	/** 是否打开，支持 v-model */
	modelValue?: boolean;
	/** 是否禁用 */
	disabled?: boolean;
	/** 打开时的背景色，留空则跟随平台主题 */
	color?: string;
}

/** Switch 开关 事件 */
export interface VuiSwitchEmits {
	/** :modelValue 状态变化时触发（v-model） */
	update: (...args: any[]) => void;
	/** 状态变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiSwitchModelValue = VuiSwitchProps['modelValue'];

export const VuiSwitch: DefineComponent<VuiSwitchProps>;

/** Table 表格 */
export interface VuiTableProps {
	/** 列配置 [{title, key, width, align}] */
	columns?: any[];
	/** 行数据 */
	data?: any[];
	/** 是否显示纵向边框 */
	border?: boolean;
	/** 是否显示斑马纹 */
	stripe?: boolean;
	/** 空数据文案 */
	emptyText?: string;
}

/** Table 表格 事件 */
export interface VuiTableEmits {
	/** 点击行时触发 */
	'row-click': (...args: any[]) => void;
}

export const VuiTable: DefineComponent<VuiTableProps>;

/** Tabs 标签页 */
export interface VuiTabsProps {
	/** 标签数据 ['标签1'] 或 [{title, disabled}] */
	items?: any[];
	/** 当前索引，支持 v-model */
	modelValue?: number;
	/** 样式 line / card */
	type?: string;
	/** 激活颜色 */
	color?: string;
	/** 是否可横向滚动 */
	scrollable?: boolean;
}

/** Tabs 标签页 事件 */
export interface VuiTabsEmits {
	/** 切换标签时触发 */
	change: (...args: any[]) => void;
}

export type VuiTabsModelValue = VuiTabsProps['modelValue'];

export const VuiTabs: DefineComponent<VuiTabsProps>;

/** Tag 标签 */
export interface VuiTagProps {
	/** = [default|primary|success｜warning｜error]  颜色类型 */
	type?: string;
	/** = [default|small|mini] 大小尺寸 */
	size?: string;
	/** = [true|false] 是否为禁用状态 */
	disabled?: any;
	/** = [true|false] 是否无需背景颜色（空心标签） */
	inverted?: any;
	/** = [true|false] 是否为圆角 */
	circle?: any;
	/** */
	mark?: any;
	/** */
	customStyle?: string;
}

/** Tag 标签 事件 */
export interface VuiTagEmits {
	/** 点击 Tag 触发事件 */
	click: (...args: any[]) => void;
}

export const VuiTag: DefineComponent<VuiTagProps>;

/** AI 推理过程展示 */
export interface VuiThinkingProps {
	/** 是否展开，支持 v-model */
	modelValue?: boolean;
	/** 标题文案 */
	title?: string;
	/** 推理正文 */
	content?: string;
	/** 是否仍在推理中 */
	loading?: boolean;
	/** 耗时秒数 */
	duration?: number;
	/** 展开后最大高度 */
	maxHeight?: string;
	/** 初始是否展开 */
	defaultExpand?: boolean;
}

/** AI 推理过程展示 事件 */
export interface VuiThinkingEmits {
	/** :modelValue 展开状态变化 */
	update: (...args: any[]) => void;
	/** 展开状态变化时触发，参数为当前是否展开 */
	toggle: (...args: any[]) => void;
}

export type VuiThinkingModelValue = VuiThinkingProps['modelValue'];

export const VuiThinking: DefineComponent<VuiThinkingProps>;

/** TimePicker 时间选择器 */
export interface VuiTimePickerProps {
	/** 选中时间 HH:mm 或 HH:mm:ss，支持 v-model */
	modelValue?: string;
	/** 是否显示秒 */
	showSeconds?: boolean;
	/** 可选最小时间 HH:mm(:ss) */
	min?: string;
	/** 可选最大时间 HH:mm(:ss) */
	max?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 高度 */
	height?: string;
}

/** TimePicker 时间选择器 事件 */
export interface VuiTimePickerEmits {
	/** 时间变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiTimePickerModelValue = VuiTimePickerProps['modelValue'];

export const VuiTimePicker: DefineComponent<VuiTimePickerProps>;

/** Tooltip 提示 */
export interface VuiTooltipProps {
	/** 提示内容 */
	content?: string;
	/** 提示位置 top / bottom / left / right */
	placement?: string;
	/** 触发方式 click / hover（hover 仅 H5 生效） */
	trigger?: string;
	/** 是否显示，支持 v-model */
	modelValue?: boolean;
}

/** Tooltip 提示 事件 */
export interface VuiTooltipEmits {
	/** 显示状态变化时触发 */
	change: (...args: any[]) => void;
}

export type VuiTooltipModelValue = VuiTooltipProps['modelValue'];

export const VuiTooltip: DefineComponent<VuiTooltipProps>;

/** 打字机流式文本 */
export interface VuiTypingProps {
	/** 完整文本内容 */
	text?: string;
	/** 每个字符的间隔毫秒数 */
	speed?: number;
	/** 挂载后是否自动开始 */
	autoplay?: boolean;
	/** 是否仍处于流式输出中 */
	typing?: boolean;
	/** 是否显示光标 */
	showCursor?: boolean;
	/** 光标字符 */
	cursorChar?: string;
	/** 文字是否可选中 */
	selectable?: boolean;
}

/** 打字机流式文本 事件 */
export interface VuiTypingEmits {
	/** 每输出一个字符时触发，参数为当前已输出文本 */
	change: (...args: any[]) => void;
	/** 全部文本输出完成时触发，参数为完整文本 */
	finish: (...args: any[]) => void;
}

export const VuiTyping: DefineComponent<VuiTypingProps>;

/** Upload 上传 */
export interface VuiUploadProps {
	/** 文件列表 [{url, path, progress}]，支持 v-model */
	modelValue?: any[];
	/** 上传地址，不传则仅选择本地文件 */
	action?: string;
	/** 最大数量 */
	max?: number;
	/** 单次可选择数量 */
	count?: number;
	/** 是否可删除 */
	deletable?: boolean;
	/** 是否可预览 */
	preview?: boolean;
	/** 单文件大小，默认 160rpx */
	size?: string;
	/** 上传时的文件字段名 */
	name?: string;
	/** */
	header?: Record<string, any>;
}

/** Upload 上传 事件 */
export interface VuiUploadEmits {
	/** 文件列表变化时触发 */
	change: (...args: any[]) => void;
	/** 上传成功时触发 */
	success: (...args: any[]) => void;
	/** 上传失败时触发 */
	error: (...args: any[]) => void;
}

export type VuiUploadModelValue = VuiUploadProps['modelValue'];

export const VuiUpload: DefineComponent<VuiUploadProps>;

/** 语音输入 */
export interface VuiVoiceInputProps {
	/** 是否正在录音，支持 v-model */
	modelValue?: boolean;
	/** 是否禁用 */
	disabled?: boolean;
	/** 最长录音秒数 */
	maxDuration?: number;
	/** 按住时的提示文案 */
	tipText?: string;
	/** 松手发送提示 */
	releaseText?: string;
	/** 录音格式 mp3 / aac / wav */
	format?: string;
}

/** 语音输入 事件 */
export interface VuiVoiceInputEmits {
	/** :modelValue 录音状态变化 */
	update: (...args: any[]) => void;
	/** 开始录音 */
	start: (...args: any[]) => void;
	/** 结束录音（非取消） */
	stop: (...args: any[]) => void;
	/** 上滑取消录音 */
	cancel: (...args: any[]) => void;
	/** 录音结束并拿到文件，参数为 { tempFilePath, duration, fileSize } */
	finish: (...args: any[]) => void;
	/** 录音失败或当前环境不支持录音 */
	error: (...args: any[]) => void;
}

export type VuiVoiceInputModelValue = VuiVoiceInputProps['modelValue'];

export const VuiVoiceInput: DefineComponent<VuiVoiceInputProps>;

export declare const components: Record<string, DefineComponent<any>>;
export declare function kebab(str: string): string;
declare const VUI: Plugin;
export default VUI;

declare module 'vue' {
	interface GlobalComponents {
		VuiAutoScroll: typeof VuiAutoScroll;
		'vui-auto-scroll': typeof VuiAutoScroll;
		VuiBacktop: typeof VuiBacktop;
		'vui-backtop': typeof VuiBacktop;
		VuiButton: typeof VuiButton;
		'vui-button': typeof VuiButton;
		VuiCalendar: typeof VuiCalendar;
		'vui-calendar': typeof VuiCalendar;
		VuiCard: typeof VuiCard;
		'vui-card': typeof VuiCard;
		VuiCarousel: typeof VuiCarousel;
		'vui-carousel': typeof VuiCarousel;
		VuiChatBubble: typeof VuiChatBubble;
		'vui-chat-bubble': typeof VuiChatBubble;
		VuiChatInput: typeof VuiChatInput;
		'vui-chat-input': typeof VuiChatInput;
		VuiCheckbox: typeof VuiCheckbox;
		'vui-checkbox': typeof VuiCheckbox;
		VuiCode: typeof VuiCode;
		'vui-code': typeof VuiCode;
		VuiCollapse: typeof VuiCollapse;
		'vui-collapse': typeof VuiCollapse;
		VuiCopy: typeof VuiCopy;
		'vui-copy': typeof VuiCopy;
		VuiCountTo: typeof VuiCountTo;
		'vui-count-to': typeof VuiCountTo;
		VuiDatePicker: typeof VuiDatePicker;
		'vui-date-picker': typeof VuiDatePicker;
		VuiDrawer: typeof VuiDrawer;
		'vui-drawer': typeof VuiDrawer;
		VuiFeedback: typeof VuiFeedback;
		'vui-feedback': typeof VuiFeedback;
		VuiFormItem: typeof VuiFormItem;
		'vui-form-item': typeof VuiFormItem;
		VuiForm: typeof VuiForm;
		'vui-form': typeof VuiForm;
		VuiHeader: typeof VuiHeader;
		'vui-header': typeof VuiHeader;
		VuiIcon: typeof VuiIcon;
		'vui-icon': typeof VuiIcon;
		VuiImage: typeof VuiImage;
		'vui-image': typeof VuiImage;
		VuiInput: typeof VuiInput;
		'vui-input': typeof VuiInput;
		VuiLoading: typeof VuiLoading;
		'vui-loading': typeof VuiLoading;
		VuiMarkdown: typeof VuiMarkdown;
		'vui-markdown': typeof VuiMarkdown;
		VuiMessage: typeof VuiMessage;
		'vui-message': typeof VuiMessage;
		VuiModal: typeof VuiModal;
		'vui-modal': typeof VuiModal;
		VuiModelSelect: typeof VuiModelSelect;
		'vui-model-select': typeof VuiModelSelect;
		VuiNotification: typeof VuiNotification;
		'vui-notification': typeof VuiNotification;
		VuiPagination: typeof VuiPagination;
		'vui-pagination': typeof VuiPagination;
		VuiPopover: typeof VuiPopover;
		'vui-popover': typeof VuiPopover;
		VuiProgress: typeof VuiProgress;
		'vui-progress': typeof VuiProgress;
		VuiPromptCard: typeof VuiPromptCard;
		'vui-prompt-card': typeof VuiPromptCard;
		VuiRadio: typeof VuiRadio;
		'vui-radio': typeof VuiRadio;
		VuiRegionPicker: typeof VuiRegionPicker;
		'vui-region-picker': typeof VuiRegionPicker;
		VuiScrollbar: typeof VuiScrollbar;
		'vui-scrollbar': typeof VuiScrollbar;
		VuiSelect: typeof VuiSelect;
		'vui-select': typeof VuiSelect;
		VuiSlider: typeof VuiSlider;
		'vui-slider': typeof VuiSlider;
		VuiSteps: typeof VuiSteps;
		'vui-steps': typeof VuiSteps;
		VuiSwitch: typeof VuiSwitch;
		'vui-switch': typeof VuiSwitch;
		VuiTable: typeof VuiTable;
		'vui-table': typeof VuiTable;
		VuiTabs: typeof VuiTabs;
		'vui-tabs': typeof VuiTabs;
		VuiTag: typeof VuiTag;
		'vui-tag': typeof VuiTag;
		VuiThinking: typeof VuiThinking;
		'vui-thinking': typeof VuiThinking;
		VuiTimePicker: typeof VuiTimePicker;
		'vui-time-picker': typeof VuiTimePicker;
		VuiTooltip: typeof VuiTooltip;
		'vui-tooltip': typeof VuiTooltip;
		VuiTyping: typeof VuiTyping;
		'vui-typing': typeof VuiTyping;
		VuiUpload: typeof VuiUpload;
		'vui-upload': typeof VuiUpload;
		VuiVoiceInput: typeof VuiVoiceInput;
		'vui-voice-input': typeof VuiVoiceInput;
	}
}
