<template>
  <n-space vertical>
    <n-h1>Dashboard</n-h1>
    <n-card title="系统概览">
      <n-space vertical>
        <n-statistic label="系统用户" :value="stats.systemUsers" />
        <n-statistic label="租户数量" :value="stats.tenants" />
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {NSpace, NH1, NCard, NStatistic} from 'naive-ui'
import axios from 'axios'
import {getAPISRV} from '@/global.js'
import {getToken} from '@/auth.js'

const stats = ref({systemUsers: 0, tenants: 0})

onMounted(async () => {
  try {
    const [usersResp, tenantsResp] = await Promise.all([
      axios.get(`${getAPISRV()}/web/system-users`, {headers: {Authorization: `Bearer ${getToken()}`}}),
      axios.get(`${getAPISRV()}/web/tenants`, {headers: {Authorization: `Bearer ${getToken()}`}})
    ])
    stats.value.systemUsers = usersResp.data.data?.length || 0
    stats.value.tenants = tenantsResp.data.data?.length || 0
  } catch (e) {
    console.error(e)
  }
})
</script>
