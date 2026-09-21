export function useCaptureAdmin(pathname, search = '', hash = '') {
  const isAuthAction = typeof hash === 'string' && /type=(?:invite|recovery)/.test(hash);
  if (isAuthAction) return true;
  const path = (pathname || '').replace(/\/+$/, '') || '/';
  return path === '/admin/capture' || (path === '/admin' && new URLSearchParams(search).get('legacy') !== '1');
}

export function navigateTo(url) {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new Event('decorbeats:navigate'));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

