<template>
  <n-space vertical size="large">
    <n-h1 style="margin-bottom: 0;">数据管理</n-h1>

    <n-spin :show="loadingTables">
      <n-card v-if="tables.length > 0">
        <n-tabs v-model:value="activeDb" type="line" animated @update:value="handleDbChange">
          <n-tab-pane name="astra" tab="课表数据库（Astra）">
            <n-empty v-if="astraTables.length === 0" description="暂无表" />
            <n-tabs v-else v-model:value="activeTable" type="card" placement="left" animated @update:value="handleTableChange">
              <n-tab-pane v-for="t in astraTables" :key="t" :name="t" :tab="t">
                <n-space justify="space-between" align="center" style="margin-bottom: 8px;">
                  <n-text depth="3">{{ t }}</n-text>
                  <n-popconfirm @positive-click="() => withPasswordConfirm((pwd) => handleDropTable(t, pwd), '确认删除表 ' + t + '？表将被重建为空表。')">
                    <template #trigger>
                      <n-button size="tiny" type="error" text>删除此表</n-button>
                    </template>
                    确认 DROP 表 {{ t }}？
                  </n-popconfirm>
                </n-space>
                <n-spin :show="loadingData">
                  <TableBody />
                </n-spin>
              </n-tab-pane>
            </n-tabs>
          </n-tab-pane>
          <n-tab-pane name="sys" tab="系统数据库（Dashboard）">
            <n-empty v-if="sysTables.length === 0" description="暂无表" />
            <n-tabs v-else v-model:value="activeTable" type="card" placement="left" animated @update:value="handleTableChange">
              <n-tab-pane v-for="t in sysTables" :key="t" :name="t" :tab="t">
                <n-space justify="space-between" align="center" style="margin-bottom: 8px;">
                  <n-text depth="3">{{ t }}</n-text>
                  <n-popconfirm @positive-click="() => withPasswordConfirm((pwd) => handleDropTable(t, pwd), '确认删除表 ' + t + '？表将被重建为空表。')">
                    <template #trigger>
                      <n-button size="tiny" type="error" text>删除此表</n-button>
                    </template>
                    确认 DROP 表 {{ t }}？
                  </n-popconfirm>
                </n-space>
                <n-spin :show="loadingData">
                  <TableBody />
                </n-spin>
              </n-tab-pane>
            </n-tabs>
          </n-tab-pane>
        </n-tabs>
      </n-card>
      <n-empty v-if="!loadingTables && tables.length === 0" description="暂无数据表" />
    </n-spin>

    <n-card title="数据导出">
      <n-space>
        <n-button :loading="exporting === 'full'" @click="handleExport('full')">全盘导出</n-button>
        <n-button :loading="exporting === 'saas'" @click="handleExport('saas')">仅 SaaS 数据导出</n-button>
        <n-button :loading="exporting === 'dashboard'" @click="handleExport('dashboard')">仅 Dashboard 数据导出</n-button>
      </n-space>
    </n-card>

    <n-card title="数据导入">
      <n-space align="center">
        <n-upload :max="1" accept=".json" :default-upload="false" @change="handleFileChange" :file-list="uploadFileList">
          <n-button>选择备份文件</n-button>
        </n-upload>
        <n-select v-model:value="importMode" :options="importModeOptions" style="width: 200px;" />
        <n-button type="warning" :loading="importing" :disabled="!uploadFileList.length" @click="showImportModal = true">导入数据</n-button>
      </n-space>
      <n-text v-if="uploadFileList.length" depth="3" style="font-size: 12px; display: block; margin-top: 8px;">
        已选择: {{ uploadFileList[0]?.name }}
      </n-text>
    </n-card>

    <n-card title="数据库重建">
      <n-space align="center">
        <n-select v-model:value="rebuildScope" :options="rebuildScopeOptions" style="width: 200px;" />
        <n-switch v-model:value="rebuildImport" />
        <n-text>重建后恢复数据</n-text>
        <n-button type="error" :loading="rebuilding" @click="showRebuildModal = true">重建数据库</n-button>
      </n-space>
    </n-card>

    <n-modal v-model:show="showRebuildModal" preset="dialog" title="重建数据库" positive-text="确认重建" negative-text="取消" :loading="rebuilding" @positive-click="() => withPasswordConfirm(handleRebuild, '确认重建？')">
      <n-space vertical style="margin-top: 16px;">
        <n-alert type="error">
          <template #header>危险操作</template>
          <n-text>即将 {{ rebuildScopeLabel }}，所有{{ rebuildScope === 'full' ? '' : rebuildScope === 'astra' ? '课表' : '系统' }}表将被 DROP 后重建。</n-text>
        </n-alert>
        <n-text depth="3">重建后{{ rebuildImport ? '恢复数据' : '不恢复数据' }}</n-text>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showEditModal" preset="dialog" title="编辑记录" positive-text="保存" negative-text="取消" :loading="saving" @positive-click="() => withPasswordConfirm(handleSave, '确认保存修改？')">
      <n-form label-placement="top" :show-feedback="false" style="margin-top: 16px;">
        <n-form-item v-for="(value, key) in editForm" :key="key" :label="key">
          <n-input v-if="typeof value === 'string'" v-model:value="editForm[key]" type="textarea" :autosize="{ minRows: 1, maxRows: 6 }" />
          <n-input-number v-else-if="typeof value === 'number'" v-model:value="editForm[key]" style="width: 100%;" />
          <n-switch v-else-if="typeof value === 'boolean'" v-model:value="editForm[key]" />
          <n-input v-else v-model:value="editForm[key]" type="textarea" :autosize="{ minRows: 1, maxRows: 6 }" />
        </n-form-item>
      </n-form>
    </n-modal>

    <n-modal v-model:show="showCreateModal" preset="dialog" title="新增记录" positive-text="创建" negative-text="取消" :loading="saving" @positive-click="() => withPasswordConfirm(handleCreate, '确认创建新记录？')">
      <n-form label-placement="top" :show-feedback="false" style="margin-top: 16px;">
        <n-form-item v-for="key in tableColumns" :key="key" :label="key">
          <n-input v-model:value="createForm[key]" />
        </n-form-item>
      </n-form>
    </n-modal>

    <n-modal v-model:show="showImportModal" preset="dialog" title="确认导入" positive-text="确认导入" negative-text="取消" :loading="importing" @positive-click="() => withPasswordConfirm(handleImport, '确认导入数据？')">
      <n-space vertical style="margin-top: 16px;">
        <n-alert type="warning">
          <template #header>注意</template>
          <n-text>导入将覆盖同 ID 的已有记录，请确保已做好数据备份。</n-text>
        </n-alert>
        <n-text>导入模式: {{ importModeOptions.find(o => o.value === importMode)?.label }}</n-text>
      </n-space>
    </n-modal>

    <PasswordConfirmModal ref="passwordConfirmModal" @confirm="onPasswordConfirmed" />
  </n-space>
</template>

<script setup>
import {ref, onMounted, h, computed} from 'vue'
import {NSpace, NH1, NCard, NButton, NText, NEmpty, NSpin, NTabs, NTabPane, NDataTable, NModal, NPopconfirm, NForm, NFormItem, NInput, NInputNumber, NSwitch, NUpload, NAlert, NSelect, useMessage} from 'naive-ui'
import axios from 'axios'
import {getAPISRV} from '@/global.js'
import {getToken} from '@/auth.js'
import PasswordConfirmModal from '@/components/PasswordConfirmModal.vue'

const message = useMessage()
const tables = ref([])
const activeDb = ref('astra')
const activeTable = ref('')
const records = ref([])
const loadingTables = ref(false)
const loadingData = ref(false)
const saving = ref(false)
const exporting = ref('')
const importing = ref(false)
const uploadFileList = ref([])
const importMode = ref('full')
const importModeOptions = [
  {label: '全盘导入', value: 'full'},
  {label: '仅 SaaS 数据', value: 'saas'},
  {label: '仅 Dashboard 数据', value: 'dashboard'},
]
const rebuilding = ref(false)
const rebuildImport = ref(true)
const rebuildScope = ref('full')
const showRebuildModal = ref(false)
const rebuildScopeOptions = [
  {label: '全部重建', value: 'full'},
  {label: '仅课表数据库（Astra）', value: 'astra'},
  {label: '仅系统数据库（Dashboard）', value: 'sys'},
]
const rebuildScopeLabel = computed(() => rebuildScopeOptions.find(o => o.value === rebuildScope.value)?.label || '')
const showEditModal = ref(false)
const showCreateModal = ref(false)
const showImportModal = ref(false)
const editForm = ref({})
const createForm = ref({})
const editRowId = ref(null)
const tableColumns = ref([])
const passwordConfirmModal = ref(null)
const verifiedPassword = ref('')
let pendingAction = null

const SYS_TABLES = ['system_users', 'tenants']
const astraTables = computed(() => tables.value.filter(t => !SYS_TABLES.includes(t)))
const sysTables = computed(() => tables.value.filter(t => SYS_TABLES.includes(t)))

function withPasswordConfirm(action, hint = '') {
  pendingAction = action
  passwordConfirmModal.value?.open(hint)
}

function onPasswordConfirmed(pwd) {
  verifiedPassword.value = pwd
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

const SKIP_KEYS = ['id', 'created_at', 'updated_at']

const columns = computed(() => {
  if (records.value.length === 0) return []
  const keys = Object.keys(records.value[0])
  tableColumns.value = keys.filter(k => !SKIP_KEYS.includes(k))
  return [
    ...tableColumns.value.map(key => ({
      title: key,
      key,
      minWidth: 100,
      maxWidth: 300,
      resizable: true,
      ellipsis: { tooltip: true },
      render(row) {
        const val = row[key]
        if (val === null || val === undefined) return '-'
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      }
    })),
    {
      title: '操作',
      key: 'actions',
      width: 120,
      resizable: true,
      render(row) {
        return h(NSpace, {size: 4}, {
          default: () => [
            h(NButton, {size: 'tiny', onClick: () => openEdit(row)}, {default: () => '编辑'}),
            h(NPopconfirm, {onPositiveClick: () => withPasswordConfirm((pwd) => handleDelete(row.id, pwd), '确认删除此记录？')}, {
              default: () => '确认删除？',
              trigger: () => h(NButton, {size: 'tiny', type: 'error'}, {default: () => '删除'})
            })
          ]
        })
      }
    }
  ]
})

function TableBody() {
  return h(NSpace, {vertical: true}, {
    default: () => [
      h('div', {style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;'}, [
        h(NText, {depth: 3}, {default: () => `共 ${records.value.length} 条记录`}),
        h(NButton, {type: 'primary', size: 'small', onClick: () => showCreateModal.value = true}, {default: () => '新增记录'})
      ]),
      h(NDataTable, {
        columns: columns.value,
        data: records.value,
        pagination: {pageSize: 15},
        virtualX: true,
        columnResizable: true,
        bordered: true,
      })
    ]
  })
}

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

function handleDbChange() {
  const list = activeDb.value === 'astra' ? astraTables.value : sysTables.value
  if (list.length > 0) {
    activeTable.value = list[0]
    fetchTableData(list[0])
  } else {
    activeTable.value = ''
    records.value = []
  }
}

function handleTableChange(name) {
  fetchTableData(name)
}

async function fetchTableData(tableName) {
  loadingData.value = true
  records.value = []
  try {
    const resp = await axios.get(`${getAPISRV()}/web/data/${tableName}`, {headers: {Authorization: `Bearer ${getToken()}`}})
    records.value = resp.data.data || []
  } catch (e) {
    message.error(`获取 ${tableName} 数据失败`)
  } finally {
    loadingData.value = false
  }
}

async function handleSave(pwd) {
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
    await axios.put(`${getAPISRV()}/web/data/${activeTable.value}/${editRowId.value}`, payload, {headers: getAuthHeaders(pwd)})
    message.success('保存成功')
    showEditModal.value = false
    fetchTableData(activeTable.value)
  } catch (e) {
    message.error(e?.response?.data?.error || e?.response?.data?.detail || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id, pwd) {
  try {
    await axios.delete(`${getAPISRV()}/web/data/${activeTable.value}/${id}`, {headers: getAuthHeaders(pwd)})
    message.success('删除成功')
    fetchTableData(activeTable.value)
  } catch (e) {
    message.error('删除失败')
  }
}

async function handleCreate(pwd) {
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
    await axios.post(`${getAPISRV()}/web/data/${activeTable.value}`, payload, {headers: getAuthHeaders(pwd)})
    message.success('创建成功')
    showCreateModal.value = false
    createForm.value = {}
    fetchTableData(activeTable.value)
  } catch (e) {
    message.error(e?.response?.data?.error || e?.response?.data?.detail || '创建失败')
  } finally {
    saving.value = false
  }
}

async function handleExport(mode) {
  exporting.value = mode
  try {
    const resp = await axios.get(`${getAPISRV()}/web/backup/export`, {
      params: {mode},
      headers: {Authorization: `Bearer ${getToken()}`}
    })
    const blob = new Blob([JSON.stringify(resp.data, null, 2)], {type: 'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-${mode}-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  } catch (e) {
    message.error('导出失败')
  } finally {
    exporting.value = ''
  }
}

function handleFileChange({fileList}) {
  uploadFileList.value = fileList
}

async function handleRebuild(pwd) {
  rebuilding.value = true
  showRebuildModal.value = false
  try {
    await axios.post(`${getAPISRV()}/web/database/rebuild`, {
      scope: rebuildScope.value,
      import: rebuildImport.value,
    }, {
      headers: getAuthHeaders(pwd)
    })
    message.success('数据库重建成功')
    await fetchTables()
  } catch (e) {
    message.error(e?.response?.data?.error || e?.response?.data?.detail || '重建失败')
  } finally {
    rebuilding.value = false
  }
}

async function handleDropTable(tableName, pwd) {
  try {
    await axios.delete(`${getAPISRV()}/web/database/drop/${tableName}`, {
      headers: getAuthHeaders(pwd)
    })
    message.success(`表 ${tableName} 已删除并重建`)
    await fetchTables()
  } catch (e) {
    message.error(e?.response?.data?.error || e?.response?.data?.detail || '删除失败')
  }
}

async function handleImport(pwd) {
  if (!uploadFileList.value.length) {
    message.warning('请先选择备份文件')
    return
  }

  importing.value = true
  try {
    const file = uploadFileList.value[0].file
    const text = await file.text()
    const data = JSON.parse(text)
    data.meta = data.meta || {}
    data.meta.mode = importMode.value

    await axios.post(`${getAPISRV()}/web/backup/import`, data, {
      headers: getAuthHeaders(pwd)
    })
    message.success('导入成功')
    uploadFileList.value = []
    fetchTableData(activeTable.value)
  } catch (e) {
    message.error(e?.response?.data?.error || e?.response?.data?.detail || '导入失败')
  } finally {
    importing.value = false
  }
}

async function fetchTables() {
  loadingTables.value = true
  try {
    const resp = await axios.get(`${getAPISRV()}/web/data/tables`, {headers: {Authorization: `Bearer ${getToken()}`}})
    tables.value = resp.data.data || []
    if (astraTables.value.length > 0) {
      activeTable.value = astraTables.value[0]
      await fetchTableData(astraTables.value[0])
    }
  } catch (e) {
    message.error('获取表列表失败')
  } finally {
    loadingTables.value = false
  }
}

onMounted(fetchTables)
</script>
