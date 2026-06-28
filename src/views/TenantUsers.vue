<template>
  <n-space vertical>
    <n-h1>租户用户管理</n-h1>
    <n-card title="租户用户">
      <template #header-extra>
        <n-space>
          <n-select v-model:value="filterNamespace" :options="namespaceOptions" placeholder="筛选租户" clearable style="width: 200px;" @update:value="fetchUsers" />
          <n-button type="primary" @click="openCreate">新增用户</n-button>
        </n-space>
      </template>
      <n-data-table :columns="columns" :data="users" :loading="loading" />
    </n-card>

    <n-modal v-model:show="showModal" preset="dialog" :title="isEdit ? '编辑用户' : '新增用户'" positive-text="确认" negative-text="取消" :loading="saving" @positive-click="() => withPasswordConfirm(handleSave, isEdit ? '确认修改用户？' : '确认创建用户？')">
      <n-form label-placement="left" style="margin-top: 16px;">
        <n-form-item label="命名空间"><n-input v-model:value="form.namespace" placeholder="如：school-a" :disabled="isEdit" /></n-form-item>
        <n-form-item label="用户名"><n-input v-model:value="form.username" :disabled="isEdit" /></n-form-item>
        <n-form-item label="密码"><n-input v-model:value="form.password" type="password" :placeholder="isEdit ? '留空则不修改' : '请输入密码'" /></n-form-item>
        <n-form-item label="角色">
          <n-select v-model:value="form.role" :options="roleOptions" />
        </n-form-item>
        <n-form-item label="作用域"><n-input v-model:value="form.scope" placeholder="如：school/grade/class" /></n-form-item>
      </n-form>
    </n-modal>

    <PasswordConfirmModal ref="passwordConfirmModal" @confirm="onPasswordConfirmed" />
  </n-space>
</template>

<script setup>
import {ref, onMounted, h} from 'vue'
import {NSpace, NH1, NCard, NDataTable, NButton, NModal, NForm, NFormItem, NInput, NSelect, NPopconfirm, NTag, useMessage} from 'naive-ui'
import axios from 'axios'
import {getAPISRV} from '@/global.js'
import {getToken} from '@/auth.js'
import PasswordConfirmModal from '@/components/PasswordConfirmModal.vue'

const message = useMessage()
const users = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const filterNamespace = ref('')
const namespaceOptions = ref([])
const form = ref({namespace: '', username: '', password: '', role: 'readonly', scope: ''})
const roleOptions = [
  {label: '管理员', value: 'admin'},
  {label: '校写入', value: 'school_w'},
  {label: '级写入', value: 'grade_w'},
  {label: '班写入', value: 'class_w'},
  {label: '只读', value: 'readonly'},
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
  {title: '命名空间', key: 'namespace', width: 150},
  {title: '用户名', key: 'username'},
  {title: '角色', key: 'role', width: 100, render(row) {
    const map = {admin: '管理员', school_w: '校写入', grade_w: '级写入', class_w: '班写入', readonly: '只读'}
    return h(NTag, {size: 'small', type: row.role === 'admin' ? 'warning' : 'info'}, {default: () => map[row.role] || row.role})
  }},
  {title: '作用域', key: 'scope', ellipsis: {tooltip: true}},
  {title: '操作', key: 'actions', width: 120, render(row) {
    return h(NSpace, {size: 4}, {
      default: () => [
        h(NButton, {size: 'tiny', onClick: () => openEdit(row)}, {default: () => '编辑'}),
        h(NPopconfirm, {onPositiveClick: () => withPasswordConfirm((pwd) => handleDelete(row.id, pwd), '确认删除用户 ' + row.username + '？')}, {
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
  form.value = {namespace: filterNamespace.value || '', username: '', password: '', role: 'readonly', scope: ''}
  showModal.value = true
}

function openEdit(row) {
  isEdit.value = true
  editId.value = row.id
  form.value = {namespace: row.namespace, username: row.username, password: '', role: row.role, scope: row.scope || ''}
  showModal.value = true
}

async function handleSave(pwd) {
  saving.value = true
  try {
    if (isEdit.value) {
      const payload = {role: form.value.role, scope: form.value.scope}
      if (form.value.password) payload.password = form.value.password
      await axios.put(`${getAPISRV()}/web/astra-users/${editId.value}`, payload, {headers: getAuthHeaders(pwd)})
      message.success('修改成功')
    } else {
      await axios.post(`${getAPISRV()}/web/astra-users`, form.value, {headers: getAuthHeaders(pwd)})
      message.success('创建成功')
    }
    showModal.value = false
    fetchUsers()
  } catch (e) {
    message.error(e?.response?.data?.detail || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id, pwd) {
  try {
    await axios.delete(`${getAPISRV()}/web/astra-users/${id}`, {headers: getAuthHeaders(pwd)})
    message.success('删除成功')
    fetchUsers()
  } catch (e) {
    message.error('删除失败')
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = filterNamespace.value ? {namespace: filterNamespace.value} : {}
    const resp = await axios.get(`${getAPISRV()}/web/astra-users`, {params, headers: {Authorization: `Bearer ${getToken()}`}})
    users.value = resp.data.data || []
    // Extract unique namespaces for filter
    const ns = new Set(users.value.map(u => u.namespace))
    namespaceOptions.value = Array.from(ns).map(n => ({label: n, value: n}))
  } catch (e) {
    message.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)
</script>
