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
.vui-upload {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;

	&__item {
		position: relative;
		margin: 0 16rpx 16rpx 0;
		border-radius: 8rpx;
		overflow: hidden;
		background-color: #f5f7fa;
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
		color: #fff;
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
		color: #fff;
	}

	&__add {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 16rpx 16rpx 0;
		box-sizing: border-box;
		border: 1px dashed #dcdfe6;
		border-radius: 8rpx;
		background-color: #fafafa;
	}

	&__add-text {
		font-size: 48rpx;
		color: #c0c4cc;
	}
}
</style>
