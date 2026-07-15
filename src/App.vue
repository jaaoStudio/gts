<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useSettingsStore } from './stores/settings'

// 全站啟動時載入網站設定（logo / favicon / 站名）
onMounted(() => {
  useSettingsStore().fetchSettings()
})
</script>
