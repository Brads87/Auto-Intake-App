// js/boot.js v1.9.1
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js?v=1.9.1');
  });
}
