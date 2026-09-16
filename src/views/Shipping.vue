<template>
  <PageShell
    title="運送與退貨"
    eyebrow="Shipping & Returns"
    updated="2026-09-15"
    lead="出貨、運費與退換貨說明，實際以雙方確認為準。"
  >
    <div class="doc">
      <h2>出貨時間</h2>
      <p>現貨於<strong>款項確認後</strong>盡速出貨；大量或特殊規格的交期，確認金額時一併告知。</p>

      <h2>運費</h2>
      <ul>
        <li v-if="rule">
          宅配<strong>一箱 <span class="font-mono">{{ feeText }}</span></strong>，
          單筆<strong>滿 <span class="font-mono">{{ thresholdText }}</span> 免運</strong>。
        </li>
        <li v-else>運費於確認金額時一併告知。</li>
        <li>
          單箱約長寬高總和 <span class="font-mono">90</span> 公分、<span class="font-mono">20</span> 公斤以內，
          需<strong>分箱</strong>時依實際箱數調整。
        </li>
        <li>重物、大材積或偏遠地區另行報價。</li>
        <!-- 「未達門檻」這個條件不能省：標價部分自己就已達門檻時，訂購單頁會直接
             顯示免運（見 ADR 0003 第 2 條），這裡若寫成所有詢價單都待確認就對不上 -->
        <li><strong>未達免運門檻</strong>且含<strong>待報價品項</strong>時，運費於報價時一併確認。</li>
        <li>大宗訂購或自取可另行洽談。</li>
      </ul>

      <!-- 數字一律從 utils/orderTotals 的 CVS 讀，不在文案裡重打——同 useShippingCopy -->
      <h2>7-11 超商取貨付款</h2>
      <ul>
        <li>
          運費 <strong class="font-mono">{{ cvs.feeRange }}</strong> 元，依代收金額分級，
          <strong>不適用免運門檻</strong>。
        </li>
        <li>
          尺寸限制比宅配嚴格：最長邊 <span class="font-mono">{{ cvs.size.longestCm }}</span> 公分、
          長寬高合計 <span class="font-mono">{{ cvs.size.totalCm }}</span> 公分、
          <span class="font-mono">{{ cvs.size.weightKg }}</span> 公斤以內。超過的品項只能走宅配。
        </li>
        <li>代收金額上限 <span class="font-mono">{{ cvs.maxCollectableText }}</span>，超過請改用宅配。</li>
        <li>
          包裹到門市會以簡訊通知，請務必填<strong>手機</strong>。
          <strong>{{ cvs.holdDays }} 天內未取貨會退回</strong>，該筆運費仍會產生。
        </li>
      </ul>

      <h2>缺貨與預訂</h2>
      <p>顯示「暫時缺貨」的品項多數可<strong>預訂</strong>，到貨後為您安排出貨。</p>

      <h2>驗收</h2>
      <p>收到後請儘速確認品項、數量與外觀。如有短缺或運送破損，請保留外包裝並儘速與我們聯繫。</p>

      <h2>退換貨</h2>
      <ul>
        <li><strong>新品瑕疵</strong>：非人為因素，符合條件可辦理退換。</li>
        <li>已使用、人為損壞或客製品，恕不接受退換。</li>
        <li>辦理前請先與我們聯繫確認流程。</li>
      </ul>
    </div>
  </PageShell>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import PageShell from '../components/PageShell.vue'
import { useShippingCopy } from '../composables/useShippingCopy'

const settingsStore = useSettingsStore()
const { rule, feeText, thresholdText, cvs } = useShippingCopy()

onMounted(() => settingsStore.fetchSettings())
</script>
