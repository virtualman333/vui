<template>
	<!-- 解决在IOS小程序下的显示字符较小的问题 -->
	<text v-if="os == 'android' && text" class="vui-tag" :class="classes" :style="customStyle" @click="onClick">{{ text }}</text>
	<text v-if="os == 'ios' && text" class="vui-tag" style="font-weight: bold" :class="classes" :style="customStyle" @click="onClick">{{ text }}</text>
</template>

<script>
/**
 * Tag 标签
 * @description 用于展示1个或多个文字标签，可点击切换选中、不选中的状态
 * @tutorial 文档地址
 * @property {String} text 标签内容
 * @property {String} size = [default|small|mini] 大小尺寸
 * 	@value default 正常
 * 	@value small 小尺寸
 * 	@value mini 迷你尺寸
 * @property {String} type = [default|primary|success｜warning｜error]  颜色类型
 * 	@value default 灰色
 * 	@value primary 蓝色
 * 	@value success 绿色
 * 	@value warning 黄色
 * 	@value error 红色
 
 * @property {Boolean} disabled = [true|false] 是否为禁用状态
 * @property {Boolean} inverted = [true|false] 是否无需背景颜色（空心标签）
 * @property {Boolean} circle = [true|false] 是否为圆角
 * @event {Function} click 点击 Tag 触发事件
 */

export default {
	name: 'vuiTag',
	emits: ['click'],
	props: {
		type: {
			// 标签类型default、primary、success、warning、error、royal
			type: String,
			default: 'default'
		},
		size: {
			// 标签大小 normal, small
			type: String,
			default: 'normal'
		},
		// 标签内容
		text: {
			type: String,
			default: ''
		},
		disabled: {
			// 是否为禁用状态
			type: [Boolean, String],
			default: false
		},
		inverted: {
			// 是否为空心
			type: [Boolean, String],
			default: false
		},
		circle: {
			// 是否为圆角样式
			type: [Boolean, String],
			default: false
		},
		mark: {
			// 是否为标记样式
			type: [Boolean, String],
			default: false
		},
		customStyle: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			os: 'ios'
		};
	},

	computed: {
		classes() {
			const { type, disabled, inverted, circle, mark, size, isTrue } = this;
			const classArr = [
				'vui-tag--' + type,
				'vui-tag--' + size,
				isTrue(disabled) ? 'vui-tag--disabled' : '',
				isTrue(inverted) ? 'vui-tag--' + type + '--inverted' : '',
				isTrue(circle) ? 'vui-tag--circle' : '',
				isTrue(mark) ? 'vui-tag--mark' : '',
				// type === 'default' ? 'vui-tag--default' : 'vui-tag-text',
				isTrue(inverted) ? 'vui-tag--inverted vui-tag-text--' + type : '',
				size === 'small' ? 'vui-tag-text--small' : ''
			];
			// 返回类的字符串，兼容字节小程序
			return classArr.join(' ');
		}
	},
	mounted() {
		var that = this;
		var res = uni.getSystemInfoSync();
		console.log(res.osName);

		this.os = res.osName;
	},
	methods: {
		isTrue(value) {
			return value === true || value === 'true';
		},
		onClick() {
			if (this.isTrue(this.disabled)) return;
			this.$emit('click');
		}
	}
};
</script>

<style lang="scss" scoped>
$vui-primary: #2979ff !default;
$vui-success: #18bc37 !default;
$vui-warning: #f3a73f !default;
$vui-error: #e43d33 !default;
$vui-info: #8f939c !default;


$tag-default-pd: 4px 7px;
$tag-small-pd: 2px 5px;
$tag-mini-pd: 1px 3px;

.vui-tag {
	line-height: 14px;
	font-size: 12px;
	font-weight: 200;
	padding: $tag-default-pd;
	color: #fff;
	border-radius: 3px;
	background-color: $vui-info;
	border-width: 1px;
	border-style: solid;
	border-color: $vui-info;
	/* #ifdef H5 */
	cursor: pointer;
	/* #endif */

	// size attr
	&--default {
		font-size: 12px;
	}

	&--default--inverted {
		color: $vui-info;
		border-color: $vui-info;
	}

	&--small {
		padding: $tag-small-pd;
		font-size: 12px;
		border-radius: 2px;
	}

	&--mini {
		padding: $tag-mini-pd;
		font-size: 12px;
		border-radius: 2px;
	}

	// type attr
	&--primary {
		background-color: $vui-primary;
		border-color: $vui-primary;
		color: #fff;
	}

	&--success {
		color: #fff;
		background-color: $vui-success;
		border-color: $vui-success;
	}

	&--warning {
		color: #fff;
		background-color: $vui-warning;
		border-color: $vui-warning;
	}

	&--error {
		color: #fff;
		background-color: $vui-error;
		border-color: $vui-error;
	}

	
	&--primary--inverted {
		color: $vui-primary;
		border-color: $vui-primary;
	}

	&--success--inverted {
		color: $vui-success;
		border-color: $vui-success;
	}

	&--warning--inverted {
		color: $vui-warning;
		border-color: $vui-warning;
	}

	&--error--inverted {
		color: $vui-error;
		border-color: $vui-error;
	}
	
	&--inverted {
		background-color: #fff;
	}

	// other attr
	&--circle {
		border-radius: 15px;
	}

	&--mark {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		border-top-right-radius: 15px;
		border-bottom-right-radius: 15px;
	}

	&--disabled {
		opacity: 0.5;
		/* #ifdef H5 */
		cursor: not-allowed;
		/* #endif */
	}
}

.vui-tag-text {
	color: #fff;
	font-size: 14px;

	&--primary {
		color: $vui-primary;
	}

	&--success {
		color: $vui-success;
	}

	&--warning {
		color: $vui-warning;
	}

	&--error {
		color: $vui-error;
	}
	

	&--small {
		font-size: 12px;
	}
}
</style>
