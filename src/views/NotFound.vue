<template>
  <PageShell
    title="找不到這個頁面"
    eyebrow="404"
    lead="這個網址可能已失效或是輸入有誤。"
  >
    <div class="doc">
      <p>您可以試試：</p>
      <ul>
        <li><router-link to="/products">瀏覽所有商品</router-link></li>
        <li><router-link to="/">回到首頁</router-link></li>
        <li>
          若您是從其他網站或舊連結進來的，歡迎<router-link to="/contact">告訴我們</router-link>
          是哪個連結失效，我們會處理。
        </li>
      </ul>
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '../components/PageShell.vue'
</script>
