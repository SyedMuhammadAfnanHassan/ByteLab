/* ByteLab pseudocode course UI: lessons, quizzes, practice checker and IDE */
(function () {
  const C = window.COURSE, $ = s => document.querySelector(s), K = 'bl_pc_' + C.key;
  let cur = 0, done = {}, ok = {};
  try { done = JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) {}
  const save = () => { try { localStorage.setItem(K, JSON.stringify(done)); } catch (e) {} };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const nav = () => $('#nav').innerHTML = C.lessons.map((l, i) => `<button data-i="${i}" class="${i == cur ? 'on' : ''}">${done[i] ? '✓ ' : ''}Lesson ${i + 1}: ${l.t}</button>`).join('') + `<div class="prog">${Object.keys(done).length} of ${C.lessons.length} lessons complete</div>`;
  function show(i) {
    cur = i; ok = { q: {}, t: !C.lessons[i].task }; const l = C.lessons[i];
    $('#main').innerHTML = `<h2>Lesson ${i + 1}: ${l.t}</h2>${l.h}<pre class="code">${esc(l.ex)}</pre><button class="b g" data-load="ex">Try this in the IDE ▶</button>
<h3>Quick questions</h3>${l.qs.map((q, j) => `<div class="q" data-j="${j}"><p><b>${j + 1}.</b> ${q.q}</p>${q.o.map((o, k) => `<button class="o" data-k="${k}">${esc(o)}</button>`).join('')}<p class="fb"></p></div>`).join('')}
${l.task ? `<h3>Practice task</h3><p>${l.task.p}</p><button class="b g" data-load="task">Load starter code</button><button class="b" id="chk">Check my answer</button><div id="res"></div>` : ''}<p id="lessonDone" class="pass"></p>`;
    nav(); scrollTo(0, 0);
  }
  const finish = () => {
    const l = C.lessons[cur];
    if (ok.t && l.qs.every((_, j) => ok.q[j])) { done[cur] = 1; save(); nav(); $('#lessonDone').textContent = '🎉 Lesson complete!' + (cur < C.lessons.length - 1 ? ' Move on to the next lesson.' : ' You finished the course!'); }
  };
  document.addEventListener('click', ev => {
    const t = ev.target, l = C.lessons[cur];
    if (t.dataset.i) return show(+t.dataset.i);
    if (t.dataset.load) { $('#code').value = t.dataset.load == 'ex' ? l.ex : l.task.s; $('#inp').value = t.dataset.load == 'ex' ? (l.inp || '') : ''; $('#ide').scrollIntoView({ behavior: 'smooth' }); }
    if (t.classList.contains('o')) {
      const q = t.closest('.q'), j = +q.dataset.j, k = +t.dataset.k, good = k == l.qs[j].a;
      t.classList.add(good ? 'ok' : 'no'); q.querySelector('.fb').textContent = (good ? '✔ Correct. ' : '✘ Not quite – try again. ') + (good ? l.qs[j].w : '');
      if (good) { ok.q[j] = 1; q.querySelectorAll('.o').forEach(b => b.disabled = true); finish(); }
    }
    if (t.id == 'chk') {
      const code = $('#code').value, rows = l.task.tests.map((x, n) => {
        const r = PC.run(code, x.i), pass = !r.err && norm(r.out).includes(norm(x.o));
        return `<div class="${pass ? 'pass' : 'fail'}">${pass ? '✔' : '✘'} Test ${n + 1} (input: ${esc(x.i.replace(/\n/g, ', ') || 'none')})${pass ? '' : ` – expected output containing <b>${esc(x.o)}</b>, got: ${esc(r.err || r.out || 'nothing')}`}</div>`;
      });
      $('#res').innerHTML = rows.join(''); ok.t = !rows.some(r => r.includes('class="fail"')); finish();
    }
    if (t.id == 'run') {
      const r = PC.run($('#code').value, $('#inp').value);
      $('#out').innerHTML = esc(r.out) + (r.err ? `\n<span class="err">✘ ${esc(r.err)}</span>` : '') + r.warn.map(w => `\n<span class="warn">ℹ ${esc(w)}</span>`).join('') || '(no output)';
    }
  });
  $('#code').value = C.lessons[0].ex; show(0);
})();
