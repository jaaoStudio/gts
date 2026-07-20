<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useSettingsStore } from './stores/settings'

// 全站啟動時載入後台設定（LINE ID）。識別類已本地化，見 config/site.js。
onMounted(() => {
  useSettingsStore().fetchSettings()
})
</script>
