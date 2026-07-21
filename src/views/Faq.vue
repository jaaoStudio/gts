<template>
  <PageShell
    title="常見問題"
    eyebrow="FAQ"
    lead="整理了訂購前後最常被問到的問題。若沒有找到答案，歡迎直接電話或 LINE 詢問。"
  >
    <div class="doc">
      <h3>要怎麼訂購？</h3>
      <p>於商品頁看到需要的品項後，點選<strong>電話詢價</strong>或 <strong>LINE 詢問</strong>與我們聯繫，確認品項、數量與價格後即可安排出貨。本站不需線上刷卡。</p>

      <h3>網站上的價格是實際售價嗎？</h3>
      <p>網站標示為<strong>參考價</strong>。實際售價會依數量、規格與當下供貨狀況報價，以雙方確認為準。</p>

      <h3>可以開立統一發票 / 打統編嗎？</h3>
      <p>可以。請於會員專區填寫<strong>公司名稱與統一編號</strong>，或於詢價時告知，我們會依此開立單據。</p>

      <h3>商品顯示缺貨怎麼辦？</h3>
      <p>顯示「暫時缺貨」的品項多數仍可<strong>預訂</strong>。請與我們聯繫確認補貨時間。</p>

      <h3>有提供宅配 / 貨運嗎？運費怎麼算？</h3>
      <p>可安排貨運或宅配，運費依重量、材積與地區計算，詳見 <router-link to="/shipping">運送與退貨</router-link>。</p>

      <h3>買到的商品有問題可以退換嗎？</h3>
      <p>新品若有瑕疵，符合條件可辦理退換，詳見 <router-link to="/shipping">運送與退貨</router-link> 與 <router-link to="/warranty">保固資訊</router-link>。</p>
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '../components/PageShell.vue'
</script>
