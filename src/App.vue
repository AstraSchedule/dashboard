<template>
  <n-config-provider :theme="theme" date-locale="dateZhCN" locale="zhCN">
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import { useOsTheme, darkTheme, NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'

const osThemeRef = useOsTheme()
const theme = computed(() => osThemeRef.value === 'dark' ? darkTheme : null)
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>
