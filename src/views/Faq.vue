<template>
  <PageShell
    title="常見問題"
    eyebrow="FAQ"
    lead="沒找到答案，歡迎直接電話或 LINE 問我們。"
  >
    <div class="doc">
      <h3>要怎麼訂購？</h3>
      <p>
        在商品頁<strong>加入訂購單</strong>，填好聯絡與送貨資訊送出（需 Google 帳號登入）；
        或聯絡我們。
      </p>
      <p>本站不提供線上刷卡，<strong>確認金額前不用先付款</strong>。</p>

      <h3>送出之後呢？</h3>
      <p>
        我們確認品項、庫存與單價後通知您金額。進度可在
        <router-link to="/account/orders">我的訂購單</router-link>查看。
      </p>
      <p>
        <strong>宅配</strong>：待確認 → 待付款 → 已付款 → 已出貨，匯款資訊會在「待付款」時顯示在那張單上。<br />
        <strong>超商取貨付款</strong>：待確認 → 已確認 → 已出貨，不必匯款，取貨時付給店員即可。
      </p>

      <h3>可以寄超商嗎？</h3>
      <p>
        可以，訂購時選<strong>「7-11 超商取貨付款」</strong>即可，取貨時再付款。
        但五金工具常超過超商的尺寸限制，<strong>能不能寄要看品項</strong>——
        不能寄的單，訂購單頁上那個選項會是灰的並說明原因。詳見
        <router-link to="/shipping">運送與退貨</router-link>。
      </p>

      <h3>網站上的價格是實際售價嗎？</h3>
      <p>是<strong>參考價</strong>，實際售價依數量、規格與供貨狀況報價。</p>

      <h3>訂購單的小計就是應付金額嗎？</h3>
      <p>不是。小計依參考價估算，運費也只是預估（以單箱計）。以我們確認後的報價為準。</p>

      <h3>沒標價的商品可以一起訂嗎？</h3>
      <p>可以。<strong>詢價</strong>品項能和有標價的放同一張單，確認時一併報價。</p>

      <h3>可以開發票、打統編嗎？</h3>
      <p>可以。在會員專區填公司名稱與統編，或訂購時告知。</p>

      <h3>顯示缺貨怎麼辦？</h3>
      <p>多數仍可<strong>預訂</strong>，跟我們確認補貨時間即可。</p>

      <h3>運費怎麼算？</h3>
      <p>
        <template v-if="rule">
          一箱 <strong class="font-mono">{{ feeText }}</strong>，滿
          <strong class="font-mono">{{ thresholdText }}</strong> 免運；
        </template>
        分箱、重物與大材積另計，詳見<router-link to="/shipping">運送與退貨</router-link>。
      </p>

      <h3>可以退換嗎？</h3>
      <p>
        新品瑕疵符合條件可辦理，詳見<router-link to="/shipping">運送與退貨</router-link>與
        <router-link to="/warranty">保固資訊</router-link>。
      </p>
    </div>
  </PageShell>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import PageShell from '../components/PageShell.vue'
import { useShippingCopy } from '../composables/useShippingCopy'

const settingsStore = useSettingsStore()
const { rule, feeText, thresholdText } = useShippingCopy()

onMounted(() => settingsStore.fetchSettings())
</script>
