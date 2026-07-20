// 網站識別（本地常數）。
// logo / favicon / 站名幾乎不變且由工程師維護，直接 bundle 進前端，
// 免去 API round-trip 與首屏 FOUC。會變動的設定（LINE ID 等）仍走 Directus，見 stores/settings.js。
import logo from '@/assets/gts-lockup-horizontal-light.svg'
import logoDark from '@/assets/gts-lockup-horizontal-dark.svg'

export const site = {
  name: '金同心實業',
  logo,      // 淺底深墨（navbar 白玻璃底用）
  logoDark,  // 深底淺墨（深色背景用）
}
