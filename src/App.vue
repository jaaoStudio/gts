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

// 沒設 VITE_GA_ID 就沒有任何追蹤，banner 也就沒有存在意義（本機 dev 即是此狀態）
const analyticsConfigured = !!import.meta.env.VITE_GA_ID

// 全站啟動時載入後台設定（LINE ID）。識別類已本地化，見 config/site.js。
onMounted(() => {
  useSettingsStore().fetchSettings()
})
</script>
