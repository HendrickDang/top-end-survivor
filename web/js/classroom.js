// Classroom mode, student side. A teacher's join link (/?class=CODE) puts this device in the class:
// every game and quick check is then shared with the teacher's dashboard (class.html).
// No accounts and no personal details: just the class code on each run.
import * as api from './api.js';
import { CLASS_CODE_RE } from './groups.js';

const $ = (s) => document.querySelector(s);
let app = null; // { escapeHtml, toast }

export function renderClassChip() {
  const c = api.myClass();
  const chip = $('#class-chip');
  chip.hidden = !c;
  if (!c) return;
  chip.innerHTML = `🏫 Playing for <b>${app.escapeHtml(c.name)}</b> <button class="linkish" id="class-leave">Leave class</button>`;
  $('#class-leave').addEventListener('click', () => { api.setMyClass(null); renderClassChip(); });
}

export async function joinFromUrl(params) {
  const code = (params.get('class') || '').toUpperCase();
  if (!CLASS_CODE_RE.test(code)) return;
  try {
    const c = await api.getClass(code);
    api.setMyClass(c);
    app.toast?.(`🏫 You joined <b>${app.escapeHtml(c.name)}</b>. Your games will show on your teacher's screen.`);
  } catch {
    app.toast?.('That class link did not work. Ask your teacher for a new one.');
  }
  renderClassChip();
}

export function initClassroom(a) {
  app = a;
  renderClassChip();
}
