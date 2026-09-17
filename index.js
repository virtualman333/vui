/**
 * VUI (Virtual UI) - 基于 uni-app 的 Vue3 组件库
 *
 * 用法一（推荐）：配合 easycom 自动按需引入，无需 import，见 README
 * 用法二：全量注册
 *   import VUI from 'vui-uniapp'
 *   app.use(VUI)
 */

import VuiAutoScroll from './uni_modules/vui-auto-scroll/components/vui-auto-scroll/vui-auto-scroll.vue'
import VuiBacktop from './uni_modules/vui-backtop/components/vui-backtop/vui-backtop.vue'
import VuiButton from './uni_modules/vui-button/components/vui-button/vui-button.vue'
import VuiCalendar from './uni_modules/vui-calendar/components/vui-calendar/vui-calendar.vue'
import VuiCard from './uni_modules/vui-card/components/vui-card/vui-card.vue'
import VuiCarousel from './uni_modules/vui-carousel/components/vui-carousel/vui-carousel.vue'
import VuiChatBubble from './uni_modules/vui-chat-bubble/components/vui-chat-bubble/vui-chat-bubble.vue'
import VuiChatInput from './uni_modules/vui-chat-input/components/vui-chat-input/vui-chat-input.vue'
import VuiCheckbox from './uni_modules/vui-checkbox/components/vui-checkbox/vui-checkbox.vue'
import VuiCode from './uni_modules/vui-code/components/vui-code/vui-code.vue'
import VuiCollapse from './uni_modules/vui-collapse/components/vui-collapse/vui-collapse.vue'
import VuiCopy from './uni_modules/vui-copy/components/vui-copy/vui-copy.vue'
import VuiCountTo from './uni_modules/vui-count-to/components/vui-count-to/vui-count-to.vue'
import VuiDatePicker from './uni_modules/vui-date-picker/components/vui-date-picker/vui-date-picker.vue'
import VuiDrawer from './uni_modules/vui-drawer/components/vui-drawer/vui-drawer.vue'
import VuiFeedback from './uni_modules/vui-feedback/components/vui-feedback/vui-feedback.vue'
import VuiFormItem from './uni_modules/vui-form-item/components/vui-form-item/vui-form-item.vue'
import VuiForm from './uni_modules/vui-form/components/vui-form/vui-form.vue'
import VuiHeader from './uni_modules/vui-header/components/vui-header/vui-header.vue'
import VuiIcon from './uni_modules/vui-icon/components/vui-icon/vui-icon.vue'
import VuiImage from './uni_modules/vui-image/components/vui-image/vui-image.vue'
import VuiInput from './uni_modules/vui-input/components/vui-input/vui-input.vue'
import VuiLoading from './uni_modules/vui-loading/components/vui-loading/vui-loading.vue'
import VuiMarkdown from './uni_modules/vui-markdown/components/vui-markdown/vui-markdown.vue'
import VuiMessage from './uni_modules/vui-message/components/vui-message/vui-message.vue'
import VuiModal from './uni_modules/vui-modal/components/vui-modal/vui-modal.vue'
import VuiModelSelect from './uni_modules/vui-model-select/components/vui-model-select/vui-model-select.vue'
import VuiNotification from './uni_modules/vui-notification/components/vui-notification/vui-notification.vue'
import VuiPagination from './uni_modules/vui-pagination/components/vui-pagination/vui-pagination.vue'
import VuiPopover from './uni_modules/vui-popover/components/vui-popover/vui-popover.vue'
import VuiProgress from './uni_modules/vui-progress/components/vui-progress/vui-progress.vue'
import VuiPromptCard from './uni_modules/vui-prompt-card/components/vui-prompt-card/vui-prompt-card.vue'
import VuiRadio from './uni_modules/vui-radio/components/vui-radio/vui-radio.vue'
import VuiRegionPicker from './uni_modules/vui-region-picker/components/vui-region-picker/vui-region-picker.vue'
import VuiScrollbar from './uni_modules/vui-scrollbar/components/vui-scrollbar/vui-scrollbar.vue'
import VuiSelect from './uni_modules/vui-select/components/vui-select/vui-select.vue'
import VuiSlider from './uni_modules/vui-slider/components/vui-slider/vui-slider.vue'
import VuiSourceList from './uni_modules/vui-source-list/components/vui-source-list/vui-source-list.vue'
import VuiSteps from './uni_modules/vui-steps/components/vui-steps/vui-steps.vue'
import VuiSwitch from './uni_modules/vui-switch/components/vui-switch/vui-switch.vue'
import VuiTable from './uni_modules/vui-table/components/vui-table/vui-table.vue'
import VuiTabs from './uni_modules/vui-tabs/components/vui-tabs/vui-tabs.vue'
import VuiTag from './uni_modules/vui-tag/components/vui-tag/vui-tag.vue'
import VuiThinking from './uni_modules/vui-thinking/components/vui-thinking/vui-thinking.vue'
import VuiTimePicker from './uni_modules/vui-time-picker/components/vui-time-picker/vui-time-picker.vue'
import VuiTooltip from './uni_modules/vui-tooltip/components/vui-tooltip/vui-tooltip.vue'
import VuiTyping from './uni_modules/vui-typing/components/vui-typing/vui-typing.vue'
import VuiUpload from './uni_modules/vui-upload/components/vui-upload/vui-upload.vue'
import VuiVoiceInput from './uni_modules/vui-voice-input/components/vui-voice-input/vui-voice-input.vue'

const components = {
	VuiAutoScroll,
	VuiBacktop,
	VuiButton,
	VuiCalendar,
	VuiCard,
	VuiCarousel,
	VuiChatBubble,
	VuiChatInput,
	VuiCheckbox,
	VuiCode,
	VuiCollapse,
	VuiCopy,
	VuiCountTo,
	VuiDatePicker,
	VuiDrawer,
	VuiFeedback,
	VuiFormItem,
	VuiForm,
	VuiHeader,
	VuiIcon,
	VuiImage,
	VuiInput,
	VuiLoading,
	VuiMarkdown,
	VuiMessage,
	VuiModal,
	VuiModelSelect,
	VuiNotification,
	VuiPagination,
	VuiPopover,
	VuiProgress,
	VuiPromptCard,
	VuiRadio,
	VuiRegionPicker,
	VuiScrollbar,
	VuiSelect,
	VuiSlider,
	VuiSourceList,
	VuiSteps,
	VuiSwitch,
	VuiTable,
	VuiTabs,
	VuiTag,
	VuiThinking,
	VuiTimePicker,
	VuiTooltip,
	VuiTyping,
	VuiUpload,
	VuiVoiceInput,
};

const VUI = {
	install(app) {
		Object.keys(components).forEach((name) => {
			app.component(name, components[name]);
		});
		// 同时注册 kebab-case 名称，兼容 <vui-button> 写法
		Object.keys(components).forEach((name) => {
			app.component(kebab(name), components[name]);
		});
		return app;
	}
};

function kebab(str) {
	return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export { components, kebab };
export default VUI;

export { default as VuiAutoScroll } from './uni_modules/vui-auto-scroll/components/vui-auto-scroll/vui-auto-scroll.vue';
export { default as VuiBacktop } from './uni_modules/vui-backtop/components/vui-backtop/vui-backtop.vue';
export { default as VuiButton } from './uni_modules/vui-button/components/vui-button/vui-button.vue';
export { default as VuiCalendar } from './uni_modules/vui-calendar/components/vui-calendar/vui-calendar.vue';
export { default as VuiCard } from './uni_modules/vui-card/components/vui-card/vui-card.vue';
export { default as VuiCarousel } from './uni_modules/vui-carousel/components/vui-carousel/vui-carousel.vue';
export { default as VuiChatBubble } from './uni_modules/vui-chat-bubble/components/vui-chat-bubble/vui-chat-bubble.vue';
export { default as VuiChatInput } from './uni_modules/vui-chat-input/components/vui-chat-input/vui-chat-input.vue';
export { default as VuiCheckbox } from './uni_modules/vui-checkbox/components/vui-checkbox/vui-checkbox.vue';
export { default as VuiCode } from './uni_modules/vui-code/components/vui-code/vui-code.vue';
export { default as VuiCollapse } from './uni_modules/vui-collapse/components/vui-collapse/vui-collapse.vue';
export { default as VuiCopy } from './uni_modules/vui-copy/components/vui-copy/vui-copy.vue';
export { default as VuiCountTo } from './uni_modules/vui-count-to/components/vui-count-to/vui-count-to.vue';
export { default as VuiDatePicker } from './uni_modules/vui-date-picker/components/vui-date-picker/vui-date-picker.vue';
export { default as VuiDrawer } from './uni_modules/vui-drawer/components/vui-drawer/vui-drawer.vue';
export { default as VuiFeedback } from './uni_modules/vui-feedback/components/vui-feedback/vui-feedback.vue';
export { default as VuiFormItem } from './uni_modules/vui-form-item/components/vui-form-item/vui-form-item.vue';
export { default as VuiForm } from './uni_modules/vui-form/components/vui-form/vui-form.vue';
export { default as VuiHeader } from './uni_modules/vui-header/components/vui-header/vui-header.vue';
export { default as VuiIcon } from './uni_modules/vui-icon/components/vui-icon/vui-icon.vue';
export { default as VuiImage } from './uni_modules/vui-image/components/vui-image/vui-image.vue';
export { default as VuiInput } from './uni_modules/vui-input/components/vui-input/vui-input.vue';
export { default as VuiLoading } from './uni_modules/vui-loading/components/vui-loading/vui-loading.vue';
export { default as VuiMarkdown } from './uni_modules/vui-markdown/components/vui-markdown/vui-markdown.vue';
export { default as VuiMessage } from './uni_modules/vui-message/components/vui-message/vui-message.vue';
export { default as VuiModal } from './uni_modules/vui-modal/components/vui-modal/vui-modal.vue';
export { default as VuiModelSelect } from './uni_modules/vui-model-select/components/vui-model-select/vui-model-select.vue';
export { default as VuiNotification } from './uni_modules/vui-notification/components/vui-notification/vui-notification.vue';
export { default as VuiPagination } from './uni_modules/vui-pagination/components/vui-pagination/vui-pagination.vue';
export { default as VuiPopover } from './uni_modules/vui-popover/components/vui-popover/vui-popover.vue';
export { default as VuiProgress } from './uni_modules/vui-progress/components/vui-progress/vui-progress.vue';
export { default as VuiPromptCard } from './uni_modules/vui-prompt-card/components/vui-prompt-card/vui-prompt-card.vue';
export { default as VuiRadio } from './uni_modules/vui-radio/components/vui-radio/vui-radio.vue';
export { default as VuiRegionPicker } from './uni_modules/vui-region-picker/components/vui-region-picker/vui-region-picker.vue';
export { default as VuiScrollbar } from './uni_modules/vui-scrollbar/components/vui-scrollbar/vui-scrollbar.vue';
export { default as VuiSelect } from './uni_modules/vui-select/components/vui-select/vui-select.vue';
export { default as VuiSlider } from './uni_modules/vui-slider/components/vui-slider/vui-slider.vue';
export { default as VuiSourceList } from './uni_modules/vui-source-list/components/vui-source-list/vui-source-list.vue';
export { default as VuiSteps } from './uni_modules/vui-steps/components/vui-steps/vui-steps.vue';
export { default as VuiSwitch } from './uni_modules/vui-switch/components/vui-switch/vui-switch.vue';
export { default as VuiTable } from './uni_modules/vui-table/components/vui-table/vui-table.vue';
export { default as VuiTabs } from './uni_modules/vui-tabs/components/vui-tabs/vui-tabs.vue';
export { default as VuiTag } from './uni_modules/vui-tag/components/vui-tag/vui-tag.vue';
export { default as VuiThinking } from './uni_modules/vui-thinking/components/vui-thinking/vui-thinking.vue';
export { default as VuiTimePicker } from './uni_modules/vui-time-picker/components/vui-time-picker/vui-time-picker.vue';
export { default as VuiTooltip } from './uni_modules/vui-tooltip/components/vui-tooltip/vui-tooltip.vue';
export { default as VuiTyping } from './uni_modules/vui-typing/components/vui-typing/vui-typing.vue';
export { default as VuiUpload } from './uni_modules/vui-upload/components/vui-upload/vui-upload.vue';
export { default as VuiVoiceInput } from './uni_modules/vui-voice-input/components/vui-voice-input/vui-voice-input.vue';
