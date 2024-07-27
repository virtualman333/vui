<template>
  <view class="input-container">
    <text v-if="label" class="input-label">{{ label }}</text>
    <input
        :type="type"
        :placeholder="placeholder"
        :value="value"
        @input="onInput"
        :style="inputStyle"
        class="custom-input"
    />
  </view>
  <text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>
</template>

<script>
export default {
  name: 'CustomInput',
  props: {
    label: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: '请输入...'
    },
    value: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'text'
    },
    errorMessage: {
      type: String,
      default: ''
    },
    inputStyle: {
      type: String,
      default: ''
    }
  },
  methods: {
    onInput(event) {
      this.$emit('input', event.detail.value);
    }
  }
}
</script>

<style scoped>
.input-container {
  width: 100%;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
}

.input-label {
  font-size: 14px;
  margin-bottom: 4px;
  margin-right: 6px;
}

.custom-input {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  flex: 1;
}

.error-message {
  color: red;
  font-size: 12px;
}
</style>
