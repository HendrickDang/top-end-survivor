// Runtime configuration.
// API_BASE: where the leaderboard server lives.
//   - Web build served by our own server: leave '' (same origin).
//   - Android (Capacitor) build: set to your deployed server URL,
//     e.g. 'https://top-end-survivor.onrender.com'.
window.TES_CONFIG = {
  API_BASE: '',
  // Used only inside the Android app. Change this after you deploy the server.
  ANDROID_API_BASE: 'https://top-end-survivor.onrender.com',
  // Public link to the game (used on the share card QR). Leave '' to use this page's address.
  PUBLIC_URL: '',
  // People's Choice voting link from the IT Code Fair committee. When set, the booth screen shows a
  // "Vote for us" QR and the game-over screen shows a vote button. Leave '' until you have it.
  VOTE_URL: '',
  APP_VERSION: '1.7.0'
};
(function () {
  // Security: the server address used to be changeable with a ?api= link and was remembered,
  // so a crafted link could point a phone at someone else's server for good. Not any more:
  // the address comes only from this file. Clear any value saved by an older version.
  try { localStorage.removeItem('tes_api'); } catch (e) { /* storage blocked */ }
  // Inside the Android app, the page origin is https://localhost - fall back to the deployed server.
  if (!window.TES_CONFIG.API_BASE && /^(capacitor:|https?:\/\/localhost$)/.test(location.origin) && window.Capacitor) {
    window.TES_CONFIG.API_BASE = window.TES_CONFIG.ANDROID_API_BASE || '';
  }
})();
