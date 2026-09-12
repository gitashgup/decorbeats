export function useCaptureAdmin(pathname, search = '') {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/admin/capture' || (path === '/admin' && new URLSearchParams(search).get('legacy') !== '1');
}
