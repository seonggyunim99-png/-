/* ============================================================
   9-2. 모의고사 (exams/*.txt → exams/build_exams.py → EXAMS)
   회차마다 100문제를 20문제씩 5부로 나눠서 풀고 채점해요.
   답은 문제 번호(id, 원고 순서)로 저장해요.
============================================================ */
const CIRCLED = ['①', '②', '③', '④', '⑤'];
const EXAM_PER = 20;
const examState = () => {
  S.exam = S.exam || {};
  const k = S.examSet || '1';
  let st = S.exam[k];
  if (!st) st = S.exam[k] = { v: 2, ans: {}, graded: {}, part: 1 };
  if (st.v !== 2) {
    // 예전 저장 방식(100문제 한꺼번에) → 부별 채점으로 옮기기. 답은 그대로 남아요
    const g = st.graded === true;
    S.exam[k] = st = { v: 2, ans: st.ans || {}, graded: g ? { 1: true, 2: true, 3: true, 4: true, 5: true } : {}, part: 1 };
  }
  st.graded = st.graded || {}; st.ans = st.ans || {};
  if (!(st.part >= 1 && st.part <= 5)) st.part = 1;
  return st;
};
let examWrongOnly = false, examArm = null;
const examPartQs = (set, p) => set.qs.slice((p - 1) * EXAM_PER, p * EXAM_PER).map((q, j) => ({ q, no: (p - 1) * EXAM_PER + j + 1 }));
const examParts = set => Math.ceil(set.qs.length / EXAM_PER);

function renderExam() {
  const set = EXAMS[S.examSet || '1'], st = examState(), p = st.part;
  const items = examPartQs(set, p), n = items.length;
  const graded = !!st.graded[p];
  const answered = items.filter(x => st.ans[x.q.id]).length;
  // 부 고르기 (각 부의 상태: 채점 점수 또는 푼 개수)
  const tabs = Array.from({ length: examParts(set) }, (_, i) => {
    const pi = i + 1, its = examPartQs(set, pi);
    const sub = st.graded[pi] ? `✓ ${its.filter(x => st.ans[x.q.id] === x.q.a).length}/${its.length}점`
      : `${its.filter(x => st.ans[x.q.id]).length}/${its.length} 풂`;
    return `<button class="${pi === p ? 'active' : ''} ${st.graded[pi] ? 'done' : ''}" data-part="${pi}"><b>${pi}부</b><small>${(pi - 1) * EXAM_PER + 1}~${(pi - 1) * EXAM_PER + its.length}번</small><small>${sub}</small></button>`;
  }).join('');
  const doneParts = Object.keys(st.graded).filter(k => st.graded[k]).map(Number);
  let total = '';
  if (doneParts.length) {
    const all = doneParts.flatMap(pi => examPartQs(set, pi));
    total = `<div class="small-note">채점한 부 ${doneParts.length}/${examParts(set)} · 누적 점수 <b>${all.filter(x => st.ans[x.q.id] === x.q.a).length}</b> / ${all.length}</div>`;
  }
  let head = `<div class="exam-title">${set.title} <small>${set.qs.length}문항 · 20문제씩 ${examParts(set)}부</small></div><div class="small-note">${set.desc}</div>
    <div class="exam-parts">${tabs}</div>${total}
    <div class="exam-sub">${p}부 <small>${items[0].no}~${items[n - 1].no}번 · ${n}문항</small></div>`;
  if (graded) {
    const score = items.filter(x => st.ans[x.q.id] === x.q.a).length;
    const secs = [];
    items.forEach(({ q }) => {
      let s = secs.find(x => x.name === q.s);
      if (!s) secs.push(s = { name: q.s, ok: 0, n: 0 });
      s.n++; if (st.ans[q.id] === q.a) s.ok++;
    });
    head += `<div class="exam-score">점수 <b>${score}</b> / ${n}</div>
      <div class="exam-secs">${secs.map(s => `<div class="${s.ok / s.n < 0.6 ? 'weak' : ''}"><span>${s.name}</span><b>${s.ok}/${s.n}</b></div>`).join('')}</div>
      <div class="small-note">60% 미만인 영역은 빨간색이에요. 개념 탭에서 다시 확인해 보세요.</div>`;
  }
  head += `<div class="progress-row"><span>답한 문제 ${answered} / ${n}</span><span>${Math.round(answered / n * 100)}%</span></div><div class="bar"><div style="width:${answered / n * 100}%"></div></div>
    <div class="exam-tools">${graded ? `<button class="tog ${examWrongOnly ? 'on' : ''}" id="examWrong">틀린 문제만 보기</button>` : ''}<button class="tog" id="examReset">이 부 다시 풀기</button></div>`;
  let prevSec = '';
  const body = items.map(({ q, no }) => {
    const mine = st.ans[q.id], ok = mine === q.a;
    if (graded && examWrongOnly && ok) return '';
    const sec = q.s !== prevSec ? `<div class="exam-sec">${esc(q.s)}</div>` : '';
    prevSec = q.s;
    const opts = q.o.map((o, j) => {
      const k = j + 1;
      let cls = mine === k ? 'sel' : '';
      if (graded) cls = k === q.a ? 'right' : (mine === k ? 'wrong' : '');
      return `<button class="${cls}" data-q="${q.id}" data-k="${k}" ${graded ? 'disabled' : ''}><span class="n">${CIRCLED[j]}</span><span>${esc(o)}</span></button>`;
    }).join('');
    return `${sec}<div class="exam-q ${graded ? (ok ? 'ok' : 'ng') : ''}" id="eq-${q.id}">
      <div class="eq-head"><span class="eq-no">${no}</span><span class="eq-text">${esc(q.q)}</span>${graded ? `<span class="eq-mark">${ok ? '⭕' : '❌'}</span>` : ''}</div>
      ${q.b ? `<div class="eq-box">${esc(q.b)}</div>` : ''}
      <div class="eq-opts">${opts}</div>
      ${graded ? `<div class="eq-exp">정답 <b>${CIRCLED[q.a - 1]}</b>${mine ? '' : ' (안 푼 문제)'} · ${esc(q.e)}</div>` : ''}
    </div>`;
  }).join('');
  const nextBtn = graded && p < examParts(set) ? `<button class="btn primary" id="examNext" style="width:100%">다음 ${p + 1}부 풀기 →</button>` : '';
  $('#examArea').innerHTML = `<div class="panel exam-head">${head}</div><div class="exam-list">${body || '<div class="panel empty">틀린 문제가 없어요! 🎉</div>'}</div>${nextBtn}
    ${graded ? '' : `<div class="exam-bar"><span id="examCount">답한 문제 ${answered} / ${n}</span><button class="btn primary slim" id="examGrade">${p}부 채점하기</button></div>`}`;
}

const examTop = () => window.scrollTo({ top: $('#view-exam').offsetTop - 10, behavior: 'smooth' });
$('#examArea').addEventListener('click', e => {
  const set = EXAMS[S.examSet || '1'], st = examState(), p = st.part;
  const items = examPartQs(set, p), graded = !!st.graded[p];
  const b = e.target.closest('.eq-opts button');
  if (b && !graded) {
    const id = +b.dataset.q, k = +b.dataset.k;
    if (st.ans[id] === k) delete st.ans[id]; else st.ans[id] = k;
    save();
    b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('sel', st.ans[id] === +x.dataset.k));
    const answered = items.filter(x => st.ans[x.q.id]).length, n = items.length;
    $('#examCount').textContent = `답한 문제 ${answered} / ${n}`;
    const row = $('#examArea .exam-head .progress-row');
    if (row) { row.firstElementChild.textContent = `답한 문제 ${answered} / ${n}`; row.lastElementChild.textContent = Math.round(answered / n * 100) + '%'; }
    const bar = $('#examArea .exam-head .bar > div'); if (bar) bar.style.width = answered / n * 100 + '%';
    const tab = $(`#examArea .exam-parts [data-part="${p}"] small:last-child`); if (tab) tab.textContent = `${answered}/${n} 풂`;
    return;
  }
  const pt = e.target.closest('[data-part]');
  if (pt) { st.part = +pt.dataset.part; examWrongOnly = false; examArm = null; save(); renderExam(); return; }
  if (e.target.closest('#examGrade')) {
    const left = items.filter(x => !st.ans[x.q.id]).length;
    if (left > 0 && examArm !== 'grade') {
      examArm = 'grade'; setTimeout(() => { examArm = null; }, 4000);
      toast(`아직 ${left}문제를 안 풀었어요. 한 번 더 누르면 채점해요`); return;
    }
    examArm = null; st.graded[p] = true; examWrongOnly = false; save(); renderExam(); examTop();
    return;
  }
  if (e.target.closest('#examNext')) { st.part = p + 1; examWrongOnly = false; save(); renderExam(); examTop(); return; }
  if (e.target.closest('#examWrong')) { examWrongOnly = !examWrongOnly; renderExam(); return; }
  if (e.target.closest('#examReset')) {
    if (examArm !== 'reset') { examArm = 'reset'; setTimeout(() => { examArm = null; }, 4000); toast(`한 번 더 누르면 ${p}부 답을 지우고 처음부터 풀어요`); return; }
    examArm = null; items.forEach(x => { delete st.ans[x.q.id]; }); delete st.graded[p]; examWrongOnly = false; save(); renderExam(); examTop();
  }
});
