<template>
  <view class="slider" :style="{ '--width': width, '--height': height, '--quantity': list.length }">
    <scroll-view scroll-x="true" :show-scrollbar="false" :style="{ width: '100%', height: scrollViewHeight }">
      <view id="index" class="slider-list" v-for="(item, index) in list" :key="index">
        <view class="slider-list-item" :style="`--position: ${index + 1}`">
          <view style="width: 100%; height: 100%;">
            <view class="slider-image" @touchstart="handleTouchStart()" @touchend="handleTouchend()">
              <!-- 使用插槽 -->
              <slot  :item="item"></slot>
                <!-- 如果有插槽内容则显示插槽内容，否则显示默认内容 -->
				<template v-if="$slots.default === undefined">
					{{ item }}
              </template>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  props: {
    list: {
      type: Array,
      default: () => []
    },
    width: {
      type: String,
      default: ''
    },
    height: {
      type: String,
      default: ''
    },
    scrollViewHeight: {
      type: String,
      default: ''
    },
	
  },
  methods: {
    pauseScroll() {
      const sliderItems = document.querySelectorAll('.slider-list-item');
      sliderItems.forEach((item) => {
        item.style.animationPlayState = 'paused';
      });
    },
    resumeScroll() {
      const sliderItems = document.querySelectorAll('.slider-list-item');
      sliderItems.forEach((item) => {
        item.style.animationPlayState = 'running';
      });
    },
    handleTouchStart() {
      this.pauseScroll();
    },
    handleTouchend() {
      this.resumeScroll();
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
.slider {
  width: 100%;
  height: var(--height);
  overflow: hidden;
}

.slider-list {
  display: flex;
  width: 100%;
  min-width: calc(var(--width) * var(--quantity));
  position: relative;
}

.slider-list-item {
  width: var(--width);
  height: var(--height);
  position: absolute;
  left: 100%;
  animation: autoRun 10s linear infinite;
  animation-delay: calc((10s / var(--quantity)) * (var(--position) - 1) - 10s) !important;
  background-color: $vui-gray-color;
  transition: animation-play-state 0.3s ease;
}

.slider-image {
  width: 100%;
  height: 100%;
}

.card {
  width: 100%;
  height: 100%;
}

@keyframes autoRun {
  from {
    left: 100%;
  }
  to {
    left: calc(var(--width) * -1);
  }
}

.slider[reverse="true"] .slider-list-item {
  animation: reversePlay 10s linear infinite;
}

@keyframes reversePlay {
  from {
    left: calc(var(--width) * -1);
  }
  to {
    left: 100%;
  }
}
</style>