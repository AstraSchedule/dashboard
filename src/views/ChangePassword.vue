<template>
  <div class="login-wrapper" :style="{ background: themeVars.bodyColor }">
    <n-card class="login-card" :bordered="false" :content-style="{ padding: '40px' }">
      <div class="login-header">
        <img src="https://image-hk-1.oss-accelerate.aliyuncs.com/icon.png" alt="Logo" class="login-logo" />
        <n-h2 style="margin: 0;">修改密码</n-h2>
        <n-text depth="3" style="font-size: 13px;">首次登录请修改默认密码</n-text>
      </div>
      <n-form label-placement="top" :show-feedback="false">
        <n-form-item label="当前密码">
          <n-input v-model:value="form.oldPassword" type="password" show-password-on="click" placeholder="请输入当前密码" />
        </n-form-item>
        <n-form-item label="新密码">
          <n-input v-model:value="form.newPassword" type="password" show-password-on="click" placeholder="至少6位" />
        </n-form-item>
        <n-form-item label="确认新密码">
          <n-input v-model:value="form.confirmPassword" type="password" show-password-on="click" placeholder="再次输入新密码" />
        </n-form-item>
        <n-form-item label="新用户名（可选）">
          <n-input v-model:value="form.newUsername" placeholder="留空则不修改" />
        </n-form-item>
      </n-form>
      <n-button type="primary" block size="large" :loading="loading" @click="handleChange" style="margin-top: 8px;">确认修改</n-button>
    </n-card>
  </div>
</template>

<script setup>
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import {NButton, NCard, NForm, NFormItem, NInput, NH2, NText, useThemeVars, useMessage} from 'naive-ui'
import {changePassword} from '@/auth.js'

const router = useRouter()
const message = useMessage()
const themeVars = useThemeVars()
const loading = ref(false)

const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
  newUsername: ''
})

async function handleChange() {
  if (!form.value.oldPassword || !form.value.newPassword) {
    message.warning('请填写密码')
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    message.warning('两次输入的密码不一致')
    return
  }
  if (form.value.newPassword.length < 6) {
    message.warning('新密码长度不能少于 6 位')
    return
  }

  loading.value = true
  try {
    await changePassword(form.value.oldPassword, form.value.newPassword, form.value.newUsername)
    message.success('修改成功，请重新登录')
    router.replace('/login')
  } catch (e) {
    message.error(e?.response?.data?.detail || '修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
.login-card {
  width: 360px;
  border-radius: 12px !important;
}
.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
  gap: 4px;
}
.login-logo {
  width: 56px;
  height: 56px;
  margin-bottom: 8px;
}
</style>
