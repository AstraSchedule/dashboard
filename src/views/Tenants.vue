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
let pendingAction = null

const domain = 'getastra.cn'

const statusMap = {
  normal: {label: '正常', type: 'success'},
  orphan: {label: '孤儿租户', type: 'warning'},
  abnormal: {label: '异常租户', type: 'error'},
}

function getAuthHeaders(pwd) {
  const h = {Authorization: `Bearer ${getToken()}`}
  if (pwd) h['X-Verify-Password'] = pwd
  return h
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
  {title: '操作', key: 'actions', width: 180, render(row) {
    const btns = []

    if (row.status === 'normal' && row.record_id) {
      btns.push(h(NPopconfirm, {
        onPositiveClick: () => { pendingAction = {type: 'ban', ...row}; passwordConfirmModal.value?.open(`确认封禁 ${row.subdomain}？将删除 DNS 记录但保留数据库数据。`) },
      }, {
        trigger: () => h(NButton, {size: 'small', type: 'warning', secondary: true, style: 'margin-right: 4px'}, {default: () => '封禁'}),
        default: () => `确认封禁 ${row.subdomain}？`,
      }))
      btns.push(h(NPopconfirm, {
        onPositiveClick: () => { pendingAction = {type: 'delete', ...row}; passwordConfirmModal.value?.open(`确认删除 ${row.subdomain}？将删除 DNS 记录和所有数据库数据。`) },
      }, {
        trigger: () => h(NButton, {size: 'small', type: 'error', secondary: true}, {default: () => '删除'}),
        default: () => `确认删除 ${row.subdomain}？此操作不可恢复。`,
      }))
    }

    if (row.status === 'orphan' && row.record_id) {
      btns.push(h(NPopconfirm, {
        onPositiveClick: () => { pendingAction = {type: 'delete-dns', ...row}; passwordConfirmModal.value?.open(`确认删除 ${row.subdomain} 的 DNS 记录？`) },
      }, {
        trigger: () => h(NButton, {size: 'small', type: 'error', secondary: true}, {default: () => '删除 DNS'}),
        default: () => `确认删除 ${row.subdomain} 的 DNS 记录？`,
      }))
    }

    if (row.status === 'abnormal') {
      btns.push(h(NPopconfirm, {
        onPositiveClick: () => { pendingAction = {type: 'cleanup', ...row}; passwordConfirmModal.value?.open(`确认清理 ${row.namespace} 的残留数据？`) },
      }, {
        trigger: () => h(NButton, {size: 'small', type: 'warning', secondary: true}, {default: () => '清理残留'}),
        default: () => `确认清理 ${row.namespace} 的数据库残留数据？`,
      }))
    }

    return btns.length ? h(NSpace, {size: 4}, {default: () => btns}) : null
  }},
]

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
    pendingAction = {type: 'create', subdomain}
    passwordConfirmModal.value?.open(`确认创建租户 ${subdomain}？将创建 DNS 记录。`)
  } catch (e) {
    message.error(e?.response?.data?.error || '创建租户失败')
  } finally {
    creating.value = false
  }
  return true
}

async function onPasswordConfirmed(pwd) {
  if (!pendingAction) return
  const {type, record_id, namespace, subdomain} = pendingAction

  try {
    if (type === 'create') {
      await axios.post(`${getAPISRV()}/web/tenants`, {subdomain}, {headers: getAuthHeaders(pwd)})
      message.success(`租户 ${subdomain} 创建成功`)
      showCreateModal.value = false
      createForm.value.subdomain = ''
    } else if (type === 'delete') {
      await axios.delete(`${getAPISRV()}/web/tenants/${record_id}`, {headers: getAuthHeaders(pwd), data: {namespace}})
      message.success('租户已删除（DNS + 数据库）')
    } else if (type === 'ban') {
      await axios.post(`${getAPISRV()}/web/tenants/${record_id}/ban`, null, {headers: getAuthHeaders(pwd)})
      message.success('租户已封禁（仅 DNS）')
    } else if (type === 'delete-dns') {
      await axios.delete(`${getAPISRV()}/web/tenants/${record_id}`, {headers: getAuthHeaders(pwd), data: {namespace}})
      message.success('DNS 记录已删除')
    } else if (type === 'cleanup') {
      await axios.post(`${getAPISRV()}/web/tenants/cleanup`, {namespace}, {headers: getAuthHeaders(pwd)})
      message.success('残留数据已清理')
    }
    fetchTenants()
  } catch (e) {
    message.error(e?.response?.data?.error || '操作失败')
  } finally {
    pendingAction = null
  }
}

onMounted(fetchTenants)
</script>
