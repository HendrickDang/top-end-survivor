// Builds a shareable score card (PNG) with the score, badges and a QR code back to the game.
import { mascotSVG } from './art.js';
import { BADGES } from './badges.js';

export function playUrl() {
  const c = window.TES_CONFIG || {};
  if (c.PUBLIC_URL) return c.PUBLIC_URL;
  if (window.Capacitor) return c.ANDROID_API_BASE || location.origin; // inside the Android app
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

export async function makeCard({ score, survived, rounds, name, badgeIds = [] }) {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  try { await document.fonts?.load('800 80px "Baloo 2"'); } catch { /* fallback font */ }
  const F = (w, s) => `${w} ${s}px "Baloo 2", "Trebuchet MS", sans-serif`;

  // sunset background + ground
  const grd = c.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#f7b267'); grd.addColorStop(.55, '#f4845f'); grd.addColorStop(1, '#c8412f');
  c.fillStyle = grd; c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(820, 230, 110, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#6b3b1f'; c.fillRect(0, H - 170, W, 170);

  // mascot
  try { const m = await loadImg(svgUrl(mascotSVG('happy'))); c.drawImage(m, 60, 60, 300, 300); } catch { /* ignore */ }

  c.textAlign = 'left'; c.lineJoin = 'round';
  const outlined = (str, x, y, size, fill, w = 12) => {
    c.font = F(800, size); c.strokeStyle = '#1d1a16'; c.lineWidth = w; c.strokeText(str, x, y); c.fillStyle = fill; c.fillText(str, x, y);
  };
  outlined('Top End', 390, 190, 110, '#fffaf0');
  outlined('Survivor', 390, 300, 120, '#ffe9a8');

  // score panel
  c.fillStyle = '#fffaf0'; c.strokeStyle = '#1d1a16'; c.lineWidth = 10;
  roundRect(c, 70, 410, W - 140, 520, 40); c.fill(); c.stroke();
  c.textAlign = 'center'; c.fillStyle = '#1d1a16';
  c.font = F(700, 52); c.fillText(name ? `${name} scored` : 'I scored', W / 2, 500);
  c.font = F(800, 230); c.fillStyle = '#b5641a'; c.fillText(String(score), W / 2, 700);
  c.font = F(700, 50); c.fillStyle = '#1d1a16';
  c.fillText(`Survived ${survived} of ${rounds} Top End dangers`, W / 2, 780);
  const icons = BADGES.filter(b => badgeIds.includes(b.id)).map(b => b.icon).join(' ');
  c.font = F(500, 64); c.fillText(icons || '🐊 🪼 🌀 🔥', W / 2, 880);

  // call to action + QR
  c.textAlign = 'left';
  outlined('Can you beat me?', 80, 1030, 76, '#fffaf0', 10);
  c.font = F(700, 40); c.fillStyle = '#fffaf0';
  c.fillText('Scan to play. Learn real NT safety.', 80, 1090);
  c.font = F(700, 34); c.fillText('CDU IT Code Fair 2026 · Team CAP003', 80, H - 70);
  try {
    const base = (window.TES_CONFIG && window.TES_CONFIG.API_BASE) || '';
    const qr = await loadImg(`${base}/api/qr.svg?url=${encodeURIComponent(playUrl())}`);
    c.fillStyle = '#fffaf0'; roundRect(c, W - 330, 960, 260, 260, 24); c.fill();
    c.drawImage(qr, W - 315, 975, 230, 230);
  } catch { /* offline: card works without the QR */ }

  return await new Promise(res => cv.toBlob(res, 'image/png'));
}

export async function shareCard(info) {
  const blob = await makeCard(info);
  const file = new File([blob], 'top-end-survivor-score.png', { type: 'image/png' });
  const text = `I scored ${info.score} on Top End Survivor! Can you beat me? ${playUrl()}`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text, title: 'Top End Survivor' }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
