import { createDirectus, rest, authentication } from '@directus/sdk';

// 從環境變數讀取 Directus 後端網址
const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL;

// 如果是相對路徑 (如 /api)，則自動補上當前網站的 Origin，避免 SDK 報錯
const apiUrl = DIRECTUS_URL.startsWith('/')
  ? `${window.location.origin}${DIRECTUS_URL}`
  : DIRECTUS_URL;

// session 模式：credential 為 Directus 設定的 httpOnly session cookie，瀏覽器自動夾帶，
// access token 完全不進 JS / localStorage（防 XSS 竊 token）。
// ⚠️ 需搭配後端：AUTH_GOOGLE_MODE=session、CORS 允許本站 origin 且 credentials=true、
//    SESSION_COOKIE_SECURE=true、跨網域時 SESSION_COOKIE_SAMESITE=None（同網域可 Lax）。
// Directus 對讀取回應帶 `Cache-Control: private, max-age=300`，會讓瀏覽器在 5 分鐘內
// 直接吃快取（存檔後重整看到舊資料的元凶）。用 cache:'no-cache' 強制每次都帶 ETag
// 重新驗證：資料沒變回 304（便宜），變了回 200（最新），不再有 stale 視窗。
const directus = createDirectus(apiUrl)
  .with(authentication('session', { credentials: 'include', autoRefresh: true }))
  .with(rest({
    credentials: 'include',
    onRequest: (options) => ({ ...options, cache: 'no-cache' }),
  }));

export default directus;

/**
 * 取得圖片網址
 */
export const getAssetUrl = (id) => {
  if (!id) return null;
  // 如果 DIRECTUS_URL 是相對路徑 (/api)，需要轉為完整的 Public URL
  const publicUrl = import.meta.env.VITE_DIRECTUS_PUBLIC_URL || DIRECTUS_URL;
  return `${publicUrl}/assets/${id}`;
};
