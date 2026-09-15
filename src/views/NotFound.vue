<template>
  <PageShell
    title="找不到這個頁面"
    eyebrow="404"
    lead="這個網址可能已經失效、被更改過，或是輸入時有誤。"
  >
    <div class="doc">
      <p>您可以試試：</p>
      <ul>
        <li><router-link to="/products">瀏覽所有商品</router-link>——用搜尋或分類找您要的品項。</li>
        <li><router-link to="/">回到首頁</router-link>看看目前的精選。</li>
        <li>
          若您是從其他網站或舊連結進來的，歡迎<router-link to="/contact">告訴我們</router-link>
          是哪個連結失效，我們會處理。
        </li>
      </ul>
      <p>
        如果您要找的是某項商品，直接用上方的搜尋功能通常最快；
        找不到的品項也可以<router-link to="/contact">直接向我們詢價</router-link>。
      </p>
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '../components/PageShell.vue'
</script>
