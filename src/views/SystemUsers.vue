<template>
  <n-space vertical>
    <n-h1>系统用户管理</n-h1>
    <n-card title="系统用户">
      <template #header-extra>
        <n-button type="primary" @click="showModal = true">新增用户</n-button>
      </template>
      <n-data-table :columns="columns" :data="users" :loading="loading" />
    </n-card>

    <n-modal v-model:show="showModal" preset="dialog" title="新增用户" positive-text="确认" negative-text="取消" @positive-click="() => withPasswordConfirm(handleCreate, '确认创建新用户？')">
      <n-form label-placement="left">
        <n-form-item label="用户名"><n-input v-model:value="form.username" /></n-form-item>
        <n-form-item label="密码"><n-input v-model:value="form.password" type="password" /></n-form-item>
        <n-form-item label="角色">
          <n-select v-model:value="form.role" :options="roleOptions" />
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
const users = ref([])
const loading = ref(false)
const showModal = ref(false)
const form = ref({username: '', password: '', role: 'readonly'})
const roleOptions = [
  {label: '读写', value: 'readwrite'},
  {label: '只读', value: 'readonly'}
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
  {title: 'ID', key: 'id'},
  {title: '用户名', key: 'username'},
  {title: '角色', key: 'role'},
  {title: '操作', key: 'actions', render(row) {
    return h(NPopconfirm, {onPositiveClick: () => withPasswordConfirm((pwd) => handleDelete(row.id, pwd), '确认删除此用户？')}, {
      default: () => '确认删除？',
      trigger: () => h(NButton, {size: 'small', type: 'error'}, {default: () => '删除'})
    })
  }}
]

async function fetchUsers() {
  loading.value = true
  try {
    const resp = await axios.get(`${getAPISRV()}/web/system-users`, {headers: {Authorization: `Bearer ${getToken()}`}})
    users.value = resp.data.data || []
  } catch (e) {
    message.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

async function handleCreate(pwd) {
  try {
    await axios.post(`${getAPISRV()}/web/system-users`, form.value, {headers: getAuthHeaders(pwd)})
    message.success('创建成功')
    showModal.value = false
    fetchUsers()
  } catch (e) {
    message.error(e?.response?.data?.detail || '创建失败')
  }
}

async function handleDelete(id, pwd) {
  try {
    await axios.delete(`${getAPISRV()}/web/system-users/${id}`, {headers: getAuthHeaders(pwd)})
    message.success('删除成功')
    fetchUsers()
  } catch (e) {
    message.error('删除失败')
  }
}

onMounted(fetchUsers)
</script>
