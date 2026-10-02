export async function shareCatalogue(file, navigatorLike = navigator) {
  try {
  if (typeof navigatorLike.share !== 'function' || typeof navigatorLike.canShare !== 'function' || !navigatorLike.canShare({ files: [file] })) return 'unsupported';
  await navigatorLike.share({ files: [file], title: 'Decorbeats catalogue' }); return 'shared'; }
  catch (error) { if (error.name === 'AbortError') return 'cancelled'; return 'failed'; }
}
export function downloadCatalogue(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  // Retain long enough for Safari to start reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
