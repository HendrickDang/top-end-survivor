// Runtime configuration.
// API_BASE: where the leaderboard server lives.
//   - Web build served by our own server: leave '' (same origin).
//   - Android (Capacitor) build: set to your deployed server URL,
//     e.g. 'https://top-end-survivor.onrender.com'.
// Can also be overridden at runtime with ?api=https://... (saved to localStorage).
window.TES_CONFIG = {
  API_BASE: '',
  // Used only inside the Android app. Change this after you deploy the server.
  ANDROID_API_BASE: 'https://top-end-survivor.onrender.com',
  // Public link to the game (used on the share card QR). Leave '' to use this page's address.
  PUBLIC_URL: '',
  APP_VERSION: '1.1.0'
};
(function () {
  try {
    var q = new URLSearchParams(location.search).get('api');
    if (q) localStorage.setItem('tes_api', q);
    var saved = localStorage.getItem('tes_api');
    if (saved) window.TES_CONFIG.API_BASE = saved;
  } catch (e) { /* storage blocked: keep default */ }
  // Inside the Android app, the page origin is https://localhost - fall back to the deployed server.
  if (!window.TES_CONFIG.API_BASE && /^(capacitor:|https?:\/\/localhost$)/.test(location.origin) && window.Capacitor) {
    window.TES_CONFIG.API_BASE = window.TES_CONFIG.ANDROID_API_BASE || '';
  }
})();
