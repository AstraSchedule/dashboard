<template>
  <n-space vertical>
    <n-h1>租户管理</n-h1>
    <n-card title="租户列表">
      <template #header-extra>
        <n-space>
          <n-button type="primary" @click="showCreateModal = true">新建租户</n-button>
          <n-button @click="fetchTenants" :loading="loading">刷新</n-button>
        </n-space>
      </template>
      <n-data-table :columns="columns" :data="tenants" :loading="loading" />
    </n-card>

    <n-modal v-model:show="showCreateModal" preset="dialog" title="新建租户" positive-text="创建" negative-text="取消" :loading="creating" @positive-click="handleCreate">
      <n-form label-placement="left" style="margin-top: 16px;">
        <n-form-item label="子域名">
          <n-input v-model:value="createForm.subdomain" placeholder="如：school-a" @keyup.enter="handleCreate" />
        </n-form-item>
        <n-form-item label="预览">
          <n-text depth="3">{{ createForm.subdomain ? createForm.subdomain + '.' + domain + ' → class.' + domain : '请输入子域名' }}</n-text>
        </n-form-item>
      </n-form>
    </n-modal>

    <PasswordConfirmModal ref="passwordConfirmModal" @confirm="onPasswordConfirmed" />
  </n-space>
</template>

<script setup>
import {ref, onMounted, h} from 'vue'
import {NSpace, NH1, NCard, NDataTable, NButton, NModal, NForm, NFormItem, NInput, NPopconfirm, NTag, NText, useMessage} from 'naive-ui'
import axios from 'axios'
import {getAPISRV} from '@/global.js'
import {getToken} from '@/auth.js'
import PasswordConfirmModal from '@/components/PasswordConfirmModal.vue'

const message = useMessage()
const tenants = ref([])
const loading = ref(false)
const creating = ref(false)
const showCreateModal = ref(false)
const createForm = ref({subdomain: ''})
const passwordConfirmModal = ref(null)
let pendingDeleteId = null

const domain = 'getastra.cn'

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
  {title: '目标', key: 'target', ellipsis: {tooltip: true}},
  {title: '状态', key: 'status', width: 120, render(row) {
    const s = statusMap[row.status] || {label: row.status, type: 'default'}
    return h(NTag, {type: s.type, size: 'small'}, {default: () => s.label})
  }},
  {title: '操作', key: 'actions', width: 80, render(row) {
    if (row.status === 'abnormal' || !row.record_id) return null
    return h(NPopconfirm, {
      onPositiveClick: () => { pendingDeleteId = row.record_id; passwordConfirmModal.value?.open(`确认删除租户 ${row.subdomain}？此操作将删除 DNS 记录。`) },
    }, {
      trigger: () => h(NButton, {size: 'small', type: 'error', secondary: true}, {default: () => '删除'}),
      default: () => `确认删除 ${row.subdomain}？`,
    })
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

async function handleCreate() {
  const subdomain = createForm.value.subdomain?.trim()
  if (!subdomain) {
    message.warning('请输入子域名')
    return false
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    message.warning('子域名只能包含小写字母、数字和连字符')
    return false
  }
  creating.value = true
  try {
    await axios.post(`${getAPISRV()}/web/tenants`, {subdomain}, {headers: {Authorization: `Bearer ${getToken()}`}})
    message.success(`租户 ${subdomain} 创建成功`)
    showCreateModal.value = false
    createForm.value.subdomain = ''
    fetchTenants()
  } catch (e) {
    message.error(e?.response?.data?.error || '创建租户失败')
  } finally {
    creating.value = false
  }
  return true
}

async function onPasswordConfirmed() {
  if (!pendingDeleteId) return
  try {
    await axios.delete(`${getAPISRV()}/web/tenants/${pendingDeleteId}`, {headers: {Authorization: `Bearer ${getToken()}`}})
    message.success('租户已删除')
    fetchTenants()
  } catch (e) {
    message.error(e?.response?.data?.error || '删除租户失败')
  } finally {
    pendingDeleteId = null
  }
}

onMounted(fetchTenants)
</script>
