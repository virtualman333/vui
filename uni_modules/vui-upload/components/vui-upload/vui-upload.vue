<template>
	<view class="vui-upload">
		<view v-for="(file, index) in list" :key="index" class="vui-upload__item" :style="itemStyle">
			<image class="vui-upload__image" :src="fileUrl(file)" mode="aspectFill" @click="onPreview(index)"></image>
			<view v-if="file.progress !== undefined && file.progress < 100" class="vui-upload__progress">
				<text class="vui-upload__progress-text">{{ file.progress }}%</text>
			</view>
			<view v-if="deletable" class="vui-upload__remove" @click.stop="onRemove(index)">
				<text class="vui-upload__remove-text">×</text>
			</view>
		</view>
		<view v-if="list.length < max" class="vui-upload__add" :style="itemStyle" @click="onChoose">
			<text class="vui-upload__add-text">+</text>
		</view>
	</view>
</template>

<script>
/**
 * Upload 上传
 * @description 通过点击或拖拽选择文件并上传
 * @property {Array} modelValue 文件列表 [{url, path, progress}]，支持 v-model
 * @property {String} action 上传地址，不传则仅选择本地文件
 * @property {Number} max 最大数量
 * @property {Number} count 单次可选择数量
 * @property {Boolean} deletable 是否可删除
 * @property {Boolean} preview 是否可预览
 * @property {String} size 单文件大小，默认 160rpx
 * @property {String} name 上传时的文件字段名
 * @property {Object} header 上传请求头，透传给 uni.uploadFile 的 header
 * @event {Function} change 文件列表变化时触发
 * @event {Function} success 上传成功时触发
 * @event {Function} error 上传失败时触发
 */
export default {
	name: 'VuiUpload',
	emits: ['update:modelValue', 'change', 'success', 'error'],
	props: {
		modelValue: {
			type: Array,
			default: () => []
		},
		action: {
			type: String,
			default: ''
		},
		max: {
			type: Number,
			default: 9
		},
		count: {
			type: Number,
			default: 9
		},
		deletable: {
			type: Boolean,
			default: true
		},
		preview: {
			type: Boolean,
			default: true
		},
		size: {
			type: String,
			default: '160rpx'
		},
		name: {
			type: String,
			default: 'file'
		},
		header: {
			type: Object,
			default: () => ({})
		}
	},
	computed: {
		list() {
			return this.modelValue || [];
		},
		itemStyle() {
			return 'width:' + this.size + ';height:' + this.size + ';';
		}
	},
	methods: {
		fileUrl(file) {
			return file.url || file.path || '';
		},
		emit(list) {
			this.$emit('update:modelValue', list);
			this.$emit('change', list);
		},
		onChoose() {
			const remain = this.max - this.list.length;
			if (remain <= 0) return;
			const count = Math.min(remain, this.count);
			uni.chooseImage({
				count: count,
				success: (res) => {
					const files = (res.tempFilePaths || []).map((path) => {
						return { path: path, url: path, progress: this.action ? 0 : 100 };
					});
					const next = this.list.concat(files);
					this.emit(next);
					if (this.action) {
						files.forEach((file) => this.upload(file));
					}
				}
			});
		},
		upload(file) {
			const task = uni.uploadFile({
				url: this.action,
				filePath: file.path,
				name: this.name,
				header: this.header,
				success: (res) => {
					file.progress = 100;
					if (res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const data = JSON.parse(res.data);
							if (data.url) file.url = data.url;
						} catch (e) {
							file.response = res.data;
						}
						this.$emit('success', res, file);
					} else {
						this.$emit('error', res, file);
					}
					this.emit(this.list.slice());
				},
				fail: (err) => {
					file.progress = 100;
					this.$emit('error', err, file);
					this.emit(this.list.slice());
				}
			});
			if (task && typeof task.onProgressUpdate === 'function') {
				task.onProgressUpdate((res) => {
					file.progress = res.progress || 0;
					this.emit(this.list.slice());
				});
			}
		},
		onRemove(index) {
			const next = this.list.slice();
			next.splice(index, 1);
			this.emit(next);
		},
		onPreview(index) {
			if (!this.preview) return;
			const urls = this.list.map((file) => this.fileUrl(file)).filter((url) => !!url);
			if (urls.length === 0) return;
			uni.previewImage({
				urls: urls,
				current: urls[index] || urls[0]
			});
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
.vui-upload {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;

	&__item {
		position: relative;
		margin: 0 16rpx 16rpx 0;
		border-radius: 8rpx;
		overflow: hidden;
		background-color: $vui-fill-color-light;
	}

	&__image {
		width: 100%;
		height: 100%;
	}

	&__progress {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4rpx 0;
		background-color: rgba(0, 0, 0, 0.5);
	}

	&__progress-text {
		font-size: 20rpx;
		color: $vui-text-color-inverse;
	}

	&__remove {
		position: absolute;
		right: 0;
		top: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36rpx;
		height: 36rpx;
		background-color: rgba(0, 0, 0, 0.5);
	}

	&__remove-text {
		font-size: 26rpx;
		color: $vui-text-color-inverse;
	}

	&__add {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 16rpx 16rpx 0;
		box-sizing: border-box;
		border: 1px dashed $vui-border-color;
		border-radius: 8rpx;
		background-color: $vui-fill-color-lighter;
	}

	&__add-text {
		font-size: 48rpx;
		color: $vui-text-color-placeholder;
	}
}
</style>
