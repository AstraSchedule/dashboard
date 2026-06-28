<template>
  <n-space vertical>
    <n-h1>租户管理</n-h1>
    <n-card title="租户列表">
      <template #header-extra>
        <n-button @click="fetchTenants" :loading="loading">刷新</n-button>
      </template>
      <n-data-table :columns="columns" :data="tenants" :loading="loading" />
    </n-card>
  </n-space>
</template>

<script setup>
import {ref, onMounted, h} from 'vue'
import {NSpace, NH1, NCard, NDataTable, NButton, NTag, NText, useMessage} from 'naive-ui'
import axios from 'axios'
import {getAPISRV} from '@/global.js'
import {getToken} from '@/auth.js'

const message = useMessage()
const tenants = ref([])
const loading = ref(false)

const statusMap = {
  normal: {label: '正常', type: 'success'},
  orphan: {label: '孤儿租户', type: 'warning'},
  abnormal: {label: '异常租户', type: 'error'},
}

const columns = [
  {title: '子域名', key: 'subdomain', render(row) {
    return h(NText, {strong: true}, {default: () => row.subdomain || '-'})
  }},
  {title: '命名空间', key: 'namespace', ellipsis: {tooltip: true}},
  {title: '状态', key: 'status', width: 120, render(row) {
    const s = statusMap[row.status] || {label: row.status, type: 'default'}
    return h(NTag, {type: s.type, size: 'small'}, {default: () => s.label})
  }},
]

async function fetchTenants() {
  loading.value = true
  try {
    const resp = await axios.get(`${getAPISRV()}/web/tenants`, {headers: {Authorization: `Bearer ${getToken()}`}})
    tenants.value = resp.data.data || []
  } catch (e) {
    message.error(e?.response?.data?.detail || '获取租户列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchTenants)
</script>
