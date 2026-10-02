// Renderizador Markdown propio (sin dependencias). Conserva el número de línea
// de cada casilla para poder marcarla desde la interfaz.
(function () {
  'use strict';

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])(\s+|$)/;
  const indentOf = (t) => t.match(/^\s*/)[0].replace(/\t/g, '    ').length;
  const isSep = (t) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(t) && t.includes('-');
  const splitRow = (t) => {
    let s = t.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
    return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
  };

  function slug(text, used) {
    let s = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || 'seccion';
    let k = s; let n = 1;
    while (used.has(k)) k = `${s}-${n++}`;
    used.add(k);
    return k;
  }

  function safeUrl(u) {
    const t = u.trim();
    if (/^(https?:|mailto:|#)/i.test(t)) return t;
    if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return '#';
    return t;
  }

  function inline(src, ctx) {
    const tokens = [];
    const hold = (html) => `\u0001${tokens.push(html) - 1}\u0001`;
    let s = String(src);
    s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, a, code) => {
      const c = code.trim();
      if (ctx.statuses && ctx.statuses[c]) return hold(`<code class="st-pill" style="--c:${ctx.statuses[c]}">${esc(c)}</code>`);
      return hold(`<code>${esc(c)}</code>`);
    });
    // los comentarios HTML (p. ej. las marcas <!-- sdd-hub:end -->) no se muestran, aunque vayan dentro de un párrafo
    s = s.replace(/<!--[\s\S]*?-->/g, '');
    s = s.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, (_, alt, url) => {
      const src2 = ctx.resolveImage ? ctx.resolveImage(url) : url;
      return hold(`<img alt="${esc(alt)}" src="${esc(safeUrl(src2))}" loading="lazy">`);
    });
    s = s.replace(/\[([^\]]+)\]\(\s*<?([^)\s>]*)>?(?:\s+"[^"]*")?\s*\)/g, (_, text, url) => {
      const u = safeUrl(url);
      const ext = /^https?:/i.test(u);
      const attrs = ext ? ' target="_blank" rel="noopener noreferrer"' : (u.startsWith('#') ? ` data-anchor="${esc(u.slice(1))}"` : ` data-mdlink="${esc(u)}"`);
      return hold(`<a href="${esc(ext || u.startsWith('#') ? u : '#')}"${attrs}>${inlineSimple(esc(text))}</a>`);
    });
    s = s.replace(/<(https?:\/\/[^>\s]+)>/g, (_, u) => hold(`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`));
    s = s.replace(/<br\s*\/?>/gi, () => hold('<br>'));
    s = esc(s);
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, (_, pre, u) => pre + hold(`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`));
    s = inlineSimple(s);
    // Los enlaces pueden contener código: se restaura en varias pasadas
    for (let k = 0; k < 4 && s.includes('\u0001'); k++) s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => tokens[Number(i)]);
    return s;
  }

  function inlineSimple(s) {
    return s
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\w])__([^_]+?)__(?!\w)/g, '$1<strong>$2</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');
  }

  function isBlockStart(t) {
    return /^\s{0,3}(#{1,6}\s|```|~~~|>|(-{3,}|\*{3,}|_{3,})\s*$)/.test(t) || LIST_RE.test(t) || /^\s*\|/.test(t);
  }

  function blocks(L, ctx) {
    // L: array de { t: texto, n: línea original }
    const out = [];
    let i = 0;
    while (i < L.length) {
      const t = L[i].t;
      if (!t.trim()) { i++; continue; }

      const fence = t.match(/^\s*(`{3,}|~{3,})\s*([^\s`]*)/);
      if (fence) {
        const mark = fence[1];
        const lang = fence[2] || '';
        const body = [];
        i++;
        while (i < L.length && !L[i].t.trim().startsWith(mark)) { body.push(L[i].t); i++; }
        i++;
        const cls = lang ? ` data-lang="${esc(lang)}"` : '';
        out.push(`<pre${cls}><code>${esc(body.join('\n'))}</code></pre>`);
        continue;
      }

      if (/^\s*<!--/.test(t)) {
        while (i < L.length && !L[i].t.includes('-->')) i++;
        i++;
        continue;
      }

      const h = t.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (h) {
        const level = h[1].length;
        const html = inline(h[2], ctx);
        const id = slug(h[2], ctx.used);
        ctx.toc.push({ level, text: h[2].replace(/[*_`]/g, ''), id });
        out.push(`<h${level} id="${id}" data-line="${L[i].n}">${html}</h${level}>`);
        i++;
        continue;
      }

      if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(t)) { out.push('<hr>'); i++; continue; }

      if (/\|/.test(t) && i + 1 < L.length && isSep(L[i + 1].t)) {
        const head = splitRow(t);
        const aligns = splitRow(L[i + 1].t).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : ''));
        i += 2;
        const rows = [];
        while (i < L.length && L[i].t.trim() && /\|/.test(L[i].t)) { rows.push(splitRow(L[i].t)); i++; }
        const al = (k) => (aligns[k] ? ` style="text-align:${aligns[k]}"` : '');
        out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c, k) => `<th${al(k)}>${inline(c, ctx)}</th>`).join('')}</tr></thead><tbody>${
          rows.map((r) => `<tr>${head.map((_, k) => `<td${al(k)}>${inline(r[k] || '', ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }

      if (/^\s{0,3}>/.test(t)) {
        const inner = [];
        while (i < L.length && L[i].t.trim() && (/^\s{0,3}>/.test(L[i].t) || !isBlockStart(L[i].t))) {
          inner.push({ t: L[i].t.replace(/^\s{0,3}>\s?/, ''), n: L[i].n });
          i++;
        }
        const first = inner.length ? inner[0].t : '';
        const alert = first.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
        if (alert) {
          inner.shift();
          out.push(`<blockquote class="callout callout-${alert[1].toLowerCase()}">${blocks(inner, ctx)}</blockquote>`);
        } else out.push(`<blockquote>${blocks(inner, ctx)}</blockquote>`);
        continue;
      }

      if (LIST_RE.test(t)) {
        const r = list(L, i, ctx);
        out.push(r.html);
        i = r.next;
        continue;
      }

      const para = [];
      while (i < L.length && L[i].t.trim() && !(para.length && isBlockStart(L[i].t))) {
        para.push(L[i].t.trim());
        i++;
      }
      out.push(`<p>${inline(para.join('\n'), ctx).replace(/\n/g, ' ')}</p>`);
    }
    return out.join('\n');
  }

  function list(L, i, ctx) {
    const first = L[i].t.match(LIST_RE);
    const base = indentOf(first[1]);
    const ordered = /\d/.test(first[2]);
    const startNum = ordered ? parseInt(first[2], 10) : 1;
    const items = [];
    while (i < L.length) {
      const m = L[i].t.match(LIST_RE);
      if (!m || indentOf(m[1]) !== base || /\d/.test(m[2]) !== ordered) break;
      const itemLine = L[i].n;
      const contentIndent = m[0].length;
      const head = [L[i].t.slice(m[0].length)];
      const child = [];
      i++;
      while (i < L.length) {
        const t = L[i].t;
        if (!t.trim()) {
          let j = i + 1;
          while (j < L.length && !L[j].t.trim()) j++;
          if (j < L.length && indentOf(L[j].t) > base) { child.push({ t: '', n: L[i].n }); i++; continue; }
          break;
        }
        const lm = t.match(LIST_RE);
        if (lm && indentOf(lm[1]) <= base) break;
        if (indentOf(t) > base) {
          const cut = Math.min(indentOf(t), contentIndent);
          child.push({ t: t.replace(new RegExp(`^\\s{0,${cut}}`), ''), n: L[i].n });
          i++;
          continue;
        }
        if (!child.length && !isBlockStart(t)) { head.push(t.trim()); i++; continue; }
        break;
      }
      items.push({ itemLine, head: head.join('\n'), child });
    }
    const tag = ordered ? 'ol' : 'ul';
    const hasTask = items.some((it) => /^\[[ xX~-]\]\s/.test(it.head));
    const html = `<${tag}${ordered && startNum !== 1 ? ` start="${startNum}"` : ''}${hasTask ? ' class="tasks"' : ''}>${items.map((it) => {
      const cb = it.head.match(/^\[([ xX~-])\]\s+([\s\S]*)$/);
      const childHtml = it.child.length ? blocks(it.child, ctx) : '';
      if (cb) {
        const checked = /[xX]/.test(cb[1]);
        const struck = /^\s*~~/.test(cb[2]);
        const kind = /^\**AC[-\s]?\d/i.test(cb[2]) ? 'ac' : /^\**(T|TASK|TAREA)[-\s]?\d/i.test(cb[2]) ? 't' : '';
        ctx.checks++;
        return `<li class="task${checked ? ' done' : ''}${struck ? ' struck' : ''}${kind ? ' k-' + kind : ''}"><label><input type="checkbox" data-line="${it.itemLine}" data-text="${esc(cb[2].split('\n')[0].trim())}"${checked ? ' checked' : ''}${ctx.readonly ? ' disabled' : ''}><span>${inline(cb[2], ctx).replace(/\n/g, ' ')}</span></label>${childHtml}</li>`;
      }
      return `<li>${inline(it.head, ctx).replace(/\n/g, ' ')}${childHtml}</li>`;
    }).join('')}</${tag}>`;
    return { html, next: i };
  }

  function render(text, opts = {}) {
    const raw = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    let start = 0;
    let fmHtml = '';
    if (raw[0] && raw[0].trim() === '---') {
      const end = raw.findIndex((l, k) => k > 0 && (l.trim() === '---' || l.trim() === '...'));
      if (end > 0) {
        fmHtml = `<details class="frontmatter"><summary>Frontmatter</summary><pre><code>${esc(raw.slice(1, end).join('\n'))}</code></pre></details>`;
        start = end + 1;
      }
    }
    const L = raw.slice(start).map((t, k) => ({ t: t.replace(/\t/g, '    '), n: k + start }));
    const ctx = { used: new Set(), toc: [], checks: 0, statuses: opts.statuses || null, readonly: !!opts.readonly, resolveImage: opts.resolveImage };
    const html = fmHtml + blocks(L, ctx);
    return { html, toc: ctx.toc, checks: ctx.checks };
  }

  window.MD = { render, esc };
})();
