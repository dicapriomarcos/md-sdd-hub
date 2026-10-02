/* MD SDD Hub · interfaz (JavaScript sin dependencias) */
(function () {
  'use strict';

  // ---------------------------------------------------------------- utilidades
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = window.MD.esc;
  const enc = encodeURIComponent;
  const view = $('#view');
  const dlg = $('#dlg');

  // ---------------------------------------------------------------- idioma
  // El texto en español es la clave; i18n.js contiene la traducción al inglés.
  let LANG = 'es';
  const DICT = window.I18N || {};
  function t(key, vars) {
    let s = (LANG !== 'es' && DICT[LANG] && DICT[LANG][key]) || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
    return s;
  }
  // n con singular/plural: tn(3, '{n} proyecto', '{n} proyectos')
  const tn = (n, one, many) => t(n === 1 ? one : many, { n });
  const locale = () => (LANG === 'en' ? 'en-GB' : 'es-ES');
  const browserLang = () => ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en');

  const api = {
    async get(url, params) {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const r = await fetch(url + qs, { headers: { 'X-SDD-Lang': LANG } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.error || r.statusText), { status: r.status });
      return j;
    },
    async post(url, body) {
      S.lastWrite = Date.now();
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SDD-Hub': '1', 'X-SDD-Lang': LANG }, body: JSON.stringify(body || {}) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.error || r.statusText), { status: r.status });
      return j;
    },
  };

  function toast(msg, opts = {}) {
    const el = document.createElement('div');
    el.className = 'toast' + (opts.error ? ' err' : '');
    el.innerHTML = `<span class="grow">${esc(msg)}</span>${opts.action ? `<button>${esc(opts.action)}</button>` : ''}`;
    if (opts.action) el.querySelector('button').onclick = () => { el.remove(); opts.onAction(); };
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), opts.ms || (opts.action ? 7000 : 3500));
  }
  const fail = (e) => toast(e.message || String(e), { error: true, ms: 6000 });

  function ago(ms) {
    if (!ms) return '—';
    const s = (Date.now() - ms) / 1000;
    if (s < 60) return t('ahora mismo');
    if (s < 3600) return t('hace {n} min', { n: Math.round(s / 60) });
    if (s < 86400) return t('hace {n} h', { n: Math.round(s / 3600) });
    if (s < 172800) return t('ayer');
    if (s < 30 * 86400) return t('hace {n} días', { n: Math.round(s / 86400) });
    return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const fullDate = (ms) => new Date(ms).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' });

  // ---------------------------------------------------------------- estado
  const S = {
    state: null,
    full: {},          // id → escaneo completo del proyecto
    file: null,        // archivo abierto { pid, rel, content, mtime, parsed }
    editing: false,
    dirty: false,
    route: null,
    boardFilter: { project: '', q: '', closed: false, type: 'feature' },
    statusType: 'feature',
    specFilter: {},
    docFilter: { q: '', unread: false, cat: '' },
    actFilter: { unread: false, project: '', cat: '' },
    sort: { key: 'id', dir: 1 },
  };
  // Etiquetas de serie de los estados: si no se han personalizado, se muestran en el idioma elegido.
  // Cada entrada: [variantes en español…, inglés]; se respeta la variante (género) de cada tipo.
  const DEFAULT_LABELS = {
    draft: [['Borrador'], 'Draft'], review: [['En revisión'], 'In review'], approved: [['Aprobada'], 'Approved'],
    'in-progress': [['En curso'], 'In progress'], verified: [['Verificada', 'Verificado'], 'Verified'],
    released: [['Publicada', 'Publicado'], 'Released'], superseded: [['Reemplazada'], 'Superseded'],
    proposed: [['Propuesta'], 'Proposed'], accepted: [['Aceptada'], 'Accepted'], rejected: [['Rechazada'], 'Rejected'],
    deprecated: [['Obsoleta'], 'Deprecated'], reported: [['Reportado'], 'Reported'], investigating: [['Investigando'], 'Investigating'],
  };
  // Tipos de documento (features, diseño, arquitectura, fixes) con sus propios estados
  const tx = (k) => k; // marca textos que se traducen más tarde con t()
  const TYPE_TEXT = {
    feature: [tx('Features'), tx('Feature'), tx('Características de la aplicación: qué hace, requisitos, criterios de aceptación y tareas.')],
    design: [tx('Diseño'), tx('Decisión de diseño'), tx('Decisiones de diseño UX/UI: pantallas, flujos, componentes, estilos, textos y accesibilidad.')],
    architecture: [tx('Arquitectura'), tx('Decisión de arquitectura'), tx('Decisiones de arquitectura (ADR): tecnologías, patrones, estructura de carpetas y clases, convenciones de código.')],
    fix: [tx('Fixes'), tx('Fix'), tx('Correcciones importantes: síntoma, causa raíz, solución y prevención.')],
  };
  const types = () => S.state.types;
  const typeOf = (id) => types().find((x) => x.id === id) || types()[0];
  const typeName = (id) => t((TYPE_TEXT[id] || [id])[0]);
  const typeOne = (id) => t((TYPE_TEXT[id] || [id, id])[1]);
  const typeDesc = (id) => t((TYPE_TEXT[id] || [id, id, ''])[2]);
  const typeStatuses = (id) => typeOf(id).statuses;
  const typeTag = (id) => `<span class="tag" style="background:color-mix(in srgb, ${typeOf(id).color} 14%, transparent);color:color-mix(in srgb, ${typeOf(id).color} 75%, var(--text))">${esc(typeOne(id))}</span>`;
  // unión de los estados de todos los tipos, para colores y etiquetas
  const allStatuses = () => {
    const seen = new Set(); const out = [];
    for (const tp of types()) for (const x of tp.statuses) if (!seen.has(x.id)) { seen.add(x.id); out.push(x); }
    return out;
  };
  const statusMap = () => Object.fromEntries(allStatuses().map((x) => [x.id, x]));
  const statusColor = (id) => (statusMap()[id] || {}).color || '#8b93a1';
  function labelOf(x) {
    const d = DEFAULT_LABELS[x.id];
    if (d && (d[0].includes(x.label) || x.label === d[1])) return LANG === 'en' ? d[1] : (d[0].includes(x.label) ? x.label : d[0][0]);
    return x.label;
  }
  const statusLabel = (id, type) => {
    const own = type ? typeStatuses(type).find((x) => x.id === id) : null;
    const st = own || statusMap()[id];
    return st ? labelOf(st) : id || t('Sin estado');
  };
  const isClosed = (id, type) => !!((type ? typeStatuses(type).find((x) => x.id === id) : null) || statusMap()[id] || {}).closed;
  const projById = (id) => S.state.projects.find((p) => p.id === id);
  const statusColorsForMd = () => Object.fromEntries(allStatuses().map((x) => [x.id, x.color]));

  function pill(status, spec) {
    if (!status) return `<span class="pill" style="--c:#b0b6c0">${spec && spec.statusRaw ? esc(spec.statusRaw) : t('Sin estado')}</span>`;
    const inf = spec && spec.statusInferred;
    const title = `${esc(status)}${inf ? ' ' + t('(deducido de las casillas/archivos)') : ''}${spec && spec.statusNote ? ' · ' + esc(spec.statusNote) : ''}`;
    return `<span class="pill${inf ? ' inferred' : ''}" style="--c:${statusColor(status)}" title="${title}">${esc(statusLabel(status, spec && spec.type))}</span>`;
  }
  function progress(done, total, cls = '') {
    if (!total) return '<span class="faint small">—</span>';
    const pct = Math.round((done / total) * 100);
    return `<div class="prog-wrap"><div class="progress ${pct === 100 ? 'ok' : ''} ${cls}"><span style="width:${pct}%"></span></div><small>${done}/${total}</small></div>`;
  }
  function stackbar(byStatus, type) {
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    if (!total) return '<div class="stackbar"></div>';
    const order = [...(type ? typeStatuses(type) : allStatuses()).map((x) => x.id), '_none'];
    return `<div class="stackbar">${order.filter((k) => byStatus[k]).map((k) =>
      `<span style="--c:${k === '_none' ? '#c4c9d1' : statusColor(k)};flex:${byStatus[k]}" title="${esc(k === '_none' ? t('Sin estado') : statusLabel(k, type))}: ${byStatus[k]}"></span>`).join('')}</div>`;
  }
  const catLabel = (c) => ({ spec: t('spec'), agent: t('agentes'), skill: t('skill'), doc: t('doc'), review: t('revisión') }[c] || c);
  const catTag = (c) => `<span class="tag ${c}">${esc(catLabel(c))}</span>`;
  const alertIcon = { warn: '⚠', info: 'ℹ', review: '↻' };

  // ---------------------------------------------------------------- rutas
  //  #/  ·  #/actividad  ·  #/tablero  ·  #/ajustes  ·  #/buscar/<q>
  //  #/p/<id>[/<tab>]  ·  #/p/<id>/s/<key>[?f=<rel>]  ·  #/p/<id>/f/<rel>
  function parseRoute() {
    const h = decodeURI(location.hash.replace(/^#/, '')) || '/';
    const [pathPart, query] = h.split('?');
    const parts = pathPart.split('/').filter(Boolean);
    const q = Object.fromEntries(new URLSearchParams(query || ''));
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'actividad') return { name: 'activity' };
    if (parts[0] === 'tablero') return { name: 'board' };
    if (parts[0] === 'ajustes') return { name: 'settings' };
    if (parts[0] === 'buscar') return { name: 'search', q: decodeURIComponent(parts.slice(1).join('/')) };
    if (parts[0] === 'p' && parts[1]) {
      if (parts[2] === 's') return { name: 'spec', pid: parts[1], key: decodeURIComponent(parts.slice(3).join('/')), f: q.f };
      if (parts[2] === 'f') return { name: 'file', pid: parts[1], rel: decodeURIComponent(parts.slice(3).join('/')), edit: q.edit === '1' };
      // compatibilidad con enlaces antiguos: «specs» → features y «tablero» → tablero de features
      const tab = !parts[2] || parts[2] === 'specs' ? 'feature' : parts[2] === 'tablero' ? 'feature' : parts[2];
      return { name: 'project', pid: parts[1], tab, view: parts[2] === 'tablero' ? 'board' : (q.v || 'list') };
    }
    return { name: 'home' };
  }
  const go = (hash) => { location.hash = hash; };
  const specHref = (pid, key, f) => `#/p/${pid}/s/${enc(key)}${f ? '?f=' + enc(f) : ''}`;
  const fileHref = (pid, rel) => `#/p/${pid}/f/${enc(rel)}`;

  function hrefForDoc(pid, rel) {
    const p = S.full[pid] || projById(pid);
    if (p && p.specs) {
      const s = p.specs.find((x) => x.files.some((f) => f.rel === rel));
      if (s) return specHref(pid, s.key, s.files.length > 1 ? rel : null);
    }
    return fileHref(pid, rel);
  }

  // ---------------------------------------------------------------- carga
  async function loadState() {
    S.state = await api.get('/api/state');
    applyLang();
    applyTheme();
    renderSidebar();
    $('#sync').textContent = t('Actualizado {time}', { time: new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
  }
  async function loadFull(pid) {
    S.full[pid] = await api.get('/api/project', { id: pid });
    return S.full[pid];
  }
  function applyTheme() {
    const th = S.state.settings.theme;
    if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th;
    else delete document.documentElement.dataset.theme;
  }
  function applyLang() {
    LANG = S.state.settings.lang === 'en' || S.state.settings.lang === 'es' ? S.state.settings.lang : browserLang();
    document.documentElement.lang = LANG;
    $('#search-input').placeholder = t('Buscar en specs y documentos de todos los proyectos…  (Ctrl+K)');
    $('.topbar [data-action=add-project]').textContent = t('+ Agregar proyecto');
    $('#sync').title = t('Se actualiza solo cada pocos segundos');
  }
  async function setLang(lang) {
    await api.post('/api/settings', { lang });
    await loadState();
    S.full = {};
    render();
  }

  // ---------------------------------------------------------------- barra lateral
  function renderSidebar() {
    const r = S.route || {};
    const st = S.state;
    const totalUnread = st.projects.reduce((a, p) => a + (p.summary ? p.summary.unread : 0), 0);
    const navItem = (hash, ico, label, active, badge = '') =>
      `<a href="${hash}" class="${active ? 'active' : ''}"><span class="ico">${ico}</span><span class="grow">${label}</span>${badge}</a>`;
    const themeLabel = st.settings.theme === 'dark' ? t('☾ Oscuro') : st.settings.theme === 'light' ? t('☀ Claro') : t('◐ Auto');
    $('#sidebar').innerHTML = `
      <div class="brand"><div class="brand-mark"><svg viewBox="0 0 16 16"><path d="M3 4h10M3 8h7M3 12h4" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div>
        <div>MD SDD Hub <span class="faint small" style="font-weight:500" title="${t('Versión')}">v${esc(st.version || '')}</span><small>${t('Specs y .md de tus proyectos')}</small></div></div>
      <nav class="nav">
        ${navItem('#/', '◧', t('Panel'), r.name === 'home')}
        ${navItem('#/actividad', '◷', t('Cambios en .md'), r.name === 'activity', totalUnread ? `<span class="badge unread" title="${t('Sin leer')}">${totalUnread}</span>` : '')}
        ${navItem('#/tablero', '▥', t('Tableros'), r.name === 'board')}
      </nav>
      <div class="side-section"><span>${t('Proyectos')}</span><button data-action="add-project" title="${t('Agregar proyecto')}">+</button></div>
      <div class="projects">
        ${st.projects.length ? st.projects.map((p) => {
          const s = p.summary;
          const active = r.pid === p.id;
          return `<a class="proj-link ${active ? 'active' : ''}" href="#/p/${p.id}">
            <div class="top"><span class="name">${esc(p.name)}</span>
              ${s && s.reviewsPending ? `<span class="badge review" title="${t('Cambios tuyos pendientes de revisión por la IA')}">↻${s.reviewsPending}</span>` : ''}
              ${s && s.unread ? `<span class="badge unread" title="${t('.md nuevos o modificados sin leer')}">${s.unread}</span>` : ''}
              ${!p.ok ? `<span class="badge warn" title="${t('Carpeta no accesible')}">!</span>` : ''}</div>
            ${s ? `<div class="meta"><span>${tn(s.active, '{n} activa', '{n} activas')}${s.proposed ? ' · ' + tn(s.proposed, '{n} propuesta', '{n} propuestas') : ''}</span>${s.alerts ? `<span style="color:var(--warn)">⚠ ${s.alerts}</span>` : ''}</div>` : `<div class="meta">${esc(p.error || '')}</div>`}
          </a>`;
        }).join('') : `<div class="faint small" style="padding:6px 10px">${t('Aún no hay proyectos.')}</div>`}
      </div>
      <div class="side-foot">
        <a href="#/ajustes">⚙ ${t('Ajustes')}</a>
        <button data-action="cycle-theme" title="${t('Tema')}">${themeLabel}</button>
        <button data-action="toggle-lang" title="${t('Idioma')}">${LANG === 'es' ? 'ES · <span class="faint">EN</span>' : '<span class="faint">ES</span> · EN'}</button>
      </div>`;
  }

  // ---------------------------------------------------------------- render principal
  async function render() {
    if (S.editing && S.dirty) {
      const r = parseRoute();
      const same = S.route && r.name === S.route.name && r.pid === S.route.pid && (r.rel === S.route.rel || r.key === S.route.key);
      if (!same && !confirm(t('Tienes cambios sin guardar. ¿Descartarlos?'))) {
        history.replaceState(null, '', S.lastHash);
        return;
      }
    }
    S.route = parseRoute();
    S.lastHash = location.hash;
    if (!(S.route.name === 'file' && S.route.edit) && !(S.route.name === 'spec' && S.editing && S.route.key === (S.file || {}).specKey)) {
      S.editing = false; S.dirty = false;
    }
    $('#sidebar').classList.remove('open');
    renderSidebar();
    const slow = setTimeout(() => { if (!view.querySelector('.loading')) view.insertAdjacentHTML('afterbegin', `<div class="loading small faint">${t('Cargando…')}</div>`); }, 350);
    try {
      switch (S.route.name) {
        case 'home': return await renderHome();
        case 'activity': return await renderActivity();
        case 'board': return await renderBoardPage();
        case 'settings': return renderSettings();
        case 'search': return await renderSearch(S.route.q);
        case 'project': return await renderProject();
        case 'spec': return await renderSpec();
        case 'file': return await renderFile();
        default: return renderHome();
      }
    } catch (e) {
      view.innerHTML = `<div class="card card-pad"><b>${t('No se ha podido cargar esta vista.')}</b><p class="muted">${esc(e.message)}</p><a class="btn" href="#/">${t('Volver al panel')}</a></div>`;
    } finally {
      clearTimeout(slow);
    }
  }

  // ---------------------------------------------------------------- bienvenida
  async function renderWelcome() {
    let roots = [];
    try { roots = (await api.get('/api/fs')).suggestions || []; } catch {}
    view.innerHTML = `<div class="welcome">
      <div class="brand-mark" style="width:52px;height:52px;margin:0 auto;border-radius:14px"><svg viewBox="0 0 16 16" style="width:26px;height:26px"><path d="M3 4h10M3 8h7M3 12h4" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div>
      <h1>${t('Todas tus specs y .md, bajo control')}</h1>
      <p>${t('Agrega las carpetas de tus proyectos. MD SDD Hub lee las specs, los documentos de agentes (CLAUDE.md, AGENTS.md, GEMINI.md, .codex…), las skills y la carpeta docs, y te avisa de cada .md que la IA cree o modifique.')}</p>
      <div class="steps">
        <div class="card"><b>${t('1 · Agrega proyectos')}</b><span>${t('Una a una o buscando proyectos dentro de htdocs, sites, etc.')}</span></div>
        <div class="card"><b>${t('2 · Instala el kit SDD')}</b><span>${t('Instrucciones para que cualquier IA (Codex, Claude Code, Gemini…) escriba los documentos siempre en el mismo formato.')}</span></div>
        <div class="card"><b>${t('3 · Revisa y edita')}</b><span>${t('Edita desde aquí y la IA recibe tus cambios para revisarlos.')}</span></div>
      </div>
      <div class="row" style="justify-content:center;gap:10px">
        <button class="btn btn-primary" data-action="add-project" style="padding:9px 18px;font-size:15px">${t('+ Agregar proyecto')}</button>
        <button class="btn" data-action="toggle-lang" style="padding:9px 14px">${LANG === 'es' ? 'English' : 'Español'}</button>
      </div>
      ${roots.length ? `<p class="small" style="margin-top:22px">${t('O busca proyectos directamente en:')}</p><div class="roots">${roots.map((r) => `<button class="btn btn-sm" data-action="discover" data-root="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : ''}
    </div>`;
  }

  // ---------------------------------------------------------------- panel
  async function renderHome() {
    const st = S.state;
    if (!st.projects.length) return renderWelcome();
    let act = [];
    try { act = (await api.get('/api/activity', { limit: 14 })).items; } catch {}
    const all = st.projects.filter((p) => p.ok).flatMap((p) => p.specs.map((s) => ({ ...s, pid: p.id, pname: p.name })));
    const sum = (fn) => st.projects.reduce((a, p) => a + (p.summary ? fn(p.summary) : 0), 0);
    const featuresActive = sum((x) => (x.byType && x.byType.feature ? x.byType.feature.active : 0));
    const fixesOpen = sum((x) => (x.byType && x.byType.fix ? x.byType.fix.active : 0));
    const proposed = sum((x) => x.proposed || 0);
    const inProgress = all.filter((s) => (s.status === 'in-progress' || s.status === 'investigating') && !s.archived).sort((a, b) => b.mtime - a.mtime);
    const alerts = all.flatMap((s) => s.alerts.filter((a) => a.level !== 'info').map((a) => ({ ...a, s })));
    const unread = st.projects.reduce((a, p) => a + (p.summary ? p.summary.unread : 0), 0);
    const reviews = st.projects.reduce((a, p) => a + (p.summary ? p.summary.reviewsPending : 0), 0);

    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Panel')}</h1><div class="sub">${new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })} · ${tn(st.projects.length, '{n} proyecto', '{n} proyectos')}</div></div></div>
      <div class="kpis">
        <a class="card kpi" href="#/tablero"><div class="v" style="color:${typeOf('feature').color}">${featuresActive}</div><div class="l">${t('Features activas')}</div></a>
        <div class="card kpi"><div class="v" style="color:${typeOf('fix').color}">${fixesOpen}</div><div class="l">${t('Fixes abiertos')}</div></div>
        <div class="card kpi"><div class="v" style="color:${statusColor('proposed')}">${proposed}</div><div class="l">${t('Decisiones propuestas')}</div></div>
        <a class="card kpi" href="#/tablero"><div class="v" style="color:${statusColor('in-progress')}">${inProgress.length}</div><div class="l">${t('En curso')}</div></a>
        <a class="card kpi" href="#/actividad"><div class="v" style="color:var(--unread)">${unread}</div><div class="l">${t('.md sin leer')}</div></a>
        <div class="card kpi"><div class="v" style="color:var(--review)">${reviews}</div><div class="l">${t('Revisiones pendientes de la IA')}</div></div>
        <div class="card kpi"><div class="v" style="color:var(--warn)">${alerts.length}</div><div class="l">${t('Alertas SDD')}</div></div>
      </div>
      <div class="proj-grid">${st.projects.map(projCard).join('')}</div>
      <div class="grid-2">
        <div class="card">
          <div class="card-head"><h3>${t('Últimos cambios en .md')}</h3><a href="#/actividad" class="small">${t('Ver todos →')}</a></div>
          <div class="list">${act.length ? act.map(actRow).join('') : `<div class="empty">${t('Sin cambios todavía.')}</div>`}</div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="card-head"><h3>${t('En curso')}</h3></div>
            <div class="list">${inProgress.length ? inProgress.slice(0, 8).map((s) => `
              <a class="list-item" href="${specHref(s.pid, s.key)}">
                <div class="grow"><div class="row"><span class="idchip">${esc(s.id || '')}</span><span class="t ellipsis">${esc(s.title)}</span>${s.type !== 'feature' ? typeTag(s.type) : ''}</div>
                <div class="sub">${esc(s.pname)} · ${ago(s.mtime)}</div></div>
                <div style="width:120px">${progress(s.checks.done, s.checks.total)}</div></a>`).join('') : `<div class="empty">${t('Nada en curso.')}</div>`}</div>
          </div>
          <div class="card">
            <div class="card-head"><h3>${t('Requieren atención')}</h3><span class="badge warn">${alerts.length}</span></div>
            <div class="list">${alerts.length ? alerts.slice(0, 12).map((a) => `
              <a class="list-item lv-${a.level}" href="${specHref(a.s.pid, a.s.key)}">
                <span class="ic" style="color:${a.level === 'review' ? 'var(--review)' : 'var(--warn)'}">${alertIcon[a.level]}</span>
                <div class="grow"><div class="row"><span class="idchip">${esc(a.s.id || '')}</span><span class="t ellipsis">${esc(a.s.title)}</span></div>
                <div class="sub">${esc(a.text)} · ${esc(a.s.pname)}</div></div></a>`).join('') : `<div class="empty">${t('Todo en orden.')}</div>`}</div>
          </div>
        </div>
      </div>`;
  }

  function projCard(p) {
    if (!p.ok) return `<div class="card proj-card"><h4>${esc(p.name)}</h4><div class="path">${esc(p.path)}</div><div class="banner warn">${esc(p.error)}</div>
      <div><button class="btn btn-sm btn-danger" data-action="remove-project" data-pid="${p.id}">${t('Quitar')}</button></div></div>`;
    const s = p.summary;
    const kit = p.compat.skill != null
      ? (p.compat.outdated ? `<span class="badge warn" title="${t('Instrucciones SDD de una versión anterior')}">SDD ↑</span>` : `<span class="badge ok" title="${t('Instrucciones SDD instaladas')}">SDD ✓ ${esc((p.compat.kitLang || '').toUpperCase())}</span>`)
      : `<span class="tag" title="${t('Kit MD SDD Hub sin instalar')}">${t('sin kit')}</span>`;
    return `<a class="card proj-card" href="#/p/${p.id}">
      <div class="row"><h4 class="grow ellipsis">${esc(p.name)}</h4>${kit}</div>
      <div class="path ellipsis" title="${esc(p.path)}">${esc(p.path)}</div>
      ${s.total ? stackbar(s.byStatus, 'feature') : `<div class="small faint">${t('Sin specs detectadas')} · ${tn(s.docs, '{n} documento', '{n} documentos')}</div>`}
      <div class="nums">
        ${types().filter((tp) => s.byType && s.byType[tp.id] && s.byType[tp.id].total).map((tp) => `<span><b>${s.byType[tp.id].total}</b> ${esc(typeName(tp.id))}</span>`).join('')}
        ${s.unread ? `<span style="color:var(--unread)"><b style="color:inherit">${s.unread}</b> ${t('sin leer')}</span>` : ''}
        ${s.reviewsPending ? `<span style="color:var(--review)"><b style="color:inherit">${s.reviewsPending}</b> ${t('por revisar IA')}</span>` : ''}
        ${s.alerts ? `<span style="color:var(--warn)">⚠ <b style="color:inherit">${s.alerts}</b></span>` : ''}
        <span class="faint">${ago(s.lastActivity)}</span>
      </div></a>`;
  }

  function actRow(d) {
    return `<a class="list-item" href="${hrefForDoc(d.projectId, d.rel)}" title="${esc(fullDate(d.mtime))}">
      ${d.unread ? `<span class="dot" title="${t('Sin leer')}"></span>` : '<span style="width:8px"></span>'}
      <div class="grow"><div class="t ellipsis mono" style="font-weight:${d.unread ? 650 : 450}">${esc(d.rel)}</div>
      <div class="sub">${esc(d.project)} · ${ago(d.mtime)}</div></div>${catTag(d.category)}</a>`;
  }

  // ---------------------------------------------------------------- actividad
  async function renderActivity() {
    const { items } = await api.get('/api/activity', { limit: 400 });
    const f = S.actFilter;
    const list = items.filter((d) => (!f.unread || d.unread) && (!f.project || d.projectId === f.project) && (!f.cat || d.category === f.cat));
    const unreadCount = items.filter((d) => d.unread).length;
    const cats = ['spec', 'agent', 'skill', 'doc', 'review'];
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Cambios en .md')}</h1><div class="sub">${t('Todos los Markdown de tus proyectos, del más reciente al más antiguo. Un punto azul indica que ha cambiado desde la última vez que lo abriste.')}</div></div>
        <div class="row">${f.project ? `<button class="btn" data-action="mark-all-seen" data-pid="${f.project}">${t('Marcar todo como leído')}</button>` : ''}</div></div>
      <div class="chips">
        <button class="chip ${f.unread ? 'on' : ''}" data-action="act-filter" data-k="unread">${t('Solo sin leer')} <span class="n">${unreadCount}</span></button>
        <select class="input" style="width:auto" data-change="act-project"><option value="">${t('Todos los proyectos')}</option>${S.state.projects.map((p) => `<option value="${p.id}" ${f.project === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        ${cats.map((c) => `<button class="chip ${f.cat === c ? 'on' : ''}" data-action="act-filter" data-k="cat" data-v="${c}">${catLabel(c)}</button>`).join('')}
      </div>
      <div class="card"><div class="list">${list.length ? list.slice(0, 300).map(actRow).join('') : `<div class="empty">${t('No hay documentos con estos filtros.')}</div>`}</div></div>`;
  }

  // ---------------------------------------------------------------- tablero
  function boardHtml(specs, showProject, type) {
    type = type || 'feature';
    specs = specs.filter((x) => x.type === type);
    const cols = [...typeStatuses(type).map((x) => x.id), '_none'];
    const f = S.boardFilter;
    const q = f.q.toLowerCase();
    const filtered = specs.filter((s) => !s.archived && (!q || (s.title + ' ' + (s.id || '')).toLowerCase().includes(q)));
    const visible = cols.filter((c) => c !== '_none' || filtered.some((x) => !x.status)).filter((c) => f.closed || !isClosed(c, type));
    if (!filtered.length && !q) return `<div class="card empty">${t('No hay documentos de este tipo.')}</div>`;
    return `<div class="board">${visible.map((c) => {
      const items = filtered.filter((s) => (s.status || '_none') === c).sort((a, b) => b.mtime - a.mtime);
      return `<div class="col" data-drop="${c}">
        <div class="col-head"><span class="pill" style="--c:${c === '_none' ? '#b0b6c0' : statusColor(c)}">${esc(c === '_none' ? t('Sin estado') : statusLabel(c, type))}</span><span class="n">${items.length}</span></div>
        <div class="col-body">${items.map((s) => {
          const warns = s.alerts.filter((a) => a.level === 'warn');
          return `
          <div class="kcard" draggable="true" data-drag="${esc(s.key)}" data-pid="${s.pid}" data-href="${specHref(s.pid, s.key)}">
            <div class="row" style="gap:6px">${s.id ? `<span class="idchip">${esc(s.id)}</span>` : ''}${s.unread ? `<span class="dot" title="${t('Modificada sin leer')}"></span>` : ''}<span class="grow"></span>
              ${s.alerts.some((a) => a.level === 'review') ? `<span class="badge review" title="${t('Pendiente de revisión por la IA')}">↻</span>` : ''}
              ${warns.length ? `<span class="badge warn" title="${esc(warns.map((a) => a.text).join('\n'))}">⚠</span>` : ''}</div>
            <div class="kt">${esc(s.title)}</div>
            ${s.checks.total ? progress(s.checks.done, s.checks.total) : ''}
            <div class="kf">${showProject ? `<span class="tag">${esc(s.pname)}</span>` : ''}<span>${ago(s.mtime)}</span>${s.statusNote ? `<span title="${t('Nota en el estado')}">· ${esc(s.statusNote)}</span>` : ''}</div>
          </div>`;
        }).join('')}</div></div>`;
    }).join('')}</div>`;
  }

  function typeChips(current, action) {
    return types().map((tp) => `<button class="chip ${current === tp.id ? 'on' : ''}" data-action="${action}" data-type="${tp.id}"><span class="dot" style="background:${tp.color}"></span>${esc(typeName(tp.id))}</button>`).join('');
  }

  function boardControls(withProject) {
    const f = S.boardFilter;
    return `<div class="chips">
      ${withProject ? typeChips(f.type, 'board-type') + '<span style="width:8px"></span>' : ''}
      <input class="input" style="width:240px" placeholder="${t('Filtrar por título o ID…')}" value="${esc(f.q)}" data-input="board-q">
      ${withProject ? `<select class="input" style="width:auto" data-change="board-project"><option value="">${t('Todos los proyectos')}</option>${S.state.projects.map((p) => `<option value="${p.id}" ${f.project === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
      <button class="chip ${f.closed ? 'on' : ''}" data-action="board-closed">${t('Mostrar cerradas')}</button>
      <span class="small faint">${t('Arrastra una tarjeta a otra columna para cambiar su estado (se edita el .md).')}</span>
    </div>`;
  }

  async function renderBoardPage() {
    const f = S.boardFilter;
    const specs = S.state.projects.filter((p) => p.ok && (!f.project || p.id === f.project)).flatMap((p) => p.specs.map((s) => ({ ...s, pid: p.id, pname: p.name })));
    const scope = f.project ? esc(projById(f.project).name) : t('todos los proyectos');
    const n = specs.filter((x) => x.type === f.type && !x.archived).length;
    view.innerHTML = `<div class="page-head"><div><h1>${t('Tableros')}</h1><div class="sub">${esc(typeName(f.type))} · ${tn(n, '{n} documento', '{n} documentos')} · ${scope}</div></div></div>
      ${boardControls(true)}<div id="board-zone">${boardHtml(specs, !f.project, f.type)}</div>`;
  }

  async function changeStatus(pid, key, status, note, silent) {
    const p = S.full[pid] || projById(pid);
    const spec = p.specs.find((s) => s.key === key);
    const old = spec ? spec.status : null;
    await api.post('/api/spec/status', { id: pid, key, status, note });
    await loadState();
    if (S.full[pid]) await loadFull(pid);
    if (!silent) {
      toast(`${spec && spec.id ? spec.id : 'Spec'} → ${statusLabel(status, spec && spec.type)}`, old && old !== status ? {
        action: t('Deshacer'),
        onAction: () => changeStatus(pid, key, old, t('Deshecho: vuelta a {s}', { s: old }), true).then(render).catch(fail),
      } : {});
    }
  }

  // ---------------------------------------------------------------- proyecto
  async function renderProject() {
    const pid = S.route.pid;
    const p = await loadFull(pid);
    const tab = S.route.tab;
    if (!p.ok) {
      view.innerHTML = `<div class="page-head"><div><h1>${esc(p.name)}</h1><div class="sub mono">${esc(p.path)}</div></div></div>
        <div class="banner warn"><span class="grow">${esc(p.error)}</span><button class="btn btn-danger" data-action="remove-project" data-pid="${pid}">${t('Quitar de MD SDD Hub')}</button></div>`;
      return;
    }
    const s = p.summary;
    const c = p.compat;
    const kitMissing = c.skill == null;
    const typeCount = (id) => (s.byType && s.byType[id] ? s.byType[id].total : 0);
    const tabs = [
      ...types().map((tp) => [tp.id, `<span class="dot" style="background:${tp.color}"></span>${esc(typeName(tp.id))} <span class="badge" style="background:var(--panel-2)">${typeCount(tp.id)}</span>`]),
      ['docs', `${t('Documentos')}${s.unread ? ` <span class="badge unread">${s.unread}</span>` : ''}`],
      ['skills', `${t('Skills')} <span class="badge" style="background:var(--panel-2)">${p.skills.length}</span>`],
      ['revisiones', `${t('Revisiones IA')}${s.reviewsPending ? ` <span class="badge review">${s.reviewsPending}</span>` : ''}`],
      ['sdd', `${t('Configurar SDD')}${kitMissing ? ' <span class="badge warn">!</span>' : ''}`],
    ];
    let body = '';
    if (TYPE_TEXT[tab]) body = typeTab(p, tab, S.route.view);
    else if (tab === 'docs') body = projectDocs(p);
    else if (tab === 'skills') body = await projectSkills(p);
    else if (tab === 'revisiones') body = projectReviews(p);
    else if (tab === 'sdd') body = projectSetup(p);

    const reviewHint = c.hook ? t('Se le recordará en tu próximo mensaje a Claude Code.') : t('Pídele a tu IA que revise <code>.sdd/review/</code> (en Claude Code puedes instalar el hook en Configurar SDD).');
    view.innerHTML = `
      <div class="page-head">
        <div style="min-width:0"><h1>${esc(p.name)} <button class="icon-btn" data-action="rename-project" data-pid="${pid}" title="${t('Renombrar')}">✎</button></h1>
          <div class="sub mono small ellipsis" title="${esc(p.path)}">${esc(p.path)}</div></div>
        <div class="row wrap">
          <button class="btn" data-action="open" data-pid="${pid}" data-rel="." data-how="folder">${t('Abrir carpeta')}</button>
          <button class="btn" data-action="open" data-pid="${pid}" data-rel="." data-how="editor">${t('Abrir en editor')}</button>
          <button class="btn btn-primary" data-action="new-spec" data-pid="${pid}" data-type="${TYPE_TEXT[tab] ? tab : 'feature'}">${t('+ Nuevo documento')}</button>
        </div>
      </div>
      ${kitMissing && tab !== 'sdd' ? `<div class="banner info"><span>💡</span><span class="grow">${t('Instala las <b>instrucciones SDD</b> en este proyecto para que cualquier IA (Codex, Claude Code, Gemini…) escriba los documentos siempre en el formato que esta app entiende y revise los cambios que hagas desde aquí.')}</span><button class="btn btn-sm btn-primary" data-action="prepare-project" data-pid="${pid}">${t('Instalar')}</button></div>` : ''}
      ${c.outdated ? `<div class="banner warn"><span>↑</span><span class="grow">${t('Las instrucciones SDD de este proyecto son de una versión anterior. Al actualizar se guardan en <code>.sdd/</code> para cualquier IA y se renueva el enlace de AGENTS.md.')}</span><button class="btn btn-sm btn-primary" data-action="update-kit" data-pid="${pid}">${t('Actualizar')}</button></div>` : ''}
      ${s.reviewsPending && tab !== 'revisiones' ? `<div class="banner review"><span>↻</span><span class="grow">${t('La IA tiene <b>{n}</b> de cambios tuyos pendientes de revisar.', { n: tn(s.reviewsPending, '{n} aviso', '{n} avisos') })} ${reviewHint}</span><a class="btn btn-sm" href="#/p/${pid}/revisiones">${t('Ver')}</a></div>` : ''}
      <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/p/${pid}/${k}" class="${tab === k ? 'active' : ''}">${l}</a>`).join('')}</nav>
      ${body}`;
  }

  function typeTab(p, type, mode) {
    const pid = p.id;
    const dir = (p.compat.dirs && p.compat.dirs[type]) || typeOf(type).dirs[0];
    const has = p.specs.some((x) => x.type === type);
    const head = `<div class="toolbar">
        <div class="seg"><a href="#/p/${pid}/${type}" class="${mode !== 'board' ? 'on' : ''}">☰ ${t('Lista')}</a><a href="#/p/${pid}/${type}?v=board" class="${mode === 'board' ? 'on' : ''}">▥ ${t('Tablero')}</a></div>
        <span class="small muted grow">${typeDesc(type)} <span class="faint">· <code>${esc(dir)}/</code></span></span>
        <button class="btn btn-sm" data-action="new-spec" data-pid="${pid}" data-type="${type}">+ ${esc(typeOne(type))}</button>
      </div>`;
    if (!has) return head + emptyType(p, type, dir);
    if (mode === 'board') return head + boardControls(false) + `<div id="board-zone">${boardHtml(p.specs.map((x) => ({ ...x, pid, pname: p.name })), false, type)}</div>`;
    return head + projectSpecs(p, type);
  }

  function emptyType(p, type, dir) {
    const tips = {
      feature: t('Prueba en Claude Code: <i>«crea una spec para …»</i>.'),
      design: t('Prueba en Claude Code: <i>«documenta como decisión de diseño que …»</i>.'),
      architecture: t('Prueba en Claude Code: <i>«crea un ADR para usar …»</i> o <i>«documenta la convención de …»</i>.'),
      fix: t('Prueba en Claude Code: <i>«documenta este bug como FIX y corrígelo»</i>.'),
    };
    return `<div class="card empty" style="padding:36px">
      <p><b>${t('Todavía no hay documentos de este tipo.')}</b></p>
      <p class="muted">${t('Se guardan en <code>{dir}/</code> con el prefijo <code>{prefix}</code>.', { dir: esc(dir), prefix: esc(typeOf(type).prefix) })} ${type === 'feature' ? t('También se leen <code>.specify/specs</code>, <code>.kiro/specs</code> y <code>openspec/changes</code>.') : ''}</p>
      <p class="muted small">${tips[type] || ''}</p>
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn btn-primary" data-action="new-spec" data-pid="${p.id}" data-type="${type}">+ ${esc(typeOne(type))}</button>${p.compat.skill ? '' : `<a class="btn" href="#/p/${p.id}/sdd">${t('Instalar kit SDD')}</a>`}</div></div>`;
  }

  function projectSpecs(p, type) {
    const pid = p.id;
    const fkey = pid + ':' + type;
    const f = S.specFilter[fkey] || (S.specFilter[fkey] = { status: '', q: '', archived: false });
    const specs = p.specs.filter((x) => x.type === type);
    const counts = {};
    specs.forEach((x) => { if (!x.archived) { const k = x.status || '_none'; counts[k] = (counts[k] || 0) + 1; } });
    const q = f.q.toLowerCase();
    let list = specs.filter((s) => (f.archived || !s.archived) && (!f.status || (s.status || '_none') === f.status) && (!q || (s.title + ' ' + (s.id || '') + ' ' + s.key).toLowerCase().includes(q)));
    const { key, dir } = S.sort;
    const val = (s) => key === 'id' ? (s.id || s.key) : key === 'title' ? s.title : key === 'status' ? typeStatuses(type).findIndex((x) => x.id === s.status) : key === 'progress' ? (s.checks.total ? s.checks.done / s.checks.total : -1) : key === 'mtime' ? s.mtime : s.alerts.length;
    list = list.sort((a, b) => { const va = val(a); const vb = val(b); return (typeof va === 'string' ? va.localeCompare(vb, locale(), { numeric: true }) : va - vb) * dir; });
    const th = (k, l, cls = '') => `<th class="${cls}" data-action="sort" data-k="${k}">${l}${key === k ? (dir > 0 ? ' ↑' : ' ↓') : ''}</th>`;
    return `
      <div class="chips">
        <input class="input" style="width:220px" placeholder="${t('Filtrar…')}" value="${esc(f.q)}" data-input="spec-q" data-pid="${fkey}">
        <button class="chip ${!f.status ? 'on' : ''}" data-action="spec-status-filter" data-pid="${fkey}" data-v="">${t('Todas')} <span class="n">${specs.filter((x) => !x.archived).length}</span></button>
        ${[...typeStatuses(type).map((x) => x.id), '_none'].filter((k) => counts[k]).map((k) => `<button class="chip ${f.status === k ? 'on' : ''}" data-action="spec-status-filter" data-pid="${fkey}" data-v="${k}"><span class="pill" style="--c:${k === '_none' ? '#b0b6c0' : statusColor(k)};padding:0;background:none">${esc(k === '_none' ? t('Sin estado') : statusLabel(k, type))}</span><span class="n">${counts[k]}</span></button>`).join('')}
        ${specs.some((x) => x.archived) ? `<button class="chip ${f.archived ? 'on' : ''}" data-action="spec-archived" data-pid="${fkey}">${t('Archivadas')}</button>` : ''}
      </div>
      <div class="card" style="overflow:auto"><table class="data">
        <thead><tr>${th('id', 'ID')}${th('title', t('Título'))}${th('status', t('Estado'))}${th('progress', t('Progreso'), 'hide-m')}${th('mtime', t('Modificada'), 'hide-m')}${th('alerts', t('Alertas'), 'hide-m')}</tr></thead>
        <tbody>${list.map((s) => `
          <tr data-href="${specHref(pid, s.key)}">
            <td class="idchip">${esc(s.id || '—')}</td>
            <td><div class="title-cell">${s.unread ? `<span class="dot" title="${t('Modificada sin leer')}"></span>` : ''}<span class="ellipsis" style="font-weight:550">${esc(s.title)}</span>${s.kind === 'folder' ? `<span class="tag">${tn(s.files.length, '{n} archivo', '{n} archivos')}</span>` : ''}${s.format !== 'sddhub' ? `<span class="tag" title="${t('Formato detectado')}">${esc(s.format)}</span>` : ''}</div></td>
            <td>${pill(s.status, s)}</td>
            <td class="hide-m" style="min-width:140px">${progress(s.checks.done, s.checks.total)}</td>
            <td class="hide-m nowrap muted small" title="${esc(fullDate(s.mtime))}">${ago(s.mtime)}</td>
            <td class="hide-m">${s.alerts.map((a) => `<span class="badge ${a.level === 'review' ? 'review' : a.level === 'warn' ? 'warn' : 'unread'}" title="${esc(a.text)}">${alertIcon[a.level]}</span>`).join(' ')}</td>
          </tr>`).join('')}</tbody></table></div>`;
  }

  function projectDocs(p) {
    const pid = p.id;
    const f = S.docFilter;
    const q = f.q.toLowerCase();
    const docs = p.docs.filter((d) => (!f.unread || d.unread) && (!f.cat || d.category === f.cat) && (!q || d.rel.toLowerCase().includes(q)))
      .sort((a, b) => {
        const da = a.rel.includes('/') ? a.rel.slice(0, a.rel.lastIndexOf('/')) : '';
        const db = b.rel.includes('/') ? b.rel.slice(0, b.rel.lastIndexOf('/')) : '';
        return da === db ? a.rel.localeCompare(b.rel, locale(), { numeric: true }) : (da === '' ? -1 : db === '' ? 1 : da.localeCompare(db));
      });
    const groups = new Map();
    for (const d of docs) {
      const dir = d.rel.includes('/') ? d.rel.slice(0, d.rel.lastIndexOf('/')) : '';
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir).push(d);
    }
    const cats = ['agent', 'spec', 'skill', 'doc', 'review'];
    const cc = {};
    p.docs.forEach((d) => { cc[d.category] = (cc[d.category] || 0) + 1; });
    return `
      <div class="chips">
        <input class="input" style="width:220px" placeholder="${t('Filtrar por ruta…')}" value="${esc(f.q)}" data-input="doc-q">
        <button class="chip ${f.unread ? 'on' : ''}" data-action="doc-filter" data-k="unread">${t('Solo sin leer')} <span class="n">${p.summary.unread}</span></button>
        ${cats.filter((c) => cc[c]).map((c) => `<button class="chip ${f.cat === c ? 'on' : ''}" data-action="doc-filter" data-k="cat" data-v="${c}">${catLabel(c)} <span class="n">${cc[c]}</span></button>`).join('')}
        <span class="grow"></span>
        ${p.summary.unread ? `<button class="btn btn-sm" data-action="mark-all-seen" data-pid="${pid}">${t('Marcar todo como leído')}</button>` : ''}
        <button class="btn btn-sm" data-action="new-doc" data-pid="${pid}">${t('+ Nuevo .md')}</button>
      </div>
      <div class="card">${docs.length ? [...groups.entries()].map(([dir, items]) => `
        <div class="tree-dir">📁 ${esc(dir || t('(raíz del proyecto)'))}</div>
        ${items.map((d) => `<a class="list-item" href="${hrefForDoc(pid, d.rel)}" title="${esc(fullDate(d.mtime))}">
          ${d.unread ? `<span class="dot" title="${t('Sin leer')}"></span>` : '<span style="width:8px"></span>'}
          <span class="grow ellipsis mono" style="font-weight:${d.unread ? 650 : 450}">${esc(d.rel.slice(dir ? dir.length + 1 : 0))}</span>
          ${catTag(d.category)}<span class="small faint nowrap" style="width:96px;text-align:right">${ago(d.mtime)}</span></a>`).join('')}`).join('') : `<div class="empty">${t('No hay documentos con estos filtros.')}</div>`}</div>`;
  }

  async function projectSkills(p) {
    const pid = p.id;
    let global = [];
    try { global = (await api.get('/api/global-skills')).skills; } catch {}
    const others = S.state.projects.filter((x) => x.id !== pid && x.ok);
    const skillCard = (sk, actions) => `<div class="card skill-card">
      <h4>${esc(sk.name)}${sk.scope && sk.scope !== 'global' ? `<span class="tag">${esc(sk.scope)}</span>` : ''}${sk.version ? '<span class="badge ok">MD SDD Hub</span>' : ''}</h4>
      <p>${esc(sk.description || t('Sin descripción'))}</p>
      <div class="acts">${actions}</div></div>`;
    const hasSdd = p.compat.skill != null;
    return `
      <div class="toolbar">
        ${hasSdd ? '' : `<button class="btn btn-primary" data-action="prepare-project" data-pid="${pid}">${t('Instalar instrucciones SDD')}</button>`}
        <button class="btn" data-action="new-skill" data-pid="${pid}">${t('+ Nueva skill')}</button>
        <button class="btn" data-action="copy-skill" data-pid="${pid}" ${others.length ? '' : 'disabled'}>${t('Copiar de otro proyecto…')}</button>
        <span class="small faint">${t('Las skills del proyecto viven en <code>.claude/skills/&lt;nombre&gt;/SKILL.md</code> y Claude Code las carga solo.')}</span>
      </div>
      <h3 style="margin:8px 0 10px;font-size:14px">${t('En este proyecto')}</h3>
      ${p.skills.length ? `<div class="skill-grid">${p.skills.map((sk) => skillCard(sk, `
        <a class="btn btn-sm" href="${fileHref(pid, sk.rel)}">${t('Ver')}</a>
        <a class="btn btn-sm" href="${fileHref(pid, sk.rel)}?edit=1">${t('Editar')}</a>
        <button class="btn btn-sm btn-ghost" data-action="open" data-pid="${pid}" data-rel="${esc(sk.rel)}" data-how="folder">${t('Carpeta')}</button>`)).join('')}</div>` : `<div class="card empty">${t('Este proyecto no tiene skills propias todavía.')}</div>`}
      ${p.commands.length || p.agents.length ? `<h3 style="margin:22px 0 10px;font-size:14px">${t('Comandos y subagentes')}</h3>
        <div class="card"><div class="list">${[...p.commands, ...p.agents].map((x) => `<a class="list-item" href="${fileHref(pid, x.rel)}">
          <span class="tag ${x.kind === 'agent' ? 'agent' : ''}">${x.kind === 'command' ? t('/comando') : t('subagente')}</span>
          <div class="grow"><div class="t mono">${x.kind === 'command' ? '/' : ''}${esc(x.name)}</div><div class="sub ellipsis">${esc(x.description || '')}</div></div></a>`).join('')}</div></div>` : ''}
      <h3 style="margin:22px 0 4px;font-size:14px">${t('Skills globales')} <span class="faint small" style="font-weight:400">· ${t('~/.claude/skills (disponibles en todos tus proyectos)')}</span></h3>
      <p class="small muted" style="margin:0 0 10px">${t('Puedes copiar una al proyecto para versionarla con él o adaptarla.')}</p>
      ${global.length ? `<div class="skill-grid">${global.map((sk) => skillCard(sk, `
        <button class="btn btn-sm" data-action="view-global-skill" data-dir="${esc(sk.dir)}">${t('Ver')}</button>
        <button class="btn btn-sm" data-action="copy-global-skill" data-pid="${pid}" data-dir="${esc(sk.dir)}" ${p.skills.some((x) => x.dir === sk.dir) ? `disabled title="${t('Ya existe en el proyecto')}"` : ''}>${t('Copiar al proyecto')}</button>`)).join('')}</div>` : `<div class="card empty">${t('No hay skills globales en ~/.claude/skills.')}</div>`}`;
  }

  function projectReviews(p) {
    const pid = p.id;
    const r = p.reviews;
    return `
      <div class="banner info"><span>↻</span><span class="grow">${t('Cada vez que editas un .md desde MD SDD Hub (texto, estado o casillas), se guarda un aviso con el diff en <code>.sdd/review/</code>. La IA lo revisa siguiendo las instrucciones SDD, escribe su resultado y lo archiva.')}
        ${p.compat.hook ? t('El hook está instalado: Claude Code recibe el aviso automáticamente.') : t('Sin el hook, pídeselo a tu IA: «revisa los cambios pendientes de .sdd/review».')}</span>
        ${S.state.settings.reviewLog ? '' : `<span class="badge warn">${t('Registro desactivado en Ajustes')}</span>`}</div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${t('Pendientes de revisar')} <span class="badge review">${r.pending.length}</span></h3></div>
        <div class="list">${r.pending.length ? r.pending.map((x) => `<div class="list-item" data-href="${fileHref(pid, x.rel)}">
          <span style="color:var(--review)">↻</span>
          <div class="grow"><div class="t mono ellipsis">${esc(x.target || x.rel)}</div><div class="sub">${tn(x.changes, '{n} cambio', '{n} cambios')} · ${t('último')} ${ago(x.mtime)}</div></div>
          ${x.target ? `<a class="btn btn-sm" href="${hrefForDoc(pid, x.target)}">${t('Abrir documento')}</a>` : ''}
          <a class="btn btn-sm" href="${fileHref(pid, x.rel)}">${t('Ver aviso y diff')}</a></div>`).join('') : `<div class="empty">${t('No hay cambios pendientes de revisión.')}</div>`}</div></div>
      <div class="card"><div class="card-head"><h3>${t('Revisadas por la IA')}</h3></div>
        <div class="list">${r.done.length ? r.done.map((x) => `<div class="list-item" style="flex-direction:column;align-items:stretch;cursor:default">
          <div class="row"><span style="color:var(--ok)">✓</span><a class="t mono grow ellipsis" href="${x.target ? hrefForDoc(pid, x.target) : fileHref(pid, x.rel)}">${esc(x.target || x.rel)}</a>
            <span class="small faint">${ago(x.mtime)}</span><a class="btn btn-sm" href="${fileHref(pid, x.rel)}">${t('Ver todo')}</a></div>
          ${x.result ? `<div class="review-result md">${window.MD.render(x.result, { readonly: true }).html}</div>` : `<div class="small faint">${t('Sin sección «Resultado de la revisión».')}</div>`}
        </div>`).join('') : `<div class="empty">${t('Todavía no hay revisiones completadas.')}</div>`}</div></div>`;
  }

  function projectSetup(p) {
    const pid = p.id;
    const c = p.compat;
    const item = (ok, title, desc, action = '', old = false) => `<div class="compat-item">
      <span class="st ${old ? 'old' : ok ? 'yes' : 'no'}">${old ? '↑' : ok ? '✓' : '·'}</span>
      <div class="grow"><b>${title}</b><p>${desc}</p></div>${action}</div>`;
    const missing = c.skill == null || c.outdated || !c.manifest || !c.template || !c.agentsBlock || !c.hook;
    const af = c.agentFiles || {};
    const linked = Object.keys(af).filter((f) => af[f].current);
    return `
      <div class="grid-2" style="align-items:start">
        <div class="card">
          <div class="card-head"><h3>${t('Kit MD SDD Hub en este proyecto')}</h3>
            <button class="btn ${missing ? 'btn-primary' : ''} btn-sm" data-action="install-kit" data-pid="${pid}">${missing ? t('Instalar / actualizar…') : t('Reinstalar…')}</button></div>
          <div class="compat">
            ${item(c.skill != null && !c.outdated, t('Instrucciones SDD'), c.skill == null ? t('Sin ellas, cada sesión de IA puede escribir los documentos de una forma distinta.') : c.outdated ? t('Versión {a} instalada; hay una versión {b}.', { a: c.skill, b: c.skillLatest }) : t('<code>{file}</code> y sus plantillas, válidas para cualquier IA · {lang}.', { file: esc(c.instructionsFile || ''), lang: c.kitLang === 'en' ? 'English' : 'Español' }), c.outdated ? `<button class="btn btn-sm btn-primary" data-action="update-kit" data-pid="${pid}">${t('Actualizar')}</button>` : '', c.outdated)}
            ${item(linked.length > 0, t('Enlace desde los archivos de los agentes'), linked.length ? t('Enlazadas desde {files}: Codex, Claude Code, Gemini, Cursor y otros agentes las siguen.', { files: linked.map((f) => `<code>${f}</code>`).join(', ') }) : t('Se añade un enlace a <code>AGENTS.md</code> (y a <code>CLAUDE.md</code> o <code>GEMINI.md</code> si existen) para que cualquier agente las lea.'))}
            ${c.usesClaude ? item(c.claudeSkill, t('Acceso para Claude Code'), c.claudeSkill ? t('<code>.claude/skills/sdd-spec</code> carga las instrucciones en el momento adecuado.') : t('Opcional: una skill corta en <code>.claude/skills/sdd-spec</code> que remite a las instrucciones.')) : ''}
            ${item(c.hook, t('Hook de revisión para Claude Code'), c.hook ? t('Claude Code recibe un aviso cuando editas algo desde aquí.') : t('Recuerda automáticamente a Claude Code tus cambios pendientes de revisión (en <code>.claude/settings.local.json</code>, no se sube a git).'))}
            ${item(c.manifest, t('Manifiesto <code>.sdd.json</code>'), c.manifest ? t('Carpeta de specs: <code>{dir}</code>', { dir: esc(c.manifestData.specsDir || '') }) : t('Indica a la IA y a la app dónde están las specs y el documento SDD.'))}
            ${item(!!c.template, t('Plantilla de spec'), c.template ? `<code>${esc(c.template)}</code>` : t('Se usará la plantilla de las instrucciones.'))}
            ${types().filter((tp) => c.dirs && c.dirs[tp.id]).map((tp) => item(!!c.registries[tp.id], t('Registro de {type}', { type: esc(typeName(tp.id)) }), c.registries[tp.id] ? `<code>${esc(c.registries[tp.id])}</code>` : t('Tabla con todos los documentos de <code>{dir}</code> y su estado.', { dir: esc(c.dirs[tp.id]) }), `<button class="btn btn-sm" data-action="regen-registry" data-pid="${pid}" data-type="${tp.id}">${c.registries[tp.id] ? t('Regenerar') : t('Crear')}</button>`)).join('')}
            ${item(!!c.sddDoc, t('Documento SDD del sistema'), c.sddDoc ? `<a href="${fileHref(pid, c.sddDoc)}"><code>${esc(c.sddDoc)}</code></a>` : t('Opcional: arquitectura, decisiones y proceso (p. ej. <code>docs/SDD.md</code>).'))}
          </div>
        </div>
        <div class="card card-pad stack">
          <h3>${t('Cómo funciona')}</h3>
          <div class="small" style="line-height:1.6">
            <p style="margin-top:0">${t('<b>1. La IA escribe con un formato fijo.</b> La skill define dónde va cada spec (<code>{dir}/SPEC-NNN-nombre.md</code>), la tabla de metadatos, los estados, los criterios <code>- [ ] AC-01 · …</code>, las tareas <code>- [ ] T-01 · …</code> y el historial. Así esta app lo reconoce todo.', { dir: esc(c.specsDir || 'docs/specs') })}</p>
            <p>${t('<b>2. Tú controlas desde aquí.</b> Ves qué .md ha creado o tocado la IA (punto azul), lees las specs, cambias estados y marcas casillas.')}</p>
            <p>${t('<b>3. Tus cambios vuelven a la IA.</b> Cada edición deja un aviso con el diff en <code>.sdd/review/</code>. La IA lo revisa, ajusta la spec o el código y deja su respuesta, que ves en «Revisiones IA».')}</p>
            <p class="muted" style="margin-bottom:0">${t('Prueba en Claude Code: <i>«crea una spec para …»</i>, <i>«implementa la SPEC-004»</i> o <i>«revisa los cambios pendientes»</i>.')}</p>
          </div>
          ${p.specDirs.length ? `<div class="small muted">${t('Carpetas detectadas:')} ${p.specDirs.map((d) => `<code>${esc(d.rel)}</code> (${esc(typeName(d.type))})`).join(', ')}</div>` : ''}
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- spec
  async function renderSpec() {
    const { pid, key } = S.route;
    const p = S.full[pid] && S.full[pid].specs ? S.full[pid] : await loadFull(pid);
    let spec = p.specs.find((s) => s.key === key);
    if (!spec) { await loadFull(pid); spec = S.full[pid].specs.find((s) => s.key === key); }
    if (!spec) throw new Error(t('No se encuentra la spec (¿se ha renombrado o borrado?)'));
    const rel = S.route.f && spec.files.some((f) => f.rel === S.route.f) ? S.route.f : spec.mainFile;
    if (!(S.editing && S.file && S.file.rel === rel)) await openFile(pid, rel);
    S.file.specKey = key;
    drawSpec(S.full[pid] || p, spec);
  }

  function drawSpec(p, spec) {
    const pid = p.id;
    const file = S.file;
    const deps = spec.deps.map((d) => {
      const x = p.specs.find((y) => y.id === d);
      return x ? `<a href="${specHref(pid, x.key)}" title="${esc(x.title)}">${esc(d)}</a> ${pill(x.status, x)}` : `<span class="faint">${esc(d)} ${t('(no existe)')}</span>`;
    });
    const usedBy = p.specs.filter((x) => spec.id && x.deps.includes(spec.id));
    const pendingReview = spec.alerts.find((a) => a.level === 'review');
    const reviewFile = pendingReview && p.reviews ? p.reviews.pending.find((r) => spec.files.some((f) => f.rel === r.target)) : null;
    const reqs = (file.parsed.requirements || []);
    const statusOpts = typeStatuses(spec.type).map((x) => `<option value="${x.id}" ${x.id === spec.status ? 'selected' : ''}>${esc(labelOf(x))} · ${x.id}</option>`).join('');
    const otherAlerts = spec.alerts.filter((a) => a.level !== 'review');
    view.innerHTML = `
      <div class="crumbs"><a href="#/p/${pid}">${esc(p.name)}</a><span>›</span><a href="#/p/${pid}/${spec.type}">${esc(typeName(spec.type))}</a><span>›</span><span class="mono">${esc(spec.key)}</span></div>
      <div class="page-head">
        <div style="min-width:0">
          <h1>${spec.id ? `<span class="idchip" style="font-size:15px">${esc(spec.id)}</span>` : ''}${esc(spec.title)}</h1>
          <div class="row wrap" style="margin-top:8px">
            <span class="status-wrap" style="--c:${statusColor(spec.status)}"><select class="status-select" style="--c:${statusColor(spec.status)}" data-change="spec-status" data-pid="${pid}" data-key="${esc(spec.key)}" title="${t('Cambiar estado (edita el .md)')}">
              ${spec.status ? '' : `<option value="" selected>${esc(spec.statusRaw || t('Sin estado'))}</option>`}${statusOpts}</select></span>
            ${spec.statusInferred ? `<span class="small faint" title="${t('El archivo no declara estado; se deduce de los archivos y casillas')}">${t('estado deducido')}</span>` : ''}
            ${spec.statusNote ? `<span class="small muted">· ${esc(spec.statusNote)}</span>` : ''}
            ${typeTag(spec.type)}
            <span class="tag" title="${t('Formato detectado')}">${esc(spec.format)}</span>
          </div>
        </div>
        <div class="row wrap">${editButtons(pid, file.rel)}</div>
      </div>
      ${pendingReview ? `<div class="banner review"><span>↻</span><span class="grow">${t('Has modificado este documento desde MD SDD Hub y la IA aún no ha revisado los cambios.')}</span>${reviewFile ? `<a class="btn btn-sm" href="${fileHref(pid, reviewFile.rel)}">${t('Ver aviso')}</a>` : ''}</div>` : ''}
      ${otherAlerts.length ? `<div class="card card-pad" style="margin-bottom:16px;padding:10px 16px">${otherAlerts.map((a) => `<div class="alert-line lv-${a.level}"><span class="ic">${alertIcon[a.level]}</span><span>${esc(a.text)}</span></div>`).join('')}</div>` : ''}
      ${spec.files.length > 1 ? `<nav class="tabs">${spec.files.map((f) => `<a href="${specHref(pid, spec.key, f.rel)}" class="${f.rel === file.rel ? 'active' : ''}">${esc(f.name)}</a>`).join('')}</nav>` : ''}
      <div id="file-zone"></div>`;
    const dataRows = [[t('Propietario'), spec.owner], [t('Autor'), spec.author], [t('Creada'), spec.created], [t('Actualizada'), spec.updated], [t('Release'), spec.release], [t('Prioridad'), spec.priority], [t('Gravedad'), spec.severity]];
    const side = `
      ${spec.checks.total || spec.type === 'feature' || spec.type === 'fix' ? `<div class="card side-box">
        <h4>${t('Progreso')}</h4>
        <div class="stack" style="gap:8px">
          <div><div class="small muted">${t('Tareas')}</div>${progress(spec.checks.task.done, spec.checks.task.total)}</div>
          <div><div class="small muted">${t('Criterios de aceptación')}</div>${progress(spec.checks.ac.done, spec.checks.ac.total)}</div>
        </div>
      </div>` : ''}
      <div class="card side-box">
        <h4>${t('Datos')}</h4>
        <div class="stack small" style="gap:6px">
          ${dataRows.filter((x) => x[1]).map(([k, v]) => `<div><span class="faint">${k}</span><br>${esc(v)}</div>`).join('')}
          <div><span class="faint">${t('Archivo modificado')}</span><br>${esc(fullDate(spec.mtime))}</div>
          ${deps.length ? `<div><span class="faint">${t('Depende de')}</span><br>${deps.join('<br>')}</div>` : ''}
          ${usedBy.length ? `<div><span class="faint">${t('La usan')}</span><br>${usedBy.map((u) => `<a href="${specHref(pid, u.key)}" title="${esc(u.title)}">${esc(u.id || u.title)}</a>`).join(', ')}</div>` : ''}
        </div>
      </div>
      ${reqs.length ? `<div class="card side-box"><h4>${t('Requisitos')} (${reqs.length})</h4><div class="stack small" style="gap:6px">${reqs.slice(0, 40).map((r) => `<a href="#" data-goto-line="${r.line}" style="color:inherit"><b class="mono">${esc(r.id)}</b> <span class="muted">${esc(r.text.replace(/[*`]/g, '').slice(0, 110))}</span></a>`).join('')}</div></div>` : ''}
      ${spec.history.length ? `<div class="card side-box"><h4>${t('Historial')}</h4><div class="timeline">${spec.history.slice().reverse().slice(0, 12).map((h) => {
        const st = typeStatuses(spec.type).find((x) => h.status.includes(x.id));
        return `<div class="tl"><span class="when">${esc(h.date)}</span><div>${st ? pill(st.id, spec) : esc(h.status)}<div class="muted">${esc(h.note.replace(/[`*]/g, '').slice(0, 160))}</div></div></div>`;
      }).join('')}</div></div>` : ''}`;
    drawFileZone(side);
  }

  // ---------------------------------------------------------------- archivo genérico
  async function openFile(pid, rel) {
    const r = await api.get('/api/file', { id: pid, rel });
    S.file = { pid, rel, content: r.content, mtime: r.mtime, parsed: r.parsed };
    const p = S.full[pid];
    if (p && p.docs) { const d = p.docs.find((x) => x.rel === rel); if (d && d.unread) { d.unread = false; p.summary.unread = Math.max(0, p.summary.unread - 1); } }
    loadState().catch(() => {});
    return S.file;
  }

  async function renderFile() {
    const { pid, rel } = S.route;
    if (!S.full[pid]) await loadFull(pid);
    const p = S.full[pid];
    const spec = p.specs.find((s) => s.files.some((f) => f.rel === rel));
    if (spec && !S.route.edit) return go(specHref(pid, spec.key, spec.files.length > 1 ? rel : null));
    if (!(S.editing && S.file && S.file.rel === rel && S.file.pid === pid)) await openFile(pid, rel);
    if (S.route.edit && !S.editing) { S.editing = true; S.draft = S.file.content; }
    const parts = rel.split('/');
    view.innerHTML = `
      <div class="crumbs"><a href="#/p/${pid}">${esc(p.name)}</a><span>›</span><a href="#/p/${pid}/docs">${t('Documentos')}</a>${parts.slice(0, -1).map((x) => `<span>›</span><span class="mono">${esc(x)}</span>`).join('')}</div>
      <div class="page-head"><div style="min-width:0"><h1 class="mono" style="font-size:19px">${esc(parts[parts.length - 1])}</h1>
        <div class="sub small">${t('Modificado')} ${esc(fullDate(S.file.mtime))} · ${ago(S.file.mtime)}</div></div>
        <div class="row wrap">${editButtons(pid, rel)}</div></div>
      <div id="file-zone"></div>`;
    drawFileZone(null);
  }

  function editButtons(pid, rel) {
    if (S.editing) return `<span class="dirty" id="dirty-flag">${S.dirty ? t('Sin guardar') : ''}</span>
      <button class="btn" data-action="toggle-preview" title="${t('Mostrar u ocultar vista previa')}">◫ ${t('Vista previa')}</button>
      <button class="btn" data-action="cancel-edit">${t('Cancelar')}</button>
      <button class="btn btn-primary" data-action="save-file">${t('Guardar')} <span class="small" style="opacity:.75">Ctrl+S</span></button>`;
    return `<button class="btn btn-primary" data-action="edit-file">✎ ${t('Editar')}</button>
      <button class="btn" data-action="open" data-pid="${pid}" data-rel="${esc(rel)}" data-how="editor">${t('Abrir en editor')}</button>
      <button class="btn btn-ghost" data-action="open" data-pid="${pid}" data-rel="${esc(rel)}" data-how="folder" title="${t('Mostrar en el explorador')}">📁</button>
      <button class="btn btn-ghost" data-action="copy-path" data-pid="${pid}" data-rel="${esc(rel)}" title="${t('Copiar ruta')}">⧉</button>`;
  }

  function resolveRel(baseRel, href) {
    const stack = baseRel.split('/').slice(0, -1);
    for (const part of href.split('#')[0].split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') stack.pop(); else stack.push(decodeURIComponent(part));
    }
    return stack.join('/');
  }

  function renderMd(text, readonly) {
    const f = S.file;
    return window.MD.render(text, {
      statuses: statusColorsForMd(), readonly: !!readonly,
      resolveImage: (u) => (/^(https?:|data:)/i.test(u) ? u : `/api/raw?id=${f.pid}&rel=${enc(resolveRel(f.rel, u))}`),
    });
  }

  function drawFileZone(sideHtml) {
    const zone = $('#file-zone');
    const f = S.file;
    if (S.editing) {
      const preview = S.previewOff ? ' solo' : '';
      zone.innerHTML = `<div class="editor${preview}"><textarea id="editor" spellcheck="false">${esc(S.draft != null ? S.draft : f.content)}</textarea><div class="preview md" id="preview"></div></div>`;
      const ta = $('#editor');
      const upd = () => { $('#preview').innerHTML = renderMd(ta.value, true).html; };
      upd();
      let timer;
      ta.addEventListener('input', () => {
        S.draft = ta.value;
        S.dirty = ta.value !== f.content;
        const flag = $('#dirty-flag'); if (flag) flag.textContent = S.dirty ? t('Sin guardar') : '';
        clearTimeout(timer); timer = setTimeout(upd, 150);
      });
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
      });
      ta.focus();
      return;
    }
    const r = renderMd(f.content);
    const toc = r.toc.filter((x) => x.level >= 2 && x.level <= 4);
    zone.innerHTML = `<div class="doc-layout">
      <article class="card md-card"><div class="md" id="md">${r.html || `<p class="muted">${t('(Documento vacío)')}</p>`}</div></article>
      <aside class="doc-side">${sideHtml || ''}
        ${toc.length > 2 ? `<div class="card side-box"><h4>${t('Índice')}</h4><nav class="toc">${toc.map((x) => `<a href="#" data-anchor="${x.id}" class="l${x.level}">${esc(x.text)}</a>`).join('')}</nav></div>` : ''}
      </aside></div>`;
  }

  async function saveFile(force) {
    const f = S.file;
    const content = $('#editor') ? $('#editor').value : S.draft;
    try {
      const r = await api.post('/api/file/save', { id: f.pid, rel: f.rel, content, baseMtime: f.mtime, force: !!force });
      S.editing = false; S.dirty = false; S.draft = null;
      f.content = content; f.mtime = r.mtime;
      toast(r.changed ? (S.state.settings.reviewLog ? t('Guardado · aviso de revisión creado para la IA') : t('Guardado')) : t('Sin cambios'));
      await loadState();
      await loadFull(f.pid);
      if (S.route.name === 'file' && S.route.edit) { history.replaceState(null, '', fileHref(f.pid, f.rel)); }
      await reopenCurrent();
    } catch (e) {
      if (e.status === 409) {
        if (confirm(`${e.message}\n\n${t('¿Sobrescribir igualmente con tu versión? (Cancelar para seguir editando; podrás copiar tu texto antes de recargar.)')}`)) return saveFile(true);
      } else fail(e);
    }
  }

  async function reopenCurrent() {
    S.route = parseRoute();
    if (S.route.name === 'spec') {
      const p = S.full[S.route.pid];
      const spec = p.specs.find((s) => s.key === S.route.key);
      await openFile(S.route.pid, S.route.f && spec.files.some((x) => x.rel === S.route.f) ? S.route.f : spec.mainFile);
      S.file.specKey = spec.key;
      drawSpec(p, spec);
    } else await render();
  }

  // ---------------------------------------------------------------- búsqueda
  async function renderSearch(q) {
    $('#search-input').value = q;
    view.innerHTML = `<div class="page-head"><div><h1>${t('Buscar «{q}»', { q: esc(q) })}</h1><div class="sub">${t('Buscando…')}</div></div></div>`;
    const { results } = await api.get('/api/search', { q });
    const ql = q.toLowerCase();
    const specHits = S.state.projects.filter((p) => p.ok).flatMap((p) => p.specs.filter((s) => (s.title + ' ' + (s.id || '')).toLowerCase().includes(ql)).map((s) => ({ ...s, pid: p.id, pname: p.name })));
    const hl = (x) => esc(x).replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);
    view.innerHTML = `<div class="page-head"><div><h1>${t('Buscar «{q}»', { q: esc(q) })}</h1><div class="sub">${tn(results.length, '{n} documento con coincidencias', '{n} documentos con coincidencias')}${results.length >= 150 ? ' ' + t('(se muestran los 150 primeros)') : ''}</div></div></div>
      ${specHits.length ? `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${t('Specs')}</h3></div><div class="list">${specHits.slice(0, 20).map((s) => `
        <a class="list-item" href="${specHref(s.pid, s.key)}"><span class="idchip">${esc(s.id || '')}</span><div class="grow"><div class="t">${hl(s.title)}</div><div class="sub">${esc(s.pname)}</div></div>${typeTag(s.type)}${pill(s.status, s)}</a>`).join('')}</div></div>` : ''}
      <div class="card"><div class="list">${results.length ? results.map((r) => `
        <a class="list-item" href="${hrefForDoc(r.projectId, r.rel)}">
          <div class="grow"><div class="row"><span class="t mono ellipsis">${hl(r.rel)}</span>${catTag(r.category)}<span class="small faint">${esc(r.project)}</span></div>
          ${r.snippet ? `<div class="sub" style="white-space:normal">${hl(r.snippet)}</div>` : ''}</div>
          <span class="small faint nowrap">${r.count > 1 ? t('{n} coincidencias', { n: r.count }) : ''}</span></a>`).join('') : `<div class="empty">${t('Sin resultados.')}</div>`}</div></div>`;
  }

  // ---------------------------------------------------------------- ajustes
  function renderSettings() {
    const st = S.state.settings;
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Ajustes')}</h1><div class="sub">${t('Se guardan en <code>data/config.json</code> dentro de la carpeta de MD SDD Hub.')}</div></div></div>
      <div class="grid-2" style="align-items:start">
        <div class="card card-pad stack">
          <h3>${t('General')}</h3>
          <label class="field">${t('Idioma')}
            <select class="input" id="set-lang" style="width:260px">
              <option value="" ${!st.lang ? 'selected' : ''}>${t('Automático (idioma del navegador)')}</option>
              <option value="es" ${st.lang === 'es' ? 'selected' : ''}>Español</option>
              <option value="en" ${st.lang === 'en' ? 'selected' : ''}>English</option>
            </select>
            <span class="hint">${t('Idioma de la interfaz. Los .md de los proyectos no se traducen.')}</span></label>
          <label class="field">${t('Editor para «Abrir en editor»')}
            <select class="input" id="set-editor">
              <option value="auto" ${st.editor === 'auto' ? 'selected' : ''}>${t('Automático')}${S.state.editors[0] ? ' (' + esc(S.state.editors[0].label) + ')' : ' ' + t('(no se ha detectado ninguno)')}</option>
              ${S.state.editors.map((e) => `<option value="${esc(e.cmd)}" ${st.editor === e.cmd ? 'selected' : ''}>${esc(e.label)}</option>`).join('')}
              ${st.editor !== 'auto' && !S.state.editors.some((e) => e.cmd === st.editor) ? `<option value="${esc(st.editor)}" selected>${esc(st.editor)}</option>` : ''}
            </select>
            <span class="hint">${t('O escribe un comando propio:')} <input class="input mono" id="set-editor-custom" placeholder="${t('p. ej. cursor')}" style="margin-top:4px"></span></label>
          <label class="field">${t('Tu nombre (columna «Autor» de las specs nuevas)')}<input class="input" id="set-author" value="${esc(st.author || '')}"></label>
          <label class="field">${t('Días sin cambios para marcar una spec en curso como estancada')}<input class="input" type="number" min="1" id="set-stale" value="${st.staleDays}" style="width:110px"></label>
          <label class="check"><input type="checkbox" id="set-review" ${st.reviewLog ? 'checked' : ''}><div><b>${t('Avisar a la IA de mis cambios')}</b><span>${t('Cada edición hecha desde MD SDD Hub crea un aviso con el diff en <code>.sdd/review/</code> para que la IA lo revise.')}</span></div></label>
          <label class="check"><input type="checkbox" id="set-history" ${st.appendHistory ? 'checked' : ''}><div><b>${t('Añadir fila al Historial al cambiar el estado')}</b><span>${t('Además de actualizar «Estado», «Actualizada» y el registro.')}</span></div></label>
          <label class="field">${t('Tema')}
            <select class="input" id="set-theme" style="width:200px">
              ${[['auto', t('Automático')], ['light', t('Claro')], ['dark', t('Oscuro')]].map(([v, l]) => `<option value="${v}" ${st.theme === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select></label>
          <div><button class="btn btn-primary" data-action="save-settings">${t('Guardar ajustes')}</button></div>
        </div>
        <div class="card card-pad stack">
          <h3>${t('Estados del ciclo de vida')}</h3>
          <p class="small muted" style="margin:0">${t('El identificador es lo que se escribe en el .md (<code>`in-progress`</code>). Los alias en español e inglés (borrador, en curso, done…) se reconocen automáticamente al leer. Si cambias los identificadores, actualiza también la skill de tus proyectos.')}</p>
          <div class="chips" style="margin:0">${typeChips(S.statusType, 'status-type')}</div>
          <div id="statuses">${typeStatuses(S.statusType).map((x, i) => statusRow(x, i)).join('')}</div>
          <div class="row"><button class="btn btn-sm" data-action="add-status">${t('+ Añadir estado')}</button><button class="btn btn-sm btn-ghost" data-action="reset-statuses">${t('Restaurar los de serie')}</button><span class="grow"></span><button class="btn btn-primary btn-sm" data-action="save-statuses">${t('Guardar estados')}</button></div>
        </div>
      </div>
      <div class="card card-pad" style="margin-top:16px">
        <h3>${t('Proyectos agregados')}</h3>
        <div class="list" style="margin-top:8px">${S.state.projects.map((p, i) => `<div class="list-item" style="cursor:default;padding-left:0;padding-right:0">
          <div class="grow"><b>${esc(p.name)}</b><div class="sub mono">${esc(p.path)}</div></div>
          <button class="icon-btn" data-action="move-project" data-pid="${p.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} title="${t('Subir')}">↑</button>
          <button class="icon-btn" data-action="move-project" data-pid="${p.id}" data-d="1" ${i === S.state.projects.length - 1 ? 'disabled' : ''} title="${t('Bajar')}">↓</button>
          <button class="btn btn-sm btn-danger" data-action="remove-project" data-pid="${p.id}">${t('Quitar')}</button></div>`).join('') || `<div class="muted">${t('Ninguna.')}</div>`}</div>
        <p class="small faint">${t('Quitar una carpeta solo la elimina de MD SDD Hub; no borra nada del disco.')}</p>
      </div>
      <div class="card card-pad" style="margin-top:16px">
        <h3>${t('Aplicación')} <span class="faint small" style="font-weight:500">v${esc(S.state.version || '')} · <a href="https://github.com/dicapriomarcos/sdd-hub/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">${t('Novedades')}</a></span></h3>
        <p class="small muted">${t('El acceso directo arranca MD SDD Hub en segundo plano (sin ventana) y abre el navegador. Si ya está en marcha, solo abre el navegador.')}</p>
        <div class="row wrap">
          ${S.state.platform === 'win32' ? `<button class="btn" data-action="make-shortcut">${t('Crear acceso directo en el escritorio')}</button>` : ''}
          <button class="btn btn-danger" data-action="shutdown">${t('Apagar MD SDD Hub')}</button>
        </div>
      </div>`;
  }
  const statusRow = (s, i) => `<div class="row" data-status-row="${i}" style="padding:4px 0">
    <input type="color" value="${esc(s.color)}" data-f="color" style="width:34px;height:30px;border:0;background:none;padding:0">
    <input class="input mono" value="${esc(s.id)}" data-f="id" style="width:130px" placeholder="id">
    <input class="input" value="${esc(s.id ? labelOf(s) : s.label)}" data-f="label" placeholder="${t('Etiqueta')}">
    <label class="small nowrap" title="${t('Los estados cerrados no cuentan como activos')}"><input type="checkbox" data-f="closed" ${s.closed ? 'checked' : ''}> ${t('cerrado')}</label>
    <button class="icon-btn" data-action="status-up" data-i="${i}" title="${t('Subir')}">↑</button>
    <button class="icon-btn" data-action="status-del" data-i="${i}" title="${t('Eliminar')}">✕</button></div>`;
  function readStatusRows() {
    return $$('[data-status-row]').map((r) => ({
      id: $('[data-f=id]', r).value.trim().toLowerCase(), label: $('[data-f=label]', r).value.trim(),
      color: $('[data-f=color]', r).value, closed: $('[data-f=closed]', r).checked,
    }));
  }

  // ---------------------------------------------------------------- diálogos
  function openDialog(html, onReady) {
    dlg.innerHTML = html;
    if (!dlg.open) dlg.showModal();
    if (onReady) onReady(dlg);
  }
  const closeDialog = () => dlg.open && dlg.close();
  const dlgHead = (title) => `<div class="dlg-head"><h2>${title}</h2><button class="icon-btn" data-action="close-dialog" aria-label="${t('Cerrar')}">✕</button></div>`;

  // Opción común a «Agregar proyecto» y «Buscar proyectos»: preparar el proyecto al agregarlo
  const prepareBox = () => `<label class="check" style="padding:0"><input type="checkbox" id="prep" checked><div>
      <b>${t('Preparar el proyecto para MD SDD Hub')}</b>
      <span>${t('Instala las instrucciones SDD en <code>.sdd/</code>, válidas para cualquier IA (Codex, Claude Code, Gemini, Cursor…), y las enlaza desde <code>AGENTS.md</code> (y desde <code>CLAUDE.md</code> o <code>GEMINI.md</code> si existen). No toca el resto de esos archivos.')}</span>
      <div class="row" style="margin-top:6px;gap:6px"><span class="small muted">${t('Idioma de las instrucciones, de los nombres de archivo y de la IA:')}</span>${langSelect('prep-lang', LANG)}</div>
    </div></label>`;
  const readPrepare = (d) => ({ prepare: !!($('#prep', d) && $('#prep', d).checked), lang: $('#prep-lang', d) ? $('#prep-lang', d).value : LANG });
  const langSelect = (id, value) => `<select class="input" id="${id}" style="width:auto;padding:3px 8px"><option value="es" ${value === 'es' ? 'selected' : ''}>Español</option><option value="en" ${value === 'en' ? 'selected' : ''}>English</option></select>`;

  async function dialogAddProject(startPath) {
    let cur = startPath || '';
    let tab = 'browse';
    let prep = { prepare: true, lang: LANG };
    const draw = async () => {
      let data;
      try { data = await api.get('/api/fs', cur ? { path: cur } : {}); } catch (e) { fail(e); cur = ''; data = await api.get('/api/fs'); }
      cur = data.path;
      openDialog(`${dlgHead(t('Agregar proyecto'))}
        <div class="dlg-body">
          <nav class="tabs" style="margin:0"><a href="#" data-tab="browse" class="${tab === 'browse' ? 'active' : ''}">${t('Elegir una carpeta')}</a><a href="#" data-tab="paste" class="${tab === 'paste' ? 'active' : ''}">${t('Pegar ruta')}</a></nav>
          ${tab === 'paste' ? `
            <label class="field">${t('Ruta de la carpeta del proyecto')}<input class="input mono" id="paste-path" placeholder="C:\\xampp\\htdocs\\my-project" value="${esc(cur)}"><span class="hint">${t('Consejo: en el Explorador de Windows, Mayús + clic derecho sobre la carpeta → «Copiar como ruta».')}</span></label>` : `
            <div class="browser">
              <div class="browser-path">${data.parent != null && cur ? `<button class="btn btn-sm" data-nav="${esc(data.parent)}">↑</button>` : ''}<span class="grow ellipsis">${esc(cur || t('Unidades y carpetas sugeridas'))}</span></div>
              <div class="browser-list">
                ${!cur && data.suggestions && data.suggestions.length ? data.suggestions.map((s) => `<button data-nav="${esc(s)}">⭐ <span class="mono">${esc(s)}</span></button>`).join('') : ''}
                ${data.dirs.map((d) => `<button data-nav="${esc(d.path)}">📁 ${esc(d.name)}</button>`).join('') || `<div class="empty">${t('Sin subcarpetas')}</div>`}
              </div>
            </div>
            ${cur && data.markers && data.markers.length ? `<div class="small">${t('Detectado aquí:')} ${data.markers.map((m) => `<span class="tag">${esc(m)}</span>`).join(' ')}</div>` : ''}`}
          ${prepareBox()}
        </div>
        <div class="dlg-foot">
          ${tab === 'browse' && cur ? `<button class="btn" data-action="discover" data-root="${esc(cur)}" title="${t('Busca proyectos dentro de esta carpeta (htdocs, sites…)')}">${t('Buscar proyectos dentro…')}</button><span class="grow"></span>` : '<span class="grow"></span>'}
          <button class="btn" data-action="close-dialog">${t('Cancelar')}</button>
          <button class="btn btn-primary" id="add-this" ${tab === 'browse' && !cur ? 'disabled' : ''}>${tab === 'browse' && cur ? t('Agregar este proyecto') : t('Agregar')}</button>
        </div>`, (d) => {
        $('#prep', d).checked = prep.prepare;
        $('#prep-lang', d).value = prep.lang;
        const keep = () => { prep = readPrepare(d); };
        $$('[data-nav]', d).forEach((b) => { b.onclick = () => { keep(); cur = b.dataset.nav; draw(); }; });
        $$('[data-tab]', d).forEach((a) => { a.onclick = (e) => { e.preventDefault(); keep(); tab = a.dataset.tab; draw(); }; });
        $('#add-this', d).onclick = async () => {
          const pth = tab === 'paste' ? $('#paste-path', d).value.trim().replace(/^"|"$/g, '') : cur;
          if (!pth) return;
          try {
            const r = await api.post('/api/projects/add', { path: pth, ...readPrepare(d) });
            closeDialog();
            await loadState();
            let msg = r.existed ? t('Esa carpeta ya estaba agregada') : t('«{name}» agregado', { name: r.project.name });
            if (r.prepared && r.prepared.length) msg += ' · ' + r.prepared.join(', ');
            toast(msg, { ms: 6000 });
            go(`#/p/${r.project.id}`);
          } catch (e) { fail(e); }
        };
        const pp = $('#paste-path', d);
        if (pp) { pp.focus(); pp.onkeydown = (e) => { if (e.key === 'Enter') $('#add-this', d).click(); }; }
      });
    };
    await draw();
  }

  async function dialogDiscover(root) {
    openDialog(`${dlgHead(t('Buscar proyectos'))}<div class="dlg-body"><div class="muted">${t('Buscando en')} <span class="mono">${esc(root)}</span>…</div></div>`);
    let results;
    try { results = (await api.post('/api/discover', { root })).results; } catch (e) { closeDialog(); return fail(e); }
    results.sort((a, b) => (b.strong - a.strong) || a.path.localeCompare(b.path));
    openDialog(`${dlgHead(t('Proyectos encontrados'))}
      <div class="dlg-body">
        <div class="small muted">${t('En')} <span class="mono">${esc(root)}</span>. ${t('Marcados: carpetas con specs, CLAUDE.md, .claude… Las que solo tienen git o un AGENTS.md suelto (típico de plugins de terceros) aparecen sin marcar.')}</div>
        <div class="browser"><div class="browser-list" style="max-height:340px">${results.length ? results.map((r, i) => `
          <label class="disc-item"><input type="checkbox" data-i="${i}" ${r.strong && !r.added ? 'checked' : ''} ${r.added ? 'disabled' : ''}>
            <div class="grow"><b>${esc(r.name)}</b> ${r.added ? `<span class="badge ok">${t('ya agregado')}</span>` : ''}<div class="small mono faint ellipsis">${esc(r.path)}</div>
            <div class="row wrap" style="gap:4px;margin-top:3px">${r.signals.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div></div></label>`).join('') : `<div class="empty">${t('No se han encontrado proyectos.')}</div>`}</div></div>
        ${results.length ? prepareBox() : ''}
      </div>
      <div class="dlg-foot"><button class="btn" data-action="close-dialog">${t('Cancelar')}</button><button class="btn btn-primary" id="disc-add">${t('Agregar seleccionados')}</button></div>`, (d) => {
      $('#disc-add', d).onclick = async () => {
        const sel = $$('input[data-i]:checked', d).map((x) => results[Number(x.dataset.i)]);
        if (!sel.length) return closeDialog();
        const prep = readPrepare(d);
        for (const r of sel) { try { await api.post('/api/projects/add', { path: r.path, ...prep }); } catch (e) { fail(e); } }
        closeDialog();
        await loadState();
        toast(tn(sel.length, '{n} carpeta agregada', '{n} carpetas agregadas') + (prep.prepare ? ' · ' + t('preparadas para MD SDD Hub') : ''));
        go('#/');
        render();
      };
    });
  }

  function dialogNewSpec(pid, type) {
    const p = S.full[pid] || projById(pid);
    let current = TYPE_TEXT[type] ? type : 'feature';
    const info = () => {
      const c = p.compat || {};
      const dir = (c.dirs && c.dirs[current]) || typeOf(current).dirs[0];
      const own = c.templates && c.templates[current];
      const tpl = own ? `<code>${esc(own)}</code>` : t('la plantilla de la skill');
      const first = typeStatuses(current)[0];
      return `${typeDesc(current)}<br>${t('Se creará en <code>{dir}</code> con el prefijo <code>{prefix}</code> y el siguiente número libre, a partir de {tpl}, en estado <code>{status}</code>, y se añadirá al registro si existe.', { dir: esc(dir), prefix: esc(typeOf(current).prefix), tpl, status: esc(first ? first.id : '') })}`;
    };
    openDialog(`${dlgHead(t('Nuevo documento'))}
      <div class="dlg-body">
        <div class="chips" style="margin:0" id="ns-types">${typeChips(current, 'ns-type')}</div>
        <label class="field">${t('Título')}<input class="input" id="ns-title" placeholder="${t('p. ej. Exportar informes en PDF')}"></label>
        <label class="field">${t('Nombre del archivo')}<input class="input mono" id="ns-slug" placeholder="${(p.compat && p.compat.kitLang) === 'en' ? 'export-reports-to-pdf' : 'exportar-informes-en-pdf'}">
          <span class="hint">${(p.compat && p.compat.kitLang) === 'en' ? t('El kit de este proyecto está en inglés: escribe el nombre del archivo en inglés.') : t('Se propone a partir del título; puedes cambiarlo.')}</span></label>
        <div class="small muted" id="ns-info">${info()}</div>
        <div class="small muted">${t('Consejo: también puedes pedírselo a tu IA (Codex, Claude Code…); con las instrucciones instaladas lo escribirá en este mismo formato.')}</div>
      </div>
      <div class="dlg-foot"><button class="btn" data-action="close-dialog">${t('Cancelar')}</button><button class="btn btn-primary" id="ns-go">${t('Crear y editar')}</button></div>`, (d) => {
      const inp = $('#ns-title', d);
      const slugInp = $('#ns-slug', d);
      const slugify = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 7).join('-');
      let slugTouched = false;
      // en los kits en español se propone el nombre a partir del título; en inglés hay que escribirlo
      inp.oninput = () => { if (!slugTouched && (p.compat && p.compat.kitLang) !== 'en') slugInp.value = slugify(inp.value); };
      slugInp.oninput = () => { slugTouched = true; };
      inp.focus();
      $('#ns-types', d).onclick = (e) => {
        const b = e.target.closest('[data-type]');
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        current = b.dataset.type;
        $('#ns-types', d).innerHTML = typeChips(current, 'ns-type');
        $('#ns-info', d).innerHTML = info();
        inp.focus();
      };
      const goCreate = async () => {
        if (!inp.value.trim()) return inp.focus();
        try {
          const r = await api.post('/api/spec/new', { id: pid, title: inp.value, slug: slugify(slugInp.value || inp.value), type: current });
          closeDialog();
          await loadState(); await loadFull(pid);
          toast(t('Creado {x}', { x: r.id || r.rel }));
          go(`${fileHref(pid, r.rel)}?edit=1`);
        } catch (e) { fail(e); }
      };
      $('#ns-go', d).onclick = goCreate;
      inp.onkeydown = (e) => { if (e.key === 'Enter') goCreate(); };
      slugInp.onkeydown = inp.onkeydown;
    });
  }

  function dialogNewDoc(pid) {
    openDialog(`${dlgHead(t('Nuevo documento .md'))}
      <div class="dlg-body"><label class="field">${t('Ruta dentro del proyecto')}<input class="input mono" id="nd-rel" placeholder="docs/decisions.md"></label></div>
      <div class="dlg-foot"><button class="btn" data-action="close-dialog">${t('Cancelar')}</button><button class="btn btn-primary" id="nd-go">${t('Crear')}</button></div>`, (d) => {
      const inp = $('#nd-rel', d); inp.focus();
      const create = async () => {
        try {
          const r = await api.post('/api/file/new', { id: pid, rel: inp.value });
          closeDialog(); await loadFull(pid); await loadState();
          go(`${fileHref(pid, r.rel)}?edit=1`);
        } catch (e) { fail(e); }
      };
      $('#nd-go', d).onclick = create;
      inp.onkeydown = (e) => { if (e.key === 'Enter') create(); };
    });
  }

  function dialogStatusNote(pid, key, status, onDone) {
    openDialog(`${dlgHead(t('Cambiar estado a «{s}»', { s: esc(statusLabel(status)) }))}
      <div class="dlg-body">
        <label class="field">${t('Nota para el historial')} <span class="hint">${t('Opcional. Queda en la tabla «Historial» de la spec y la IA la verá al revisar el cambio.')}</span>
          <textarea class="input" id="st-note" rows="3" placeholder="${status === 'approved' ? t('p. ej. Aprobada; empezar por T-01 y T-02') : t('Motivo del cambio')}"></textarea></label>
        <div class="small muted">${S.state.settings.appendHistory ? t('Se editará el .md: celda «Estado», fecha «Actualizada», fila en el Historial y el registro de specs.') : t('Se editará el .md: celda «Estado», fecha «Actualizada» y el registro de specs.')}</div>
      </div>
      <div class="dlg-foot"><button class="btn" data-action="close-dialog">${t('Cancelar')}</button><button class="btn btn-primary" id="st-go">${t('Cambiar estado')}</button></div>`, (d) => {
      $('#st-note', d).focus();
      dlg.onclose = () => { dlg.onclose = null; if (!d._done) onDone(false); };
      $('#st-go', d).onclick = async () => {
        try {
          await changeStatus(pid, key, status, $('#st-note', d).value.trim());
          d._done = true; closeDialog(); onDone(true);
        } catch (e) { fail(e); }
      };
    });
  }

  async function dialogInstallKit(pid) {
    const p = S.full[pid] || await loadFull(pid);
    const c = p.compat;
    const opt = (id, on, title, desc) => `<label class="check"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><div><b>${title}</b><span>${desc}</span></div></label>`;
    const af = c.agentFiles || {};
    openDialog(`${dlgHead(t('Instalar kit MD SDD Hub'))}
      <div class="dlg-body">
        <div class="small muted">${t('Se escribirán estos archivos en')} <span class="mono">${esc(p.path)}</span>. ${t('No se borra nada; solo se añaden o actualizan los archivos del kit.')}</div>
        <label class="field">${t('Idioma')}
          <span>${langSelect('k-lang', c.kitLang || LANG)}</span>
          <span class="hint">${t('Idioma de las instrucciones y plantillas, de los nombres de archivo (<code>instrucciones.md</code> / <code>instructions.md</code>) y de la IA: responderá, escribirá y hablará siempre en ese idioma.')}</span></label>
        <div>
          ${opt('k-instr', c.skill == null || c.outdated, t('Instrucciones SDD en <code>.sdd/</code>'), t('Reglas del formato y de los ciclos de vida, y plantillas de cada tipo de documento. Valen para cualquier IA.'))}
          ${opt('k-agents', !Object.values(af).some((a) => a.current), t('Enlace en <code>AGENTS.md</code>') + (af['AGENTS.md'] ? '' : ' ' + t('(se crea)')) + (af['CLAUDE.md'] ? ', <code>CLAUDE.md</code>' : '') + (af['GEMINI.md'] ? ', <code>GEMINI.md</code>' : ''), t('Así Codex, Claude Code, Gemini, Cursor y otros agentes leen las instrucciones. Se añade al final, entre marcas, sin tocar el resto.'))}
          ${opt('k-claude', c.usesClaude && (!c.claudeSkill || c.outdated), t('Acceso para Claude Code'), t('Skill corta en <code>.claude/skills/sdd-spec</code> que remite a las instrucciones, para que Claude Code las cargue sola.'))}
          ${opt('k-hook', !c.hook, t('Hook de revisión para Claude Code'), t('Copia <code>.claude/hooks/sdd-review.js</code> y lo registra en <code>.claude/settings.local.json</code> (local, no se sube a git). Avisa a Claude de tus cambios pendientes de revisión.'))}
          ${opt('k-manifest', !c.manifest, '<code>.sdd.json</code>', t('Manifiesto con la carpeta de cada tipo de documento y el idioma.'))}
          ${opt('k-template', !c.template, t('Plantilla <code>{dir}/000-TEMPLATE.md</code>', { dir: esc(c.specsDir || 'docs/specs') }), t('Plantilla de spec en el formato canónico.'))}
          ${c.specsDir ? opt('k-registry', !c.registry, t('Registro <code>{dir}/README.md</code>', { dir: esc(c.specsDir) }), c.registry ? t('Ya existe; no se tocará.') : t('Tabla con todas las specs y su estado.')) : ''}
        </div>
      </div>
      <div class="dlg-foot"><button class="btn" data-action="close-dialog">${t('Cancelar')}</button><button class="btn btn-primary" id="k-go">${t('Instalar')}</button></div>`, (d) => {
      $('#k-lang', d).onchange = () => {
        // al cambiar de idioma hay que reinstalar las instrucciones y los enlaces
        if ($('#k-lang', d).value !== c.kitLang) { $('#k-instr', d).checked = true; $('#k-agents', d).checked = true; if (c.claudeSkill) $('#k-claude', d).checked = true; }
      };
      $('#k-go', d).onclick = async () => {
        const v = (id) => !!($('#' + id, d) && $('#' + id, d).checked);
        try {
          const r = await api.post('/api/install', { id: pid, lang: $('#k-lang', d).value, instructions: v('k-instr'), agents: v('k-agents'), claude: v('k-claude'), hook: v('k-hook'), manifest: v('k-manifest'), template: v('k-template'), registry: v('k-registry') });
          closeDialog();
          toast(r.done.length ? t('Instalado: {x}', { x: r.done.join(', ') }) : t('Nada que instalar'), { ms: 6000 });
          await loadState(); await loadFull(pid); render();
        } catch (e) { fail(e); }
      };
    });
  }

  function dialogNewSkill(pid) {
    openDialog(`${dlgHead(t('Nueva skill'))}
      <div class="dlg-body">
        <label class="field">${t('Nombre')}<input class="input mono" id="sk-name" placeholder="${t('revisar-accesibilidad')}"></label>
        <label class="field">${t('Descripción')} <span class="hint">${t('Claude decide cuándo usarla leyendo esto: di qué hace y en qué situaciones activarla.')}</span><textarea class="input" id="sk-desc" rows="3"></textarea></label>
      </div>
      <div class="dlg-foot"><button class="btn" data-action="close-dialog">${t('Cancelar')}</button><button class="btn btn-primary" id="sk-go">${t('Crear y editar')}</button></div>`, (d) => {
      $('#sk-name', d).focus();
      $('#sk-go', d).onclick = async () => {
        try {
          const r = await api.post('/api/skills/new', { id: pid, name: $('#sk-name', d).value, description: $('#sk-desc', d).value });
          closeDialog(); await loadFull(pid); await loadState();
          go(`${fileHref(pid, r.rel)}?edit=1`);
        } catch (e) { fail(e); }
      };
    });
  }

  async function dialogCopySkill(pid) {
    const others = S.state.projects.filter((x) => x.id !== pid && x.ok);
    openDialog(`${dlgHead(t('Copiar skill de otro proyecto'))}<div class="dlg-body"><div class="muted">${t('Cargando…')}</div></div>`);
    const lists = [];
    for (const o of others) { try { const f = S.full[o.id] && S.full[o.id].skills ? S.full[o.id] : await loadFull(o.id); if (f.skills.length) lists.push(f); } catch {} }
    const mine = new Set(((S.full[pid] || {}).skills || []).map((s) => s.dir));
    openDialog(`${dlgHead(t('Copiar skill de otro proyecto'))}
      <div class="dlg-body">${lists.length ? lists.map((o) => `<div><div class="small" style="font-weight:650;margin-bottom:6px">${esc(o.name)}</div>
        <div class="browser"><div class="browser-list">${o.skills.map((sk) => `<button data-copy="${esc(sk.dir)}" data-from="${o.id}" data-base="${esc(sk.scope)}" ${mine.has(sk.dir) ? 'disabled' : ''}>
          <div class="grow" style="text-align:left"><b class="mono">${esc(sk.name)}</b> ${mine.has(sk.dir) ? `<span class="badge ok">${t('ya está')}</span>` : ''}<div class="small muted ellipsis">${esc(sk.description)}</div></div></button>`).join('')}</div></div></div>`).join('') : `<div class="empty">${t('Ningún otro proyecto tiene skills.')}</div>`}</div>
      <div class="dlg-foot"><button class="btn" data-action="close-dialog">${t('Cerrar')}</button></div>`, (d) => {
      $$('[data-copy]', d).forEach((b) => {
        b.onclick = async () => {
          try {
            const r = await api.post('/api/skills/copy', { id: pid, scope: 'project', fromId: b.dataset.from, dir: b.dataset.copy, base: b.dataset.base });
            closeDialog(); toast(t('Copiada a {x}', { x: r.rel })); await loadFull(pid); render();
          } catch (e) { fail(e); }
        };
      });
    });
  }

  async function dialogViewGlobalSkill(dir) {
    const r = await api.get('/api/global-file', { dir });
    openDialog(`${dlgHead(`~/.claude/skills/${esc(dir)}/SKILL.md`)}
      <div class="dlg-body"><div class="md">${window.MD.render(r.content, { readonly: true }).html}</div></div>
      <div class="dlg-foot"><button class="btn" data-action="open-global" data-dir="${esc(dir)}">${t('Abrir en editor')}</button><button class="btn" data-action="close-dialog">${t('Cerrar')}</button></div>`);
    dlg.style.width = 'min(900px, calc(100vw - 32px))';
    dlg.addEventListener('close', () => { dlg.style.width = ''; }, { once: true });
  }

  // ---------------------------------------------------------------- eventos
  const actions = {
    'toggle-sidebar': () => $('#sidebar').classList.toggle('open'),
    'ns-type': () => {},
    'toggle-lang': () => setLang(LANG === 'es' ? 'en' : 'es'),
    'add-project': () => dialogAddProject(),
    'discover': (el) => dialogDiscover(el.dataset.root),
    'close-dialog': () => closeDialog(),
    'cycle-theme': async () => {
      const order = ['auto', 'light', 'dark'];
      const next = order[(order.indexOf(S.state.settings.theme) + 1) % 3];
      await api.post('/api/settings', { theme: next });
      await loadState();
    },
    'remove-project': async (el) => {
      const p = projById(el.dataset.pid);
      if (!confirm(t('¿Quitar «{name}» de MD SDD Hub?\n\nNo se borra nada del disco.', { name: p.name }))) return;
      await api.post('/api/projects/remove', { id: p.id });
      delete S.full[p.id];
      await loadState();
      if (S.route.pid === p.id) go('#/'); else render();
    },
    'rename-project': async (el) => {
      const p = projById(el.dataset.pid);
      const name = prompt(t('Nombre del proyecto en MD SDD Hub:'), p.name);
      if (!name) return;
      await api.post('/api/projects/update', { id: p.id, name });
      await loadState(); render();
    },
    'move-project': async (el) => {
      const ids = S.state.projects.map((p) => p.id);
      const i = ids.indexOf(el.dataset.pid); const j = i + Number(el.dataset.d);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await api.post('/api/projects/update', { id: el.dataset.pid, order: ids });
      await loadState(); render();
    },
    'open': (el) => api.post('/api/open', { id: el.dataset.pid, rel: el.dataset.rel, how: el.dataset.how }).catch(fail),
    'open-global': (el) => api.post('/api/open', { global: el.dataset.dir, how: 'editor' }).catch(fail),
    'copy-path': async (el) => {
      const p = projById(el.dataset.pid);
      const sep = S.state.platform === 'win32' ? '\\' : '/';
      const full = p.path.replace(/[\\/]+$/, '') + sep + el.dataset.rel.split('/').join(sep);
      try { await navigator.clipboard.writeText(full); toast(t('Ruta copiada')); } catch { prompt(t('Ruta:'), full); }
    },
    'new-spec': (el) => dialogNewSpec(el.dataset.pid, el.dataset.type),
    'new-doc': (el) => dialogNewDoc(el.dataset.pid),
    'new-skill': (el) => dialogNewSkill(el.dataset.pid),
    'copy-skill': (el) => dialogCopySkill(el.dataset.pid),
    'view-global-skill': (el) => dialogViewGlobalSkill(el.dataset.dir).catch(fail),
    'copy-global-skill': async (el) => {
      try {
        const r = await api.post('/api/skills/copy', { id: el.dataset.pid, scope: 'global', dir: el.dataset.dir });
        toast(t('Copiada a {x}', { x: r.rel })); await loadFull(el.dataset.pid); render();
      } catch (e) { fail(e); }
    },
    'prepare-project': async (el) => {
      try {
        const r = await api.post('/api/skills/copy', { id: el.dataset.pid, scope: 'builtin' });
        toast(t('Instalado: {x}', { x: r.done.join(', ') }), { ms: 6000 }); await loadState(); await loadFull(el.dataset.pid); render();
      } catch (e) { fail(e); }
    },
    'update-kit': async (el) => {
      try {
        const r = await api.post('/api/install', { id: el.dataset.pid, update: true });
        toast(t('Actualizado: {x}', { x: r.done.join(', ') }), { ms: 7000 }); await loadState(); await loadFull(el.dataset.pid); render();
      } catch (e) { fail(e); }
    },
    'install-kit': (el) => dialogInstallKit(el.dataset.pid),
    'regen-registry': async (el) => {
      if (!confirm(t('Se reescribirá la tabla «Registro» del README de la carpeta con el estado actual de cada documento. El resto del README no se toca. ¿Continuar?'))) return;
      try {
        const r = await api.post('/api/registry', { id: el.dataset.pid, type: el.dataset.type });
        toast(t(r.created ? 'Creado {rel} ({n} documentos)' : 'Actualizado {rel} ({n} documentos)', { rel: r.rel, n: r.rows })); await loadState(); await loadFull(el.dataset.pid); render();
      } catch (e) { fail(e); }
    },
    'mark-all-seen': async (el) => {
      await api.post('/api/seen', { id: el.dataset.pid, all: true });
      await loadState(); if (S.full[el.dataset.pid]) await loadFull(el.dataset.pid); render();
    },
    'act-filter': (el) => {
      const f = S.actFilter;
      if (el.dataset.k === 'unread') f.unread = !f.unread; else f.cat = f.cat === el.dataset.v ? '' : el.dataset.v;
      render();
    },
    'doc-filter': (el) => {
      const f = S.docFilter;
      if (el.dataset.k === 'unread') f.unread = !f.unread; else f.cat = f.cat === el.dataset.v ? '' : el.dataset.v;
      render();
    },
    'board-closed': () => { S.boardFilter.closed = !S.boardFilter.closed; render(); },
    'spec-status-filter': (el) => { S.specFilter[el.dataset.pid].status = el.dataset.v; render(); },
    'spec-archived': (el) => { const f = S.specFilter[el.dataset.pid]; f.archived = !f.archived; render(); },
    'sort': (el) => { const k = el.dataset.k; S.sort = { key: k, dir: S.sort.key === k ? -S.sort.dir : (k === 'mtime' ? -1 : 1) }; render(); },
    'edit-file': () => {
      S.editing = true; S.dirty = false; S.draft = S.file.content;
      if (S.route.name === 'spec') { const p = S.full[S.route.pid]; drawSpec(p, p.specs.find((s) => s.key === S.route.key)); }
      else go(`${fileHref(S.file.pid, S.file.rel)}?edit=1`);
    },
    'cancel-edit': () => {
      if (S.dirty && !confirm(t('¿Descartar los cambios sin guardar?'))) return;
      S.editing = false; S.dirty = false; S.draft = null;
      if (S.route.name === 'file') go(fileHref(S.file.pid, S.file.rel)); else render();
    },
    'toggle-preview': () => { S.previewOff = !S.previewOff; const e = $('.editor'); if (e) e.classList.toggle('solo', S.previewOff); },
    'save-file': () => saveFile(false),
    'save-settings': async () => {
      const custom = $('#set-editor-custom').value.trim();
      try {
        await api.post('/api/settings', {
          lang: $('#set-lang').value,
          editor: custom || $('#set-editor').value, author: $('#set-author').value.trim(), staleDays: Math.max(1, Number($('#set-stale').value) || 14),
          reviewLog: $('#set-review').checked, appendHistory: $('#set-history').checked, theme: $('#set-theme').value,
        });
        S.full = {};
        await loadState(); toast(t('Ajustes guardados')); render();
      } catch (e) { fail(e); }
    },
    'make-shortcut': async () => {
      try { const r = await api.post('/api/shortcut'); toast(t('Acceso directo creado: {x}', { x: r.path }), { ms: 6000 }); } catch (e) { fail(e); }
    },
    'shutdown': async () => {
      if (!confirm(t('¿Apagar el servidor de MD SDD Hub? Para volver a abrirlo usa el acceso directo o iniciar.bat.'))) return;
      await api.post('/api/shutdown').catch(() => {});
      view.innerHTML = `<div class="welcome"><h1>${t('MD SDD Hub apagado')}</h1><p>${t('Puedes cerrar esta pestaña.')}</p></div>`;
    },
    'add-status': () => { $('#statuses').insertAdjacentHTML('beforeend', statusRow({ id: '', label: '', color: '#8b93a1' }, $$('[data-status-row]').length)); },
    'status-del': (el) => { el.closest('[data-status-row]').remove(); },
    'status-up': (el) => { const r = el.closest('[data-status-row]'); if (r.previousElementSibling) r.parentNode.insertBefore(r, r.previousElementSibling); },
    'reset-statuses': async () => { if (!confirm(t('¿Restaurar los estados de serie de {type}?', { type: typeName(S.statusType) }))) return; await api.post('/api/settings', { resetStatuses: S.statusType }); await loadState(); render(); },
    'status-type': (el) => { S.statusType = el.dataset.type; render(); },
    'board-type': (el) => { S.boardFilter.type = el.dataset.type; render(); },
    'save-statuses': async () => {
      const rows = readStatusRows().filter((s) => s.id);
      if (rows.some((s) => !/^[a-z0-9][a-z0-9-]*$/.test(s.id))) return toast(t('Los identificadores solo pueden tener minúsculas, números y guiones'), { error: true });
      await api.post('/api/settings', { statusesType: S.statusType, statuses: rows }); await loadState(); toast(t('Estados guardados')); render();
    },
  };

  document.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-action]');
    if (a && !a.disabled) {
      e.preventDefault();
      try { await actions[a.dataset.action](a, e); } catch (err) { fail(err); }
      return;
    }
    const anchor = e.target.closest('[data-anchor]');
    if (anchor) {
      e.preventDefault();
      const target = document.getElementById(anchor.dataset.anchor);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const gl = e.target.closest('[data-goto-line]');
    if (gl) {
      e.preventDefault();
      const line = Number(gl.dataset.gotoLine);
      const hs = $$('#md [data-line]').filter((x) => Number(x.dataset.line) <= line);
      const target = hs[hs.length - 1];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const ml = e.target.closest('[data-mdlink]');
    if (ml && S.file) {
      e.preventDefault();
      const rel = resolveRel(S.file.rel, ml.dataset.mdlink);
      if (/\.(md|markdown|mdx)$/i.test(rel)) go(hrefForDoc(S.file.pid, rel));
      else api.post('/api/open', { id: S.file.pid, rel: rel || '.', how: /\.[a-z0-9]+$/i.test(rel) ? 'editor' : 'folder' }).catch(fail);
      return;
    }
    const row = e.target.closest('[data-href]');
    if (row && !e.target.closest('a, button, input, select, label')) { go(row.dataset.href); }
  });

  // casillas de las specs → editan el .md
  document.addEventListener('change', async (e) => {
    const cb = e.target.closest('#md input[type=checkbox][data-line]');
    if (cb && S.file) {
      cb.disabled = true;
      try {
        await api.post('/api/spec/check', { id: S.file.pid, rel: S.file.rel, line: Number(cb.dataset.line), text: cb.dataset.text, done: cb.checked });
        const li = cb.closest('li'); if (li) li.classList.toggle('done', cb.checked);
        await loadState();
        await loadFull(S.file.pid);
        await reopenCurrent();
      } catch (err) { cb.checked = !cb.checked; fail(err); } finally { cb.disabled = false; }
      return;
    }
    const ch = e.target.closest('[data-change]');
    if (!ch) return;
    const k = ch.dataset.change;
    if (k === 'act-project') { S.actFilter.project = ch.value; render(); }
    if (k === 'board-project') { S.boardFilter.project = ch.value; render(); }
    if (k === 'spec-status') {
      const prev = [...ch.options].find((o) => o.defaultSelected);
      dialogStatusNote(ch.dataset.pid, ch.dataset.key, ch.value, (ok) => {
        if (ok) reopenCurrent(); else if (prev) ch.value = prev.value;
      });
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (!el) return;
    const k = el.dataset.input;
    const pos = el.selectionStart;
    if (k === 'board-q') S.boardFilter.q = el.value;
    if (k === 'spec-q') S.specFilter[el.dataset.pid].q = el.value;
    if (k === 'doc-q') S.docFilter.q = el.value;
    clearTimeout(S._inT);
    S._inT = setTimeout(async () => {
      if (k === 'board-q') {
        if (S.route.name === 'board') return renderBoardPage().then(() => refocus(k, pos));
        const zone = $('#board-zone');
        const p = S.full[S.route.pid];
        if (zone && p) zone.innerHTML = boardHtml(p.specs.map((x) => ({ ...x, pid: p.id, pname: p.name })), false, S.route.tab);
        return;
      }
      await render(); refocus(k, pos);
    }, 160);
  });
  function refocus(k, pos) {
    const el = $(`[data-input="${k}"]`);
    if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch {} }
  }

  // arrastrar y soltar en el tablero
  document.addEventListener('dragstart', (e) => {
    const c = e.target.closest('[data-drag]');
    if (!c) return;
    c.classList.add('dragging');
    e.dataTransfer.setData('text/plain', JSON.stringify({ key: c.dataset.drag, pid: c.dataset.pid }));
    e.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragend', (e) => { const c = e.target.closest('[data-drag]'); if (c) c.classList.remove('dragging'); $$('.col.drop').forEach((x) => x.classList.remove('drop')); });
  document.addEventListener('dragover', (e) => {
    const col = e.target.closest('[data-drop]');
    if (!col) return;
    e.preventDefault();
    $$('.col.drop').forEach((x) => x !== col && x.classList.remove('drop'));
    col.classList.add('drop');
  });
  document.addEventListener('drop', async (e) => {
    const col = e.target.closest('[data-drop]');
    if (!col) return;
    e.preventDefault();
    col.classList.remove('drop');
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    const status = col.dataset.drop;
    if (status === '_none') return toast(t('No se puede quitar el estado desde el tablero'), { error: true });
    const p = S.full[data.pid] || projById(data.pid);
    const spec = p.specs.find((s) => s.key === data.key);
    if (!spec || spec.status === status) return;
    try { await changeStatus(data.pid, data.key, status, ''); render(); } catch (err) { fail(err); }
  });

  // búsqueda global
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#search-input').value.trim();
    if (q.length >= 2) go('#/buscar/' + enc(q));
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#search-input').focus(); $('#search-input').select(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && S.editing) { e.preventDefault(); saveFile(false); }
    if (e.key === 'Escape' && S.editing && !dlg.open && document.activeElement && document.activeElement.id === 'editor' && !S.dirty) actions['cancel-edit']();
  });
  window.addEventListener('beforeunload', (e) => { if (S.editing && S.dirty) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('hashchange', render);

  // ---------------------------------------------------------------- refresco automático
  // Detecta cambios hechos por la IA (o por ti en otro editor) sin recargar la página.
  let lastSig = '';
  async function poll() {
    if (document.hidden || dlg.open) return;
    try {
      const prev = S.state;
      await loadState();
      const sig = JSON.stringify(S.state.projects.map((p) => [p.id, p.summary, p.specs && p.specs.map((s) => [s.key, s.status, s.mtime, s.checks.done])]));
      if (sig === lastSig || !prev) { lastSig = sig; return; }
      lastSig = sig;
      // tras una escritura propia no hace falta avisar de «cambios en disco»
      if (Date.now() - (S.lastWrite || 0) < 5000) return;
      const r = S.route || {};
      if (S.editing) {
        if (S.file) {
          const st = await api.get('/api/file', { id: S.file.pid, rel: S.file.rel }).catch(() => null);
          if (st && Math.abs(st.mtime - S.file.mtime) > 1 && !S._warned) {
            S._warned = true;
            toast(t('Este archivo ha cambiado en disco mientras lo editas (¿la IA?). Al guardar se te pedirá confirmación.'), { ms: 9000 });
          }
        }
        return;
      }
      if (r.name === 'spec' || r.name === 'file') {
        const st = await api.get('/api/file', { id: S.file.pid, rel: S.file.rel }).catch(() => null);
        if (st && Math.abs(st.mtime - S.file.mtime) > 1) {
          const y = view.scrollTop;
          if (r.pid) await loadFull(r.pid);
          await render();
          view.scrollTop = y;
          toast(t('Documento actualizado: ha cambiado en disco'));
        }
        return;
      }
      if (['home', 'activity', 'board', 'project'].includes(r.name)) {
        const y = view.scrollTop;
        const active = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.input;
        if (active) return;
        await render();
        view.scrollTop = y;
      }
    } catch { /* servidor parado: se reintenta */ }
  }

  // ---------------------------------------------------------------- arranque
  (async function init() {
    LANG = browserLang();
    try {
      await loadState();
    } catch (e) {
      LANG = browserLang();
      view.innerHTML = `<div class="card card-pad">${t('No se puede conectar con el servidor de MD SDD Hub. ¿Está en marcha? (<code>node server.js</code>)')}</div>`;
      return;
    }
    await render();
    setInterval(poll, 6000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  })();
})();
