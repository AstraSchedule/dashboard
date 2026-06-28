<template>
  <n-space vertical>
    <n-h1>租户管理</n-h1>
    <n-card>
      <template #header-extra>
        <n-button type="primary" @click="openCreate">新增租户</n-button>
      </template>
      <n-data-table :columns="columns" :data="tenants" :loading="loading" />
    </n-card>

    <n-modal v-model:show="showModal" preset="dialog" :title="isEdit ? '编辑租户' : '新增租户'" positive-text="确认" negative-text="取消" :loading="saving" @positive-click="() => withPasswordConfirm(handleSave, isEdit ? '确认修改租户？' : '确认创建租户？')">
      <n-form label-placement="left" style="margin-top: 16px;">
        <n-form-item label="名称"><n-input v-model:value="form.name" placeholder="如：示范学校" /></n-form-item>
        <n-form-item label="命名空间"><n-input v-model:value="form.namespace" placeholder="如：school-a" :disabled="isEdit" /></n-form-item>
        <n-form-item label="状态" v-if="isEdit">
          <n-select v-model:value="form.status" :options="statusOptions" />
        </n-form-item>
      </n-form>
    </n-modal>

    <PasswordConfirmModal ref="passwordConfirmModal" @confirm="onPasswordConfirmed" />
  </n-space>
</template>

<script setup>
import {ref, onMounted, h} from 'vue'
import {NSpace, NH1, NCard, NDataTable, NButton, NModal, NForm, NFormItem, NInput, NSelect, NPopconfirm, useMessage} from 'naive-ui'
import axios from 'axios'
import {getAPISRV} from '@/global.js'
import {getToken} from '@/auth.js'
import PasswordConfirmModal from '@/components/PasswordConfirmModal.vue'

const message = useMessage()
const tenants = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const form = ref({name: '', namespace: '', status: 'active'})
const statusOptions = [
  {label: '正常', value: 'active'},
  {label: '已封禁', value: 'banned'},
]
const passwordConfirmModal = ref(null)
let pendingAction = null

function withPasswordConfirm(action, hint = '') {
  pendingAction = action
  passwordConfirmModal.value?.open(hint)
}

function onPasswordConfirmed(pwd) {
  if (pendingAction) {
    pendingAction(pwd)
    pendingAction = null
  }
}

function getAuthHeaders(pwd) {
  return {
    Authorization: `Bearer ${getToken()}`,
    'X-Verify-Password': pwd,
  }
}

const columns = [
  {title: 'ID', key: 'id', width: 60},
  {title: '名称', key: 'name'},
  {title: '命名空间', key: 'namespace'},
  {title: '状态', key: 'status', render(row) {
    return h(NButton, {size: 'tiny', type: row.status === 'active' ? 'success' : 'error', quaternary: true}, {default: () => row.status === 'active' ? '正常' : '已封禁'})
  }},
  {title: '创建时间', key: 'created_at', render(row) { return new Date(row.created_at).toLocaleString() }},
  {title: '操作', key: 'actions', width: 120, render(row) {
    return h(NSpace, {size: 4}, {
      default: () => [
        h(NButton, {size: 'tiny', onClick: () => openEdit(row)}, {default: () => '编辑'}),
        h(NPopconfirm, {onPositiveClick: () => withPasswordConfirm((pwd) => handleDelete(row.id, pwd), '确认删除租户？')}, {
          default: () => '确认删除？',
          trigger: () => h(NButton, {size: 'tiny', type: 'error'}, {default: () => '删除'})
        })
      ]
    })
  }}
]

function openCreate() {
  isEdit.value = false
  editId.value = null
  form.value = {name: '', namespace: '', status: 'active'}
  showModal.value = true
}

function openEdit(row) {
  isEdit.value = true
  editId.value = row.id
  form.value = {name: row.name, namespace: row.namespace, status: row.status}
  showModal.value = true
}

async function handleSave(pwd) {
  saving.value = true
  try {
    if (isEdit.value) {
      await axios.put(`${getAPISRV()}/web/tenants/${editId.value}`, form.value, {headers: getAuthHeaders(pwd)})
      message.success('修改成功')
    } else {
      await axios.post(`${getAPISRV()}/web/tenants`, form.value, {headers: getAuthHeaders(pwd)})
      message.success('创建成功')
    }
    showModal.value = false
    fetchTenants()
  } catch (e) {
    message.error(e?.response?.data?.detail || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id, pwd) {
  try {
    await axios.delete(`${getAPISRV()}/web/tenants/${id}`, {headers: getAuthHeaders(pwd)})
    message.success('删除成功')
    fetchTenants()
  } catch (e) {
    message.error('删除失败')
  }
}

async function fetchTenants() {
  loading.value = true
  try {
    const resp = await axios.get(`${getAPISRV()}/web/tenants`, {headers: {Authorization: `Bearer ${getToken()}`}})
    tenants.value = resp.data.data || []
  } catch (e) {
    message.error('获取租户列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchTenants)
</script>
