'use strict';
// Diff de líneas (LCS) con salida tipo unified y 3 líneas de contexto.

function diffLines(a, b) {
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const A = a.slice(pre, a.length - suf);
  const B = b.slice(pre, b.length - suf);
  const ops = [];
  for (let i = 0; i < pre; i++) ops.push([' ', a[i], i, i]);
  if (A.length * B.length > 4e6) {
    A.forEach((l, i) => ops.push(['-', l, pre + i, -1]));
    B.forEach((l, j) => ops.push(['+', l, -1, pre + j]));
  } else {
    const n = A.length; const m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
    let i = 0; let j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { ops.push([' ', A[i], pre + i, pre + j]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', A[i], pre + i, -1]); i++; }
      else { ops.push(['+', B[j], -1, pre + j]); j++; }
    }
    while (i < n) { ops.push(['-', A[i], pre + i, -1]); i++; }
    while (j < m) { ops.push(['+', B[j], -1, pre + j]); j++; }
  }
  for (let k = 0; k < suf; k++) ops.push([' ', a[a.length - suf + k], a.length - suf + k, b.length - suf + k]);
  return ops;
}

function unified(beforeText, afterText, context = 3) {
  const a = beforeText.split(/\r?\n/);
  const b = afterText.split(/\r?\n/);
  const ops = diffLines(a, b);
  const idx = [];
  ops.forEach((o, i) => { if (o[0] !== ' ') idx.push(i); });
  if (!idx.length) return { text: '', added: 0, removed: 0 };
  const groups = [];
  for (const i of idx) {
    const g = groups[groups.length - 1];
    if (g && i - g[1] <= context * 2 + 1) g[1] = i;
    else groups.push([i, i]);
  }
  const out = [];
  let added = 0; let removed = 0;
  for (const [first, last] of groups) {
    const start = Math.max(0, first - context);
    const stop = Math.min(ops.length, last + context + 1);
    const firstNew = ops.slice(start, stop).find((o) => o[3] >= 0);
    out.push(`@@ línea ${firstNew ? firstNew[3] + 1 : '?'} @@`);
    for (let x = start; x < stop; x++) {
      const [op, line] = ops[x];
      if (op === '+') added++;
      if (op === '-') removed++;
      out.push(op + ' ' + line);
    }
  }
  return { text: out.join('\n'), added, removed };
}

module.exports = { unified };
