<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="sider-logo" :class="{ collapsed }">
        <img src="https://image-hk-1.oss-accelerate.aliyuncs.com/icon.png" alt="Logo" class="logo-img" />
        <span v-if="!collapsed" class="logo-text">Dashboard</span>
      </div>
      <n-menu
        v-model:value="activeKey"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        @update:value="handleMenuClick"
      />
      <div style="padding: 8px; margin-top: auto;">
        <n-button quaternary block @click="handleLogout">退出登录</n-button>
      </div>
    </n-layout-sider>
    <n-layout-content style="padding: 24px;">
      <router-view />
    </n-layout-content>
  </n-layout>
</template>

<script setup>
import {ref, computed} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {NLayout, NLayoutSider, NLayoutContent, NMenu, NButton} from 'naive-ui'
import {removeToken, removeUserInfo} from '@/auth.js'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)

const activeKey = computed(() => route.name)

const menuOptions = [
  { label: '首页', key: 'Home', path: '/' },
  { label: '系统用户', key: 'SystemUsers', path: '/system-users' },
  { label: '租户管理', key: 'Tenants', path: '/tenants' },
  { label: '数据管理', key: 'Data', path: '/data' },
]

function handleMenuClick(key) {
  const option = menuOptions.find(o => o.key === key)
  if (option) {
    router.push(option.path)
  }
}

function handleLogout() {
  removeToken()
  removeUserInfo()
  router.replace('/login')
}
</script>

<style scoped>
.sider-logo {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 8px;
}
.sider-logo.collapsed {
  justify-content: center;
}
.logo-img {
  width: 32px;
  height: 32px;
}
.logo-text {
  font-size: 16px;
  font-weight: bold;
}
</style>
