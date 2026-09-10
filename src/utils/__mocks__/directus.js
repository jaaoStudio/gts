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

export const getAssetUrl = (id) => (id ? `https://assets.test/${id}` : null)
