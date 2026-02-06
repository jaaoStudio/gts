import { createDirectus, rest } from '@directus/sdk';

// 從環境變數讀取 Directus 後端網址
const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL;

// 如果是相對路徑 (如 /api)，則自動補上當前網站的 Origin，避免 SDK 報錯
const apiUrl = DIRECTUS_URL.startsWith('/')
  ? `${window.location.origin}${DIRECTUS_URL}`
  : DIRECTUS_URL;

const directus = createDirectus(apiUrl).with(rest());

export default directus;

export const getAssetUrl = (id) => {
  if (!id) return null;
  return `${DIRECTUS_URL}/assets/${id}`;
};
