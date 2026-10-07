/* ByteLab – Cambridge-style pseudocode interpreter (IGCSE 0478 / AS & A Level 9618 subset) */
(function () {
  const LIM = 3e5, R = (ln, m) => { throw { ln, m }; };
  const KW = ['DECLARE','CONSTANT','INPUT','OUTPUT','PRINT','IF','THEN','ELSE','ENDIF','CASE','OF','OTHERWISE','ENDCASE','FOR','TO','STEP','NEXT','WHILE','DO','ENDWHILE','REPEAT','UNTIL','PROCEDURE','ENDPROCEDURE','FUNCTION','RETURNS','ENDFUNCTION','RETURN','CALL'];
  let P;

  function lex(s, ln) {
    const o = [], re = /\s*(?:"([^"]*)"|'([^']*)'|(\d+(?:\.\d+)?)|(<-|←|<>|<=|>=|[A-Za-z_]\w*|[-+*\/^&=<>()\[\],:])|(\S))/gy;
    let m;
    while (re.lastIndex < s.length && (m = re.exec(s))) {
      if (m[1] !== undefined) o.push({ t: 's', v: m[1] });
      else if (m[2] !== undefined) o.push({ t: 's', v: m[2] });
      else if (m[3]) o.push({ t: 'n', v: +m[3] });
      else if (m[4]) o.push({ t: /^[A-Za-z_]/.test(m[4]) ? 'w' : 'o', v: m[4] });
      else R(ln, 'Unexpected character "' + m[5] + '"');
    }
    return o;
  }
  const up = k => (k && k.t === 'w' ? k.v.toUpperCase() : '');
  function splitTop(T, sep) {
    const g = [[]]; let d = 0;
    T.forEach(k => {
      if (k.t === 'o' && '([' .includes(k.v)) d++;
      if (k.t === 'o' && ')]'.includes(k.v)) d--;
      if (!d && k.t === 'o' && k.v === sep) g.push([]); else g[g.length - 1].push(k);
    });
    return g;
  }
  const idx = (T, w) => T.findIndex(k => up(k) === w);

  /* ---------- expressions ---------- */
  function ex(T, ln) {
    if (!T.length) R(ln, 'Something is missing here');
    let i = 0;
    const E = m => R(ln, m);
    const isW = w => up(T[i]) === w;
    const isO = (...o) => T[i] && T[i].t === 'o' && o.includes(T[i].v);
    const num = v => typeof v === 'number' ? v : E('A number was expected but got "' + v + '"');
    const or = () => { let l = and(); while (isW('OR')) { i++; const a = l, b = and(); l = e => a(e) || b(e); } return l; };
    const and = () => { let l = not(); while (isW('AND')) { i++; const a = l, b = not(); l = e => a(e) && b(e); } return l; };
    const not = () => { if (isW('NOT')) { i++; const a = not(); return e => !a(e); } return cmp(); };
    const cmp = () => {
      let l = add();
      while (isO('=', '<>', '<', '>', '<=', '>=')) {
        const o = T[i++].v, a = l, b = add();
        l = e => { const x = a(e), y = b(e); return o == '=' ? x === y : o == '<>' ? x !== y : o == '<' ? x < y : o == '>' ? x > y : o == '<=' ? x <= y : x >= y; };
      }
      return l;
    };
    const add = () => {
      let l = mul();
      while (isO('+', '-', '&')) {
        const o = T[i++].v, a = l, b = mul();
        l = e => {
          const x = a(e), y = b(e);
          if (o == '&') return '' + fmt(x) + fmt(y);
          if (typeof x == 'string' || typeof y == 'string') E('You cannot use ' + o + ' on text. Join text with & instead');
          return o == '+' ? x + y : x - y;
        };
      }
      return l;
    };
    const mul = () => {
      let l = pw();
      for (;;) {
        let o;
        if (isO('*', '/')) o = T[i++].v; else if (isW('DIV') || isW('MOD')) o = T[i++].v.toUpperCase(); else break;
        const a = l, b = pw();
        l = e => { const x = num(a(e)), y = num(b(e)); if (o == '*') return x * y; if (!y) E('Division by zero'); return o == '/' ? x / y : o == 'DIV' ? Math.trunc(x / y) : x % y; };
      }
      return l;
    };
    const pw = () => { const l = prim(); if (isO('^')) { i++; const b = pw(); return e => Math.pow(num(l(e)), num(b(e))); } return l; };
    const prim = () => {
      const k = T[i++];
      if (!k) E('The expression is incomplete');
      if (k.t == 'n' || k.t == 's') return () => k.v;
      if (k.t == 'o') {
        if (k.v == '(') { const x = or(); if (!isO(')')) E('Missing closing bracket )'); i++; return x; }
        if (k.v == '-') { const x = pw(); return e => -num(x(e)); }
        E('Unexpected "' + k.v + '"');
      }
      const u = k.v.toUpperCase();
      if (u == 'TRUE') return () => true;
      if (u == 'FALSE') return () => false;
      if (KW.includes(u)) E('"' + k.v + '" is a keyword and cannot be used here');
      if (isO('(')) {
        i++; const a = [];
        if (!isO(')')) { do { a.push(or()); } while (isO(',') && i++); }
        if (!isO(')')) E('Missing closing bracket ) after ' + k.v); i++;
        return e => call(e, k.v, a.map(f => f(e)), ln);
      }
      if (isO('[')) {
        i++; const x = [];
        do { x.push(or()); } while (isO(',') && i++);
        if (!isO(']')) E('Missing ] after the array index'); i++;
        return e => aget(e, k.v, x.map(f => f(e)), ln);
      }
      return e => get(e, k.v, ln);
    };
    const f = or();
    if (i < T.length) E('Unexpected "' + T[i].v + '"' + (up(T[i]) == 'THEN' ? ' – check the IF line' : ''));
    return f;
  }

  /* ---------- variables ---------- */
  const find = (e, n) => (e.L && n in e.L.v ? e.L : n in e.G.v ? e.G : null);
  function get(e, n, ln) {
    const s = find(e, n);
    if (!s) R(ln, 'Variable "' + n + '" has not been created. Check the spelling and capital letters, or assign it a value first');
    if (s.v[n] === undefined) R(ln, 'Variable "' + n + '" has no value yet');
    return s.v[n];
  }
  function chk(t, v, ln, n) {
    const ok = { INTEGER: Number.isInteger(v), REAL: typeof v == 'number', STRING: typeof v == 'string', CHAR: typeof v == 'string' && v.length == 1, BOOLEAN: typeof v == 'boolean' }[t];
    if (ok === false) R(ln, n + ' is declared as ' + t + ' but the value ' + fmt(v) + ' is not a ' + t);
  }
  function set(e, n, v, ln) {
    const s = find(e, n) || e.L || e.G;
    if (s.c[n]) R(ln, n + ' is a CONSTANT and cannot be changed');
    if (s.t[n]) chk(s.t[n], v, ln, n);
    s.v[n] = v;
  }
  function arr(e, n, ln) {
    const s = find(e, n), a = s && s.v[n];
    if (!a || !a.A) R(ln, '"' + n + '" is not a declared array');
    return a;
  }
  function key(a, x, n, ln) {
    if (x.length != a.lo.length) R(ln, n + ' needs ' + a.lo.length + ' index value(s)');
    x.forEach((v, k) => { if (!Number.isInteger(v) || v < a.lo[k] || v > a.hi[k]) R(ln, 'Index ' + v + ' is outside the bounds of ' + n + ' (' + a.lo[k] + ' to ' + a.hi[k] + ')'); });
    return x.join(',');
  }
  function aget(e, n, x, ln) {
    const a = arr(e, n, ln), k = key(a, x, n, ln);
    if (a.d[k] === undefined) R(ln, n + '[' + k + '] has no value yet');
    return a.d[k];
  }
  const fmt = v => typeof v == 'boolean' ? (v ? 'TRUE' : 'FALSE') : typeof v == 'number' ? String(+v.toPrecision(12)) : String(v);

  /* ---------- calls & library routines ---------- */
  function call(e, n, a, ln) {
    const f = P.fn[n];
    if (f) {
      if (a.length != f.ps.length) R(ln, n + ' needs ' + f.ps.length + ' value(s) but was given ' + a.length);
      if (++P.d > 2000) R(ln, 'Too many nested calls – does the recursion ever stop?');
      const sc = { v: {}, t: {}, c: {} };
      f.ps.forEach((p, k) => sc.v[p] = a[k]);
      try { run(f.body, { L: sc, G: e.G }); } catch (x) { if ('ret' in x) { P.d--; return x.ret; } throw x; }
      P.d--; return undefined;
    }
    const u = n.toUpperCase(), B = {
      LENGTH: s => String(s).length,
      SUBSTRING: (s, st, l) => { if (st < 1) R(ln, 'SUBSTRING positions start at 1'); return String(s).substr(st - 1, l); },
      UCASE: s => String(s).toUpperCase(), LCASE: s => String(s).toLowerCase(),
      MOD: (x, y) => x % y, DIV: (x, y) => Math.trunc(x / y),
      ROUND: (x, d) => +x.toFixed(d), RANDOM: () => Math.random(), INT: x => Math.trunc(x),
      CHR: x => String.fromCharCode(x), ASC: s => String(s).charCodeAt(0)
    };
    if (!B[u]) R(ln, 'Unknown procedure or function "' + n + '"');
    if (a.length < B[u].length) R(ln, u + ' needs ' + B[u].length + ' value(s)');
    return B[u](...a);
  }
  const run = (b, e) => { for (const g of b) g(e); };

  /* ---------- statements ---------- */
  function block(L, st, stops) {
    const out = [];
    while (st.i < L.length) {
      const { ln, T } = L[st.i], w = up(T[0]);
      if (stops.includes(w)) return out;
      st.i++;
      let f;
      const need = (kw, c) => { if (st.i >= L.length) R(ln, kw + ' on line ' + ln + ' is never closed – missing ' + c); };
      const close = c => { if (up(L[st.i].T[0]) != c) R(L[st.i].ln, 'Expected ' + c); st.i++; };
      switch (w) {
        case 'DECLARE': {
          const c = T.findIndex(k => k.v == ':'); if (c < 0) R(ln, 'DECLARE needs a colon, e.g. DECLARE Age : INTEGER');
          const names = T.slice(1, c).filter(k => k.v != ',').map(k => k.v), ty = T.slice(c + 1);
          if (!ty.length) R(ln, 'DECLARE needs a data type after the colon');
          let spec = up(ty[0]);
          if (spec == 'ARRAY') {
            const nums = ty.filter(k => k.t == 'n').map(k => k.v), et = up(ty[ty.length - 1]);
            if (nums.length < 2 || nums.length % 2) R(ln, 'Arrays are declared like ARRAY[1:10] OF INTEGER');
            const lo = nums.filter((_, k) => !(k % 2)), hi = nums.filter((_, k) => k % 2);
            f = e => names.forEach(n => (e.L || e.G).v[n] = { A: 1, lo, hi, d: {}, t: et });
          } else {
            if (!['INTEGER', 'REAL', 'STRING', 'CHAR', 'BOOLEAN'].includes(spec)) R(ln, 'Unknown data type "' + ty[0].v + '"');
            f = e => names.forEach(n => { const s = e.L || e.G; s.v[n] = undefined; s.t[n] = spec; });
          }
          break;
        }
        case 'CONSTANT': {
          const k = T.findIndex(x => x.v == '←' || x.v == '<-'); if (k != 2) R(ln, 'Write constants like CONSTANT Pi ← 3.142');
          const rf = ex(T.slice(3), ln), n = T[1].v;
          f = e => { const s = e.L || e.G; s.v[n] = rf(e); s.c[n] = 1; };
          break;
        }
        case 'INPUT': {
          const lhs = T.slice(1); if (!lhs.length) R(ln, 'INPUT needs a variable name');
          const n = lhs[0].v, ix = lhs.length > 1 ? splitTop(lhs.slice(2, -1), ',').map(g => ex(g, ln)) : null;
          f = e => {
            if (!P.inp.length) R(ln, 'INPUT needs a value but the Input box is empty. Type one value per line there');
            let v = P.inp.shift(); const s = find(e, n), t = ix ? (s && s.v[n] && s.v[n].t) : s && s.t[n];
            if (t == 'INTEGER' || t == 'REAL') { if (v.trim() === '' || isNaN(+v)) R(ln, '"' + v + '" is not a number but ' + n + ' is ' + t); v = +v; }
            else if (!t && v.trim() !== '' && !isNaN(+v)) v = +v;
            else if (t == 'BOOLEAN') v = v.trim().toUpperCase() == 'TRUE';
            if (ix) { const a = arr(e, n, ln), k = key(a, ix.map(g => g(e)), n, ln); chk(a.t, v, ln, n); a.d[k] = v; } else set(e, n, v, ln);
          };
          break;
        }
        case 'OUTPUT': case 'PRINT': {
          if (w == 'PRINT') P.warn.push('Line ' + ln + ': Cambridge pseudocode uses OUTPUT, not PRINT');
          const fs = splitTop(T.slice(1), ',').map(g => ex(g, ln));
          f = e => P.out.push(fs.map(g => fmt(g(e))).join(''));
          break;
        }
        case 'IF': {
          let c = T.slice(1);
          if (up(c[c.length - 1]) == 'THEN') c.pop();
          else if (L[st.i] && L[st.i].T.length == 1 && up(L[st.i].T[0]) == 'THEN') st.i++;
          else R(ln, 'IF needs THEN after the condition');
          const cf = ex(c, ln), a = block(L, st, ['ELSE', 'ENDIF']); let b = [];
          need('IF', 'ENDIF');
          if (up(L[st.i].T[0]) == 'ELSE') { st.i++; b = block(L, st, ['ENDIF']); need('IF', 'ENDIF'); }
          st.i++;
          f = e => { const v = cf(e); if (typeof v != 'boolean') R(ln, 'An IF condition must be TRUE or FALSE'); run(v ? a : b, e); };
          break;
        }
        case 'CASE': {
          if (up(T[1]) != 'OF') R(ln, 'Write CASE OF followed by a variable');
          const sf = ex(T.slice(2), ln), br = []; let oth = [];
          while (st.i < L.length && up(L[st.i].T[0]) != 'ENDCASE') {
            const { ln: l2, T: t2 } = L[st.i++];
            if (up(t2[0]) == 'OTHERWISE') oth = block([{ ln: l2, T: t2.slice(1) }], { i: 0 }, []);
            else {
              const c = t2.findIndex(k => k.v == ':'); if (c < 1) R(l2, 'A CASE line looks like: 1 : OUTPUT "One"');
              br.push([ex(t2.slice(0, c), l2), block([{ ln: l2, T: t2.slice(c + 1) }], { i: 0 }, [])]);
            }
          }
          need('CASE', 'ENDCASE'); st.i++;
          f = e => { const v = sf(e), m = br.find(x => x[0](e) === v); run(m ? m[1] : oth, e); };
          break;
        }
        case 'FOR': {
          const a = T.findIndex(k => k.v == '←' || k.v == '<-'), t = idx(T, 'TO'), s = idx(T, 'STEP');
          if (a < 2 || t < 0) R(ln, 'A FOR loop looks like: FOR Count ← 1 TO 10');
          const n = T[1].v, sf = ex(T.slice(a + 1, t), ln), ef = ex(T.slice(t + 1, s < 0 ? undefined : s), ln), pf = s < 0 ? () => 1 : ex(T.slice(s + 1), ln);
          const b = block(L, st, ['NEXT']); need('FOR', 'NEXT'); st.i++;
          f = e => {
            const stp = pf(e), end = ef(e); if (!stp) R(ln, 'STEP cannot be 0');
            for (let v = sf(e); stp > 0 ? v <= end : v >= end; v += stp) { set(e, n, v, ln); run(b, e); if (++P.n > LIM) R(ln, 'The program ran for too long – possible infinite loop'); }
          };
          break;
        }
        case 'WHILE': {
          const c = T.slice(1); if (up(c[c.length - 1]) == 'DO') c.pop();
          const cf = ex(c, ln), b = block(L, st, ['ENDWHILE']); need('WHILE', 'ENDWHILE'); st.i++;
          f = e => { while (cf(e)) { run(b, e); if (++P.n > LIM) R(ln, 'The program ran for too long – possible infinite loop (does the condition ever become FALSE?)'); } };
          break;
        }
        case 'REPEAT': {
          const b = block(L, st, ['UNTIL']); need('REPEAT', 'UNTIL');
          const u = L[st.i++], cf = ex(u.T.slice(1), u.ln);
          f = e => { do { run(b, e); if (++P.n > LIM) R(ln, 'The program ran for too long – possible infinite loop (does the UNTIL condition ever become TRUE?)'); } while (!cf(e)); };
          break;
        }
        case 'PROCEDURE': case 'FUNCTION': {
          const end = 'END' + w, o = T.findIndex(k => k.v == '('), c = T.map(k => k.v).lastIndexOf(')');
          const ps = o < 0 ? [] : splitTop(T.slice(o + 1, c), ',').filter(g => g.length).map(g => g.find(k => k.t == 'w' && !['BYREF', 'BYVAL'].includes(up(k))).v);
          const name = T[1].v, b = block(L, st, [end]); need(w, end); st.i++;
          P.fn[name] = { ps, body: b }; f = () => {};
          break;
        }
        case 'CALL': {
          f = T.length == 2 ? (e => call(e, T[1].v, [], ln)) : ex(T.slice(1), ln);
          break;
        }
        case 'RETURN': { const rf = ex(T.slice(1), ln); f = e => { throw { ret: rf(e) }; }; break; }
        case 'ENDIF': case 'ENDWHILE': case 'NEXT': case 'UNTIL': case 'ENDCASE': case 'ENDPROCEDURE': case 'ENDFUNCTION': case 'ELSE': case 'THEN':
          R(ln, w + ' has no matching opening statement');
        default: {
          const a = T.findIndex(k => k.v == '←' || k.v == '<-');
          if (a < 0) R(ln, T.some(k => k.v == '=') ? 'To store a value use ←  (or <-). The = sign is only for comparing' : 'Not a valid statement. Check the keyword spelling');
          const n = T[0].v, lhs = T.slice(0, a);
          if (T[0].t != 'w') R(ln, 'The left side of ← must be a variable name');
          const rf = ex(T.slice(a + 1), ln);
          if (lhs.length > 1) {
            const ix = splitTop(lhs.slice(2, -1), ',').map(g => ex(g, ln));
            f = e => { const v = rf(e), a2 = arr(e, n, ln), k = key(a2, ix.map(g => g(e)), n, ln); chk(a2.t, v, ln, n); a2.d[k] = v; };
          } else f = e => set(e, n, rf(e), ln);
        }
      }
      if (w != 'PROCEDURE' && w != 'FUNCTION' && w != 'INPUT' && T[0].t == 'w' && T[0].v !== w && KW.includes(w)) P.warn.push('Line ' + ln + ': write ' + w + ' in capital letters');
      out.push(f);
    }
    return out;
  }

  window.PC = {
    run(src, inp) {
      P = { out: [], warn: [], inp: String(inp || '').split('\n').filter(s => s.trim() !== ''), fn: {}, n: 0, d: 0 };
      const res = () => ({ out: P.out.join('\n'), warn: P.warn });
      try {
        const L = [];
        src.split('\n').forEach((s, i) => { s = s.replace(/("[^"]*")|\/\/.*$/g, (m, q) => q || '').trim(); if (s) L.push({ ln: i + 1, T: lex(s, i + 1) }); });
        const b = block(L, { i: 0 }, []);
        run(b, { L: null, G: { v: {}, t: {}, c: {} } });
        return { ...res(), err: null };
      } catch (x) {
        if ('ret' in x) return { ...res(), err: 'RETURN used outside a FUNCTION' };
        return { ...res(), err: x.ln ? 'Line ' + x.ln + ': ' + x.m : (x.m || String(x)) };
      }
    }
  };
})();
