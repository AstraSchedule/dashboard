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

    <n-modal v-model:show="showCreateModal" preset="dialog" title="新建租户" positive-text="创建" negative-text="取消" :loading="creating" @positive-click="handleCreateConfirm">
      <n-form label-placement="left" style="margin-top: 16px;">
        <n-form-item label="子域名">
          <n-input v-model:value="createForm.subdomain" placeholder="如：school-a" @keyup.enter="handleCreateConfirm" />
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
import {NSpace, NH1, NCard, NDataTable, NButton, NModal, NForm, NFormItem, NInput, NTag, NText, useMessage} from 'naive-ui'
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
let pendingAction = null

const domain = 'getastra.cn'

const statusMap = {
  normal: {label: '正常', type: 'success'},
  orphan: {label: '孤儿租户', type: 'warning'},
  abnormal: {label: '异常租户', type: 'error'},
}

function getAuthHeaders(pwd) {
  const headers = {Authorization: `Bearer ${getToken()}`}
  if (pwd) headers['X-Verify-Password'] = pwd
  return headers
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
  {title: '操作', key: 'actions', width: 200, render(row) {
    const btns = []

    if (row.status === 'normal' && row.record_id) {
      btns.push(h(NButton, {size: 'small', type: 'warning', secondary: true, style: 'margin-right: 4px', onClick: () => confirmAction('ban', row, `确认封禁 ${row.subdomain}？将删除 DNS 记录但保留数据库数据。`)}, {default: () => '封禁'}))
      btns.push(h(NButton, {size: 'small', type: 'error', secondary: true, onClick: () => confirmAction('delete', row, `确认删除 ${row.subdomain}？将删除 DNS 和数据库数据，不可恢复。`)}, {default: () => '删除'}))
    }

    if (row.status === 'orphan' && row.record_id) {
      btns.push(h(NButton, {size: 'small', type: 'error', secondary: true, onClick: () => confirmAction('delete-dns', row, `确认删除 ${row.subdomain} 的 DNS 记录？`)}, {default: () => '删除 DNS'}))
    }

    if (row.status === 'abnormal') {
      btns.push(h(NButton, {size: 'small', type: 'warning', secondary: true, onClick: () => confirmAction('cleanup', row, `确认清理 ${row.namespace} 的残留数据？`)}, {default: () => '清理残留'}))
    }

    return btns.length ? h(NSpace, {size: 4}, {default: () => btns}) : null
  }},
]

function confirmAction(type, row, hint) {
  pendingAction = {type, ...row}
  passwordConfirmModal.value?.open(hint)
}

async function fetchTenants() {
  loading.value = true
  try {
    const resp = await axios.get(`${getAPISRV()}/web/tenants`, {headers: getAuthHeaders()})
    tenants.value = resp.data.data || []
  } catch (e) {
    message.error(e?.response?.data?.detail || '获取租户列表失败')
  } finally {
    loading.value = false
  }
}

async function handleCreateConfirm() {
  const subdomain = createForm.value.subdomain?.trim()
  if (!subdomain) {
    message.warning('请输入子域名')
    return false
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    message.warning('子域名只能包含小写字母、数字和连字符')
    return false
  }
  showCreateModal.value = false
  creating.value = true
  confirmAction('create', {subdomain}, `确认创建租户 ${subdomain}？将创建 DNS 记录。`)
  return true
}

async function onPasswordConfirmed(pwd) {
  if (!pendingAction) return
  const {type, record_id, namespace, subdomain} = pendingAction
  pendingAction = null

  const headers = getAuthHeaders(pwd)
  try {
    if (type === 'create') {
      await axios.post(`${getAPISRV()}/web/tenants`, {subdomain}, {headers})
      message.success(`租户 ${subdomain} 创建成功`)
      createForm.value.subdomain = ''
    } else if (type === 'delete') {
      await axios.delete(`${getAPISRV()}/web/tenants/${record_id}`, {headers, data: {namespace}})
      message.success('租户已删除（DNS + 数据库）')
    } else if (type === 'ban') {
      await axios.post(`${getAPISRV()}/web/tenants/${record_id}/ban`, null, {headers})
      message.success('租户已封禁（仅 DNS）')
    } else if (type === 'delete-dns') {
      await axios.delete(`${getAPISRV()}/web/tenants/${record_id}`, {headers, data: {namespace}})
      message.success('DNS 记录已删除')
    } else if (type === 'cleanup') {
      await axios.post(`${getAPISRV()}/web/tenants/cleanup`, {namespace}, {headers})
      message.success('残留数据已清理')
    }
    fetchTenants()
  } catch (e) {
    message.error(e?.response?.data?.error || '操作失败')
  }
}

onMounted(fetchTenants)
</script>
