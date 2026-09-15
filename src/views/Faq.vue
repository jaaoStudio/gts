<template>
  <PageShell
    title="常見問題"
    eyebrow="FAQ"
    lead="整理了訂購前後最常被問到的問題。若沒有找到答案，歡迎直接電話或 LINE 詢問。"
  >
    <div class="doc">
      <h3>要怎麼訂購？</h3>
      <p>兩種方式都可以：</p>
      <ul>
        <li>
          <strong>線上送出訂購單</strong>：在商品頁把品項<strong>加入訂購單</strong>，
          填好聯絡與送貨資訊後送出（送出時需以 Google 帳號登入）。送出後您會拿到一組訂購單號。
        </li>
        <li><strong>電話或 LINE</strong>：直接與我們聯繫確認品項、數量與價格。</li>
      </ul>
      <p>
        本站<strong>不提供線上刷卡</strong>。款項一律等我們確認金額之後才匯款，
        <strong>確認前不需要先付款</strong>。
      </p>

      <h3>送出訂購單之後呢？</h3>
      <p>
        我們會核對品項與庫存、確認每項的實際單價，再通知您應付金額。您可以隨時到
        <router-link to="/account/orders">我的訂購單</router-link>查看進度：
        <strong>待確認</strong> → <strong>待付款</strong> → <strong>已付款</strong> → <strong>已出貨</strong>。
        進入「待付款」後，匯款資訊會顯示在那張訂購單的頁面上；匯款完成後可在同一頁回報
        帳號末五碼，方便我們對帳。
      </p>

      <h3>網站上的價格是實際售價嗎？</h3>
      <p>網站標示為<strong>參考價</strong>。實際售價會依數量、規格與當下供貨狀況報價，以雙方確認為準。</p>

      <h3>訂購單上的小計就是我要付的金額嗎？</h3>
      <p>
        不是。那是依<strong>參考價</strong>估算的金額，運費也只是<strong>預估值</strong>（以單箱計算）。
        實際應付金額以我們確認後的報價為準，運費會在那時依實際箱數一併確認。
      </p>

      <h3>沒有標價的商品可以一起訂嗎？</h3>
      <p>
        可以。標示<strong>詢價</strong>的品項能和有標價的品項放在同一張訂購單，我們會在確認時一併報價。
      </p>

      <h3>可以開立統一發票 / 打統編嗎？</h3>
      <p>可以。請於會員專區填寫<strong>公司名稱與統一編號</strong>，或於詢價時告知，我們會依此開立單據。</p>

      <h3>商品顯示缺貨怎麼辦？</h3>
      <p>顯示「暫時缺貨」的品項多數仍可<strong>預訂</strong>。請與我們聯繫確認補貨時間。</p>

      <h3>有提供宅配 / 貨運嗎？運費怎麼算？</h3>
      <p>
        可安排貨運或宅配。
        <template v-if="rule">
          運費一箱 <strong class="font-mono">{{ feeText }}</strong>，單筆滿
          <strong><span class="font-mono">{{ thresholdText }}</span> 免運</strong>；
        </template>
        需分箱寄送、重物與大材積商品另行報價，詳見
        <router-link to="/shipping">運送與退貨</router-link>。
      </p>

      <h3>買到的商品有問題可以退換嗎？</h3>
      <p>新品若有瑕疵，符合條件可辦理退換，詳見 <router-link to="/shipping">運送與退貨</router-link> 與 <router-link to="/warranty">保固資訊</router-link>。</p>
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
