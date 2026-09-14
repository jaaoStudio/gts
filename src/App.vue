<template>
  <router-view />
  <LineButton />
  <CookieConsent v-if="analyticsConfigured" />
</template>

<script setup>
import { onMounted } from 'vue'
import { useSettingsStore } from './stores/settings'
import LineButton from './components/LineButton.vue'
import CookieConsent from './components/CookieConsent.vue'
import { analyticsConfigured } from './utils/analytics'

// 全站啟動時載入後台設定（LINE ID）。識別類已本地化，見 config/site.js。
onMounted(() => {
  useSettingsStore().fetchSettings()
})
</script>
