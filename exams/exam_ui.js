/* ============================================================
   9-2. 모의고사 (exams/*.txt → exams/build_exams.py → EXAMS)
============================================================ */
const CIRCLED = ['①', '②', '③', '④', '⑤'];
const examState = () => {
  S.exam = S.exam || {};
  const k = S.examSet || '1';
  S.exam[k] = S.exam[k] || { ans: {}, graded: false };
  return S.exam[k];
};
let examWrongOnly = false, examArm = null;

function renderExam() {
  const set = EXAMS[S.examSet || '1'], st = examState();
  const n = set.qs.length, answered = Object.keys(st.ans).length;
  let head = `<div class="exam-title">${set.title} <small>${n}문항 · 문항당 1점</small></div><div class="small-note">${set.desc}</div>`;
  if (st.graded) {
    const score = set.qs.filter((q, i) => st.ans[i] === q.a).length;
    const secs = [];
    set.qs.forEach((q, i) => {
      let s = secs.find(x => x.name === q.s);
      if (!s) secs.push(s = { name: q.s, ok: 0, n: 0 });
      s.n++; if (st.ans[i] === q.a) s.ok++;
    });
    head += `<div class="exam-score">점수 <b>${score}</b> / ${n}</div>
      <div class="exam-secs">${secs.map(s => `<div class="${s.ok / s.n < 0.6 ? 'weak' : ''}"><span>${s.name}</span><b>${s.ok}/${s.n}</b></div>`).join('')}</div>
      <div class="small-note">60% 미만인 영역은 빨간색이에요. 개념 탭에서 다시 확인해 보세요.</div>`;
  }
  head += `<div class="progress-row"><span>답한 문제 ${answered} / ${n}</span><span>${Math.round(answered / n * 100)}%</span></div><div class="bar"><div style="width:${answered / n * 100}%"></div></div>
    <div class="exam-tools">${st.graded ? `<button class="tog ${examWrongOnly ? 'on' : ''}" id="examWrong">틀린 문제만 보기</button>` : ''}<button class="tog" id="examReset">다시 풀기</button></div>`;
  let prevSec = '';
  const body = set.qs.map((q, i) => {
    const mine = st.ans[i], ok = mine === q.a;
    if (st.graded && examWrongOnly && ok) return '';
    const sec = q.s !== prevSec ? `<div class="exam-sec">${esc(q.s)}</div>` : '';
    prevSec = q.s;
    const opts = q.o.map((o, j) => {
      const k = j + 1;
      let cls = mine === k ? 'sel' : '';
      if (st.graded) cls = k === q.a ? 'right' : (mine === k ? 'wrong' : '');
      return `<button class="${cls}" data-q="${i}" data-k="${k}" ${st.graded ? 'disabled' : ''}><span class="n">${CIRCLED[j]}</span><span>${esc(o)}</span></button>`;
    }).join('');
    return `${sec}<div class="exam-q ${st.graded ? (ok ? 'ok' : 'ng') : ''}" id="eq-${i}">
      <div class="eq-head"><span class="eq-no">${i + 1}</span><span class="eq-text">${esc(q.q)}</span>${st.graded ? `<span class="eq-mark">${ok ? '⭕' : '❌'}</span>` : ''}</div>
      ${q.b ? `<div class="eq-box">${esc(q.b)}</div>` : ''}
      <div class="eq-opts">${opts}</div>
      ${st.graded ? `<div class="eq-exp">정답 <b>${CIRCLED[q.a - 1]}</b>${mine ? '' : ' (안 푼 문제)'} · ${esc(q.e)}</div>` : ''}
    </div>`;
  }).join('');
  $('#examArea').innerHTML = `<div class="panel exam-head">${head}</div><div class="exam-list">${body || '<div class="panel empty">틀린 문제가 없어요! 🎉</div>'}</div>
    ${st.graded ? '' : `<div class="exam-bar"><span id="examCount">답한 문제 ${answered} / ${n}</span><button class="btn primary slim" id="examGrade">채점하기</button></div>`}`;
}

$('#examArea').addEventListener('click', e => {
  const b = e.target.closest('.eq-opts button');
  const set = EXAMS[S.examSet || '1'], st = examState();
  if (b && !st.graded) {
    const i = +b.dataset.q, k = +b.dataset.k;
    if (st.ans[i] === k) delete st.ans[i]; else st.ans[i] = k;
    save();
    b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('sel', st.ans[i] === +x.dataset.k));
    const answered = Object.keys(st.ans).length, n = set.qs.length;
    $('#examCount').textContent = `답한 문제 ${answered} / ${n}`;
    const row = $('#examArea .exam-head .progress-row');
    if (row) { row.firstElementChild.textContent = `답한 문제 ${answered} / ${n}`; row.lastElementChild.textContent = Math.round(answered / n * 100) + '%'; }
    const bar = $('#examArea .exam-head .bar > div'); if (bar) bar.style.width = answered / n * 100 + '%';
    return;
  }
  if (e.target.closest('#examGrade')) {
    const left = set.qs.length - Object.keys(st.ans).length;
    if (left > 0 && examArm !== 'grade') {
      examArm = 'grade'; setTimeout(() => { examArm = null; }, 4000);
      toast(`아직 ${left}문제를 안 풀었어요. 한 번 더 누르면 채점해요`); return;
    }
    examArm = null; st.graded = true; examWrongOnly = false; save(); renderExam();
    window.scrollTo({ top: $('#view-exam').offsetTop - 10, behavior: 'smooth' });
    return;
  }
  if (e.target.closest('#examWrong')) { examWrongOnly = !examWrongOnly; renderExam(); return; }
  if (e.target.closest('#examReset')) {
    if (examArm !== 'reset') { examArm = 'reset'; setTimeout(() => { examArm = null; }, 4000); toast('한 번 더 누르면 답을 모두 지우고 처음부터 풀어요'); return; }
    examArm = null; S.exam[S.examSet || '1'] = { ans: {}, graded: false }; examWrongOnly = false; save(); renderExam();
    window.scrollTo({ top: $('#view-exam').offsetTop - 10, behavior: 'smooth' });
  }
});
