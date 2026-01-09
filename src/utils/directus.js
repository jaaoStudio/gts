import { createDirectus, rest } from '@directus/sdk';

const directus = createDirectus('https://gts-backend.jaao.tw/').with(rest());

export default directus;

export const getAssetUrl = (id) => {
  if (!id) return null;
  return `https://gts-backend.jaao.tw/assets/${id}`;
};
