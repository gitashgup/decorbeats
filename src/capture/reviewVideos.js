export const MAX_PRODUCT_VIDEOS = 6;
export function productVideoEntries(videos = {}) {
  return Object.entries(videos).filter(([, video]) => video?.url).sort(([a], [b]) => a.localeCompare(b));
}
