// 動態設定 <head> 的 meta（找不到就建立）。
// 注意：這是 SPA 於 runtime 改 meta，對「會執行 JS 的環境」有效（瀏覽器分頁、書籤、
// 部分爬蟲）。多數社群分享爬蟲（LINE/FB）只讀初始 HTML，不執行 JS，因此
// per-product 的社群分享卡若要精準，需 SSR / 預渲染，非本函式所能涵蓋。
export function setMeta(key, content, attr = 'name') {
    if (!content) return
    let el = document.head.querySelector(`meta[${attr}="${key}"]`)
    if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
    }
    el.setAttribute('content', content)
}
