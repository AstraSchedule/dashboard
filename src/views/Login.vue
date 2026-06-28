<template>
  <div class="login-wrapper" :style="{ background: themeVars.bodyColor }">
    <n-card class="login-card" :bordered="false" :content-style="{ padding: '40px' }">
      <div class="login-header">
        <img src="https://image-hk-1.oss-accelerate.aliyuncs.com/icon.png" alt="Logo" class="login-logo" />
        <n-h2 style="margin: 0;">Dashboard</n-h2>
        <n-text depth="3" style="font-size: 13px;">星程课表 · 系统管理</n-text>
      </div>
      <n-form label-placement="top" :show-feedback="false">
        <n-form-item label="用户名">
          <n-input v-model:value="form.username" placeholder="请输入用户名" @keyup.enter="handleLogin" />
        </n-form-item>
        <n-form-item label="密码">
          <n-input v-model:value="form.password" type="password" show-password-on="click" placeholder="请输入密码" @keyup.enter="handleLogin" />
        </n-form-item>
      </n-form>
      <n-button type="primary" block size="large" :loading="loading" @click="handleLogin" style="margin-top: 8px;">登 录</n-button>
    </n-card>
  </div>
</template>

<script setup>
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import {NButton, NCard, NForm, NFormItem, NInput, NH2, NText, useThemeVars, useMessage} from 'naive-ui'
import {login, setToken, setUserInfo} from '@/auth.js'

const router = useRouter()
const message = useMessage()
const themeVars = useThemeVars()
const loading = ref(false)

const form = ref({username: '', password: ''})

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    message.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const data = await login(form.value.username, form.value.password)
    setToken(data.token)
    setUserInfo(data.user)

    if (data.must_change_pwd) {
      message.warning('首次登录请修改密码')
      router.replace('/change-password')
    } else {
      router.replace('/')
    }
  } catch (e) {
    message.error(e?.response?.data?.detail || '登录失败')
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
