<template>
  <n-modal v-model:show="visible" preset="dialog" title="身份验证" positive-text="确认" negative-text="取消" :loading="loading" @positive-click="handleConfirm" @after-leave="reset">
    <n-space vertical style="margin-top: 16px;">
      <n-alert type="warning" title="敏感操作">
        {{ hint || '此操作需要验证密码才能执行。' }}
      </n-alert>
      <n-form-item label="当前密码">
        <n-input v-model:value="password" type="password" show-password-on="click" placeholder="请输入密码" @keyup.enter="handleConfirm" />
      </n-form-item>
    </n-space>
  </n-modal>
</template>

<script setup>
import {ref} from 'vue'
import {NModal, NForm, NFormItem, NInput, NSpace, NAlert, useMessage} from 'naive-ui'
import axios from 'axios'
import {getAPISRV} from '@/global.js'
import {getToken} from '@/auth.js'

const props = defineProps({
  hint: {type: String, default: ''},
})

const emit = defineEmits(['confirm'])

const message = useMessage()
const visible = ref(false)
const loading = ref(false)
const password = ref('')

function open() {
  visible.value = true
}

function reset() {
  password.value = ''
  loading.value = false
}

async function handleConfirm() {
  if (!password.value) {
    message.warning('请输入密码')
    return false
  }
  loading.value = true
  try {
    await axios.post(`${getAPISRV()}/web/auth/verify-password`, {password: password.value}, {
      headers: {Authorization: `Bearer ${getToken()}`}
    })
    visible.value = false
    emit('confirm', password.value)
  } catch (e) {
    message.error(e?.response?.data?.detail || '密码错误')
    return false
  } finally {
    loading.value = false
  }
}

defineExpose({open})
</script>
