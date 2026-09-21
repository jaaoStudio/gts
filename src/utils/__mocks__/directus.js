/**
 * 共用的 directus 測試替身。任何測試檔只要 `vi.mock('../utils/directus')`
 * （不帶 factory），vitest 就會自動用這一份。
 *
 * 為什麼需要它：真的 utils/directus 在模組載入時就用 import.meta.env 建 SDK
 * client，node 測試環境沒有那些變數會直接爆掉。所以每個「碰得到 directus 的
 * 模組」的測試都得換掉它——先前是每個測試檔各自寫一份 factory，連假的 asset
 * 主機名都複製一次，contract 一改就會有檔案還在斷言舊的 URL 形狀。
 */
export default {}

// ⚠️ 要與 utils/directus.js 的 ASSET_PRESETS 逐鍵一致。少一個 key 時，讀它的程式
// 會拿到 undefined、組出不帶 ?key= 的網址，而測試多半沒有斷言到那一段——全綠但已經
// 在說謊。加預設集時這裡要一起加。
export const ASSET_PRESETS = {
    thumb: 'thumb', card: 'card', detail: 'detail', full: 'full', social: 'social',
}

export const getAssetUrl = (id, preset) =>
    id ? `https://assets.test/${id}${preset ? `?key=${preset}` : ''}` : null
