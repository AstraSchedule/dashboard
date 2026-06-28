<template>
  <n-space vertical>
    <n-page-header :title="table" @back="$router.push('/data')" />
    <n-card>
      <n-space justify="space-between" align="center" style="margin-bottom: 16px;">
        <n-text depth="3">共 {{ records.length }} 条记录</n-text>
        <n-button type="primary" @click="showCreateModal = true">新增记录</n-button>
      </n-space>
    </n-card>
    <n-card>
      <n-data-table
          :columns="columns"
          :data="records"
          :loading="loading"
          :bordered="false"
          :single-line="true"
      />
    </n-card>

    <n-modal v-model:show="showEditModal" preset="dialog" title="编辑记录" positive-text="保存" negative-text="取消" :loading="saving" @positive-click="handleSave">
      <n-space vertical style="margin-top: 16px;">
        <div v-for="(value, key) in editForm" :key="key">
          <n-text strong style="display: block; margin-bottom: 4px;">{{ key }}</n-text>
          <n-input v-if="typeof value === 'string'" v-model:value="editForm[key]" type="textarea" :autosize="{ minRows: 1, maxRows: 6 }" />
          <n-input-number v-else-if="typeof value === 'number'" v-model:value="editForm[key]" style="width: 100%;" />
          <n-switch v-else-if="typeof value === 'boolean'" v-model:value="editForm[key]" />
          <n-input v-else v-model:value="editForm[key]" type="textarea" :autosize="{ minRows: 1, maxRows: 6 }" />
        </div>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showCreateModal" preset="dialog" title="新增记录" positive-text="创建" negative-text="取消" :loading="saving" @positive-click="handleCreate">
      <n-space vertical style="margin-top: 16px;">
        <div v-for="key in tableColumns" :key="key">
          <n-text strong style="display: block; margin-bottom: 4px;">{{ key }}</n-text>
          <n-input v-model:value="createForm[key]" />
        </div>
      </n-space>
    </n-modal>
  </n-space>
</template>

<script setup>
import {ref, onMounted, h, computed} from 'vue'
import {createRouter as $router, useRoute, useRouter} from 'vue-router'
import {NSpace, NCard, NDataTable, NButton, NInput, NInputNumber, NSwitch, NText, NPageHeader, NModal, NPopconfirm, useMessage} from 'naive-ui'
import axios from 'axios'
import {getAPISRV} from '@/global.js'
import {getToken} from '@/auth.js'

const route = useRoute()
useRouter();
const message = useMessage()
const table = computed(() => route.params.table)
const records = ref([])
const loading = ref(false)
const saving = ref(false)
const showEditModal = ref(false)
const showCreateModal = ref(false)
const editForm = ref({})
const createForm = ref({})
const editRowId = ref(null)
const tableColumns = ref([])

function isComplexValue(val) {
  if (val === null || val === undefined) return false
  if (typeof val === 'object') return true
  if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) return true
  return false
}

function truncateText(val, maxLen = 60) {
  if (val === null || val === undefined) return '-'
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

const columns = computed(() => {
  if (records.value.length === 0) return []
  return [
    ...tableColumns.value.map(key => ({
      title: key,
      key,
      minWidth: isComplexValue(records.value[0]?.[key]) ? 300 : 100,
      render(row) {
        const val = row[key]
        if (isComplexValue(val)) {
          return h(NText, {depth: 3, style: 'font-size: 12px; word-break: break-all;'}, {default: () => truncateText(val, 80)})
        }
        return String(val ?? '-')
      }
    })),
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render(row) {
        return h(NSpace, {size: 4}, {
          default: () => [
            h(NButton, {size: 'tiny', onClick: () => openEdit(row)}, {default: () => '编辑'}),
            h(NPopconfirm, {onPositiveClick: () => handleDelete(row.id)}, {
              default: () => '确认删除？',
              trigger: () => h(NButton, {size: 'tiny', type: 'error'}, {default: () => '删除'})
            })
          ]
        })
      }
    }
  ]
})

function openEdit(row) {
  editRowId.value = row.id
  const form = {}
  for (const key of tableColumns.value) {
    const val = row[key]
    form[key] = typeof val === 'object' && val !== null ? JSON.stringify(val, null, 2) : val
  }
  editForm.value = form
  showEditModal.value = true
}

async function handleSave() {
  saving.value = true
  try {
    const payload = {}
    for (const [key, val] of Object.entries(editForm.value)) {
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { payload[key] = JSON.parse(val) } catch { payload[key] = val }
      } else {
        payload[key] = val
      }
    }
    await axios.put(`${getAPISRV()}/web/data/${table.value}/${editRowId.value}`, payload, {headers: {Authorization: `Bearer ${getToken()}`}})
    message.success('保存成功')
    showEditModal.value = false
    fetchData()
  } catch (e) {
    message.error(e?.response?.data?.error || e?.response?.data?.detail || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  try {
    await axios.delete(`${getAPISRV()}/web/data/${table.value}/${id}`, {headers: {Authorization: `Bearer ${getToken()}`}})
    message.success('删除成功')
    fetchData()
  } catch (e) {
    message.error('删除失败')
  }
}

async function handleCreate() {
  saving.value = true
  try {
    const payload = {}
    for (const [key, val] of Object.entries(createForm.value)) {
      if (val === '' || val === undefined) continue
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { payload[key] = JSON.parse(val) } catch { payload[key] = val }
      } else {
        payload[key] = val
      }
    }
    await axios.post(`${getAPISRV()}/web/data/${table.value}`, payload, {headers: {Authorization: `Bearer ${getToken()}`}})
    message.success('创建成功')
    showCreateModal.value = false
    createForm.value = {}
    fetchData()
  } catch (e) {
    message.error(e?.response?.data?.error || e?.response?.data?.detail || '创建失败')
  } finally {
    saving.value = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const resp = await axios.get(`${getAPISRV()}/web/data/${table.value}`, {headers: {Authorization: `Bearer ${getToken()}`}})
    records.value = resp.data.data || []
  } catch (e) {
    message.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>
