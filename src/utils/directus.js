import { createDirectus, rest } from '@directus/sdk';

// 從環境變數讀取 Directus 後端網址
const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL;

const directus = createDirectus(DIRECTUS_URL).with(rest());

export default directus;

export const getAssetUrl = (id) => {
  if (!id) return null;
  return `${DIRECTUS_URL}/assets/${id}`;
};
