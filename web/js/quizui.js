// Optional Quick Safety Check: 3 questions before your first game, the same 3 after it.
// Asked once per device, always skippable, so it never gets in the way of playing.
import { QUESTIONS, QUIZ_LEN } from './quiz.js';
import * as api from './api.js';
import * as badges from './badges.js';
import { sfx } from './sound.js';
import { confetti } from './fx.js';

const $ = (s) => document.querySelector(s);
const KEY = 'tes_quiz_v1';
let app = null; // { show, escapeHtml, kiosk, isDemo, celebrate }

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const shouldOffer = () => !app.kiosk && !app.isDemo && !load().status;
export const postPending = () => load().status === 'pre-done';

export function offer(onContinue) {
  const sheet = $('#quiz-offer');
  sheet.hidden = false;
  $('#quiz-yes').onclick = () => { sheet.hidden = true; run('pre', onContinue); };
  $('#quiz-skip').onclick = () => { sheet.hidden = true; save({ status: 'skipped' }); onContinue(); };
}

function run(phase, done) {
  const st = load();
  const qids = phase === 'pre' ? shuffle(QUESTIONS.map(q => q.id)).slice(0, QUIZ_LEN) : st.qids;
  const qs = qids.map(id => QUESTIONS.find(q => q.id === id));
  let i = 0, correct = 0;
  app.show('screen-quiz');
  $('#quiz-title').textContent = phase === 'pre' ? '🧠 Quick safety check' : '🧠 Did you learn?';
  $('#quiz-sub').textContent = phase === 'pre' ? 'No pressure: just your best guess.' : 'Same questions as before. Let\'s see!';

  const next = () => {
    if (i >= qs.length) return finish();
    const q = qs[i];
    $('#quiz-progress').textContent = `${i + 1} / ${qs.length}`;
    $('#quiz-q').textContent = q.q;
    $('#quiz-feedback').textContent = '';
    const opts = shuffle(q.options.map((t, k) => ({ t, ok: k === 0 })));
    $('#quiz-options').innerHTML = opts.map((o, k) => `<button class="btn quiz-opt" data-k="${k}">${app.escapeHtml(o.t)}</button>`).join('');
    $('#quiz-options').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const o = opts[Number(b.dataset.k)];
      if (o.ok) correct++;
      $('#quiz-options').querySelectorAll('button').forEach(x => { x.disabled = true; });
      if (phase === 'post') {
        // After the game we show the answer, so the quiz teaches too.
        b.classList.add(o.ok ? 'right' : 'wrong');
        $('#quiz-options').querySelectorAll('button').forEach((x, k) => { if (opts[k].ok) x.classList.add('right'); });
        $('#quiz-feedback').textContent = o.ok ? 'Correct!' : `Answer: ${q.options[0]}`;
        o.ok ? sfx.coin() : sfx.boing();
      } else {
        b.classList.add('picked'); sfx.tap();
      }
      i++;
      setTimeout(next, phase === 'post' ? 1300 : 350);
    }));
  };

  const finish = () => {
    $('#quiz-feedback').textContent = '';
    if (phase === 'pre') {
      save({ status: 'pre-done', qids, pre: correct });
      api.queueQuiz({ qids, pre: correct });
      $('#quiz-q').textContent = 'Thanks! Now play a game. Afterwards we\'ll ask the same 3 questions to see what you learned.';
      $('#quiz-options').innerHTML = '<button class="btn btn-primary" id="quiz-go">Play!</button>';
      $('#quiz-progress').textContent = '';
      $('#quiz-go').onclick = () => done();
    } else {
      const pre = st.pre ?? 0;
      save({ ...st, status: 'done', post: correct });
      api.queueQuiz({ qids, pre, post: correct });
      $('#quiz-progress').textContent = '';
      $('#quiz-q').innerHTML = `Before: <b>${pre}/${QUIZ_LEN}</b> → After: <b>${correct}/${QUIZ_LEN}</b><br>${correct > pre ? 'You learned something. Legend! 🎉' : correct === QUIZ_LEN ? 'Perfect score! 🎉' : 'Keep playing, the rules will stick!'}`;
      $('#quiz-options').innerHTML = '<button class="btn btn-primary" id="quiz-go">Back</button>';
      $('#quiz-go').onclick = () => done();
      if (correct >= pre) confetti(80);
      app.celebrate(badges.grant1('brainy'));
    }
  };
  next();
}

export function renderOverQuiz() {
  const box = $('#over-quiz');
  box.hidden = !postPending();
}

export function initQuiz(a) {
  app = a;
  $('#btn-quiz-post').addEventListener('click', () => run('post', () => { renderOverQuiz(); app.show('screen-over'); }));
}
