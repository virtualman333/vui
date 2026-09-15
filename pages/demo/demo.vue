<template>
	<view class="demo">
		<vui-header title="VUI 组件总览"></vui-header>

		<!-- Icon 图标 -->
		<vui-card title="Icon 图标">
			<view class="demo-row">
				<vui-icon name="check" color="#18bc37" :size="40"></vui-icon>
				<vui-icon name="close" color="#e43d33" :size="40"></vui-icon>
				<vui-icon name="star" color="#f3a73f" :size="40"></vui-icon>
				<vui-icon name="heart" color="#e43d33" :size="40"></vui-icon>
				<vui-icon name="arrow-right" :size="40"></vui-icon>
				<vui-icon name="refresh" :size="40" spin></vui-icon>
			</view>
		</vui-card>

		<!-- Radio / Checkbox -->
		<vui-card title="Radio 单选框 / Checkbox 复选框">
			<view class="demo-row">
				<vui-radio v-model="radioValue" label="同意协议" @change="onRadioChange"></vui-radio>
			</view>
			<view class="demo-row">
				<vui-checkbox v-model="checkA" label="选项 A"></vui-checkbox>
				<vui-checkbox v-model="checkB" label="选项 B"></vui-checkbox>
				<vui-checkbox :model-value="true" indeterminate label="半选"></vui-checkbox>
			</view>
		</vui-card>

		<!-- Progress 进度条 -->
		<vui-card title="Progress 进度条">
			<vui-progress :percentage="30"></vui-progress>
			<vui-progress :percentage="70" status="success" class="demo-gap"></vui-progress>
			<vui-progress :percentage="90" status="error" :stroke-width="20" text-inside class="demo-gap"></vui-progress>
		</vui-card>

		<!-- Steps 步骤条 -->
		<vui-card title="Steps 步骤条">
			<vui-steps :items="stepItems" v-model="stepCurrent"></vui-steps>
			<vui-steps
				class="demo-gap"
				direction="vertical"
				:items="stepItems"
				v-model="stepCurrent"
			></vui-steps>
		</vui-card>

		<!-- Tabs 标签页 -->
		<vui-card title="Tabs 标签页">
			<vui-tabs :items="tabItems" v-model="tabCurrent"></vui-tabs>
			<view class="demo-panel">当前标签：{{ tabItems[tabCurrent] }}</view>
			<vui-tabs class="demo-gap" type="card" :items="tabItems" v-model="tabCurrent"></vui-tabs>
		</vui-card>

		<!-- Pagination 分页 -->
		<vui-card title="Pagination 分页">
			<vui-pagination v-model="page" :total="100" :page-size="10" show-total></vui-pagination>
		</vui-card>

		<!-- Collapse 折叠面板 -->
		<vui-card title="Collapse 折叠面板">
			<vui-collapse :items="collapseItems" v-model="collapseValue"></vui-collapse>
		</vui-card>

		<!-- Popover / Tooltip -->
		<vui-card title="Popover 弹出框 / Tooltip 提示">
			<view class="demo-row">
				<vui-popover v-model="popVisible" content="这是一段弹出框内容">
					<vui-button type="primary">点击弹出</vui-button>
				</vui-popover>
			</view>
			<view class="demo-row">
				<vui-tooltip content="这是一段文字提示" trigger="click">
					<vui-button>点击查看提示</vui-button>
				</vui-tooltip>
			</view>
		</vui-card>

		<!-- Loading 加载 -->
		<vui-card title="Loading 加载">
			<view class="demo-row">
				<vui-loading :model-value="true" type="circle" text="circle"></vui-loading>
				<vui-loading :model-value="true" type="spinner" color="#18bc37" text="spinner"></vui-loading>
				<vui-loading :model-value="true" type="dot" color="#f3a73f" text="dot"></vui-loading>
			</view>
		</vui-card>

		<!-- Message / Notification -->
		<vui-card title="Message 消息提示 / Notification 通知">
			<view class="demo-row">
				<vui-button type="primary" @click="showMessage('保存成功', 'success')">成功消息</vui-button>
				<vui-button type="primary" @click="showMessage('网络异常', 'error')">错误消息</vui-button>
				<vui-button type="primary" @click="showNotify">显示通知</vui-button>
			</view>
			<vui-message ref="message" :duration="2000"></vui-message>
			<vui-notification ref="notification" :duration="3000"></vui-notification>
		</vui-card>

		<!-- Modal / Drawer -->
		<vui-card title="Modal 对话框 / Drawer 抽屉">
			<view class="demo-row">
				<vui-button type="primary" @click="modalVisible = true">打开对话框</vui-button>
				<vui-button type="primary" @click="drawerVisible = true">打开抽屉</vui-button>
			</view>
			<vui-modal
				v-model="modalVisible"
				title="提示"
				content="确定要执行该操作吗？"
				@confirm="onConfirm"
			></vui-modal>
			<vui-drawer v-model="drawerVisible" title="抽屉标题" position="right">
				<text>抽屉内容区域</text>
			</vui-drawer>
		</vui-card>

		<!-- Select 下拉选择 -->
		<vui-card title="Select 下拉选择">
			<vui-select
				v-model="selectValue"
				:options="selectOptions"
				placeholder="请选择城市"
				clearable
			></vui-select>
			<view class="demo-panel">当前值：{{ selectValue || '未选择' }}</view>
		</vui-card>

		<!-- Table 表格 -->
		<vui-card title="Table 表格">
			<vui-table :columns="columns" :data="tableData" border stripe></vui-table>
		</vui-card>

		<!-- Form 表单 -->
		<vui-card title="Form 表单">
			<vui-form ref="form" :model="formData" :rules="rules" label-width="140rpx">
				<vui-form-item label="姓名" prop="name">
					<vui-input v-model="formData.name" placeholder="请输入姓名"></vui-input>
				</vui-form-item>
				<vui-form-item label="手机号" prop="phone">
					<vui-input v-model="formData.phone" placeholder="请输入手机号"></vui-input>
				</vui-form-item>
			</vui-form>
			<view class="demo-row">
				<vui-button type="primary" @click="submitForm">提交校验</vui-button>
				<vui-button @click="resetForm">重置</vui-button>
			</view>
		</vui-card>

		<!-- Slider 滑块 -->
		<vui-card title="Slider 滑块">
			<vui-slider v-model="sliderValue" :min="0" :max="100" :step="5" show-value></vui-slider>
		</vui-card>

		<!-- Upload 上传 -->
		<vui-card title="Upload 上传">
			<vui-upload v-model="fileList" :max="6" :count="6"></vui-upload>
		</vui-card>

		<!-- Carousel 轮播图 -->
		<vui-card title="Carousel 轮播图">
			<vui-carousel
				:list="carouselList"
				height="280rpx"
				indicator-type="number"
				show-title
			></vui-carousel>
		</vui-card>

		<!-- Image 图片 -->
		<vui-card title="Image 图片">
			<vui-image
				:src="imageSrc"
				width="240rpx"
				height="240rpx"
				radius="16rpx"
				preview
			></vui-image>
		</vui-card>

		<!-- Calendar 日历 -->
		<vui-card title="Calendar 日历">
			<vui-calendar v-model="date"></vui-calendar>
			<view class="demo-panel">选中日期：{{ date }}</view>
		</vui-card>

		<!-- DatePicker / TimePicker -->
		<vui-card title="DatePicker 日期选择器 / TimePicker 时间选择器">
			<vui-date-picker v-model="dateValue" height="300rpx"></vui-date-picker>
			<view class="demo-panel">选中日期：{{ dateValue }}</view>
			<vui-time-picker v-model="timeValue" :show-seconds="true" height="300rpx"></vui-time-picker>
			<view class="demo-panel">选中时间：{{ timeValue }}</view>
		</vui-card>

		<!-- Scrollbar 滚动条 -->
		<vui-card title="Scrollbar 滚动条">
			<vui-scrollbar height="300rpx">
				<view class="demo-scroll-content">
					<text v-for="i in 30" :key="i" class="demo-scroll-line">第 {{ i }} 行内容</text>
				</view>
			</vui-scrollbar>
		</vui-card>

		<!-- 回到顶部按钮 -->
		<vui-backtop :scroll-top="scrollTop" :visibility-height="300"></vui-backtop>
	</view>
</template>

<script>
export default {
	data() {
		return {
			scrollTop: 0,
			radioValue: false,
			checkA: true,
			checkB: false,
			stepItems: [
				{ title: '步骤一', desc: '创建订单' },
				{ title: '步骤二', desc: '支付订单' },
				{ title: '步骤三', desc: '完成订单' }
			],
			stepCurrent: 1,
			tabItems: ['推荐', '热点', '视频'],
			tabCurrent: 0,
			page: 1,
			collapseItems: [
				{ title: '面板一', content: '这是一段折叠面板的内容。' },
				{ title: '面板二', content: '这是另一段折叠面板的内容。' }
			],
			collapseValue: [0],
			popVisible: false,
			modalVisible: false,
			drawerVisible: false,
			selectValue: '',
			selectOptions: [
				{ label: '杭州', value: 'hangzhou' },
				{ label: '上海', value: 'shanghai' },
				{ label: '北京', value: 'beijing', disabled: true }
			],
			columns: [
				{ title: '姓名', key: 'name' },
				{ title: '年龄', key: 'age' },
				{ title: '城市', key: 'city' }
			],
			tableData: [
				{ name: '张三', age: 18, city: '杭州' },
				{ name: '李四', age: 22, city: '上海' },
				{ name: '王五', age: 30, city: '北京' }
			],
			formData: {
				name: '',
				phone: ''
			},
			rules: {
				name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
				phone: [
					{ required: true, message: '请输入手机号', trigger: 'blur' },
					{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
				]
			},
			sliderValue: 40,
			fileList: [],
			carouselList: [
				{ url: '/static/logo.png', title: '第一张' },
				{ url: '/static/logo.png', title: '第二张' },
				{ url: '/static/logo.png', title: '第三张' }
			],
			imageSrc: '/static/logo.png',
			date: '',
			dateValue: '',
			timeValue: '10:30:00'
		};
	},
	onPageScroll(event) {
		this.scrollTop = event.scrollTop;
	},
	methods: {
		onRadioChange(value) {
			console.log('radio change:', value);
		},
		showMessage(message, type) {
			this.$refs.message.show(message, type);
		},
		showNotify() {
			this.$refs.notification.show({
				title: '通知标题',
				message: '这是一条通知内容',
				type: 'success'
			});
		},
		onConfirm() {
			this.modalVisible = false;
			this.$refs.message.show('已确认', 'success');
		},
		submitForm() {
			this.$refs.form.validate().then((valid) => {
				if (!valid) return;
				this.$refs.message.show('校验通过', 'success');
			});
		},
		resetForm() {
			this.$refs.form.resetFields();
		}
	}
};
</script>

<style>
.demo {
	padding: 20rpx 20rpx 60rpx 20rpx;
	background-color: #f5f7fa;
}

.demo-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
}

.demo-row > * {
	margin-right: 20rpx;
}

.demo-gap {
	margin-top: 24rpx;
}

.demo-panel {
	margin-top: 16rpx;
	font-size: 26rpx;
	color: #909399;
}

.demo-scroll-content {
	display: flex;
	flex-direction: column;
}

.demo-scroll-line {
	padding: 16rpx 0;
	font-size: 28rpx;
	color: #606266;
}
</style>
