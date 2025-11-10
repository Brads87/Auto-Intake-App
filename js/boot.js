// -----------------------------
// Service Worker + Version footer
// -----------------------------
(function () {
    // Helper for updating footer text
  function setFooterVersion(v) {
    const el = document.getElementById('app-version');
    if (el) el.textContent = `Auto Service Intake — ${v || 'version unavailable'}`;
  }

  // ---- Version footer (runs even on file://) ----
    async function updateFooterVersion() {
    try {
      const text = await fetch(`sw.js?ts=${Date.now()}`, { cache: 'no-store' }).then(r => r.text());
      const match = text.match(/APP_VERSION\s*=\s*["'](.+?)["']/);
      setFooterVersion(match ? match[1] : null);
    } catch (e) {
      setFooterVersion(null);
      console.warn('Version fetch failed:', e);
    }
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateFooterVersion);
  } else {
    updateFooterVersion();
  }

  // ---- Service worker (only works on http(s)/localhost, not file://) ----
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
            // Listen for version replies from the service worker
      navigator.serviceWorker.addEventListener('message', (evt) => {
        if (evt.data && evt.data.version) setFooterVersion(evt.data.version);
      });

      // Ask the active service worker (if any) for the version
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('getVersion');
      }


      // Prompt when an update is ready
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('A new version of Auto Service Intake is available. Reload now?')) {
              window.location.reload();
            }
          }
        });
      });

      // If a new worker is already waiting at load
      if (reg.waiting && navigator.serviceWorker.controller) {
        if (confirm('A new version of Auto Service Intake is available. Reload now?')) {
          window.location.reload();
        }
      }
    } catch (e) {
      // Expected on file:// — SW requires http(s)/localhost
      console.warn('SW registration failed:', e);
    }
  });
})();
