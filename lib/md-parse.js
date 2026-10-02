'use strict';
// Análisis de Markdown orientado a specs SDD: metadatos, estado, casillas,
// requisitos e historial. Tolerante con Spec Kit, Kiro, OpenSpec y formatos libres.

// Tipos de documento: cada uno con su prefijo de ID, sus carpetas habituales y su ciclo de estados.
// Las etiquetas están en español (idioma base); la interfaz las traduce.
const FEATURE_STATUSES = [
  { id: 'draft', label: 'Borrador', color: '#8b93a1' },
  { id: 'review', label: 'En revisión', color: '#d0901f' },
  { id: 'approved', label: 'Aprobada', color: '#3b82f6' },
  { id: 'in-progress', label: 'En curso', color: '#8b5cf6' },
  { id: 'verified', label: 'Verificada', color: '#0fa38f' },
  { id: 'released', label: 'Publicada', color: '#22a35a', closed: true },
  { id: 'superseded', label: 'Reemplazada', color: '#6b7280', closed: true },
];
const DECISION_STATUSES = [
  { id: 'proposed', label: 'Propuesta', color: '#d0901f' },
  { id: 'accepted', label: 'Aceptada', color: '#22a35a' },
  { id: 'rejected', label: 'Rechazada', color: '#c0392b', closed: true },
  { id: 'deprecated', label: 'Obsoleta', color: '#8b93a1', closed: true },
  { id: 'superseded', label: 'Reemplazada', color: '#6b7280', closed: true },
];
const FIX_STATUSES = [
  { id: 'reported', label: 'Reportado', color: '#e0457b' },
  { id: 'investigating', label: 'Investigando', color: '#d0901f' },
  { id: 'in-progress', label: 'En curso', color: '#8b5cf6' },
  { id: 'verified', label: 'Verificado', color: '#0fa38f' },
  { id: 'released', label: 'Publicado', color: '#22a35a', closed: true },
];

const DEFAULT_TYPES = [
  {
    id: 'feature', label: 'Features', prefix: 'SPEC', color: '#4f46e5', template: 'feature.md',
    dirs: ['docs/specs', 'specs', 'docs/spec', 'spec', 'docs/especificaciones', 'especificaciones'],
    statuses: FEATURE_STATUSES,
  },
  {
    id: 'design', label: 'Diseño', prefix: 'DES', color: '#d6409f', template: 'design.md',
    dirs: ['docs/design', 'docs/diseno', 'docs/diseño', 'docs/ux', 'design'],
    statuses: DECISION_STATUSES,
  },
  {
    id: 'architecture', label: 'Arquitectura', prefix: 'ADR', color: '#0e8fae', template: 'adr.md',
    dirs: ['docs/architecture', 'docs/arquitectura', 'docs/adr', 'docs/adrs', 'docs/decisions', 'docs/decisiones', 'docs/architecture/decisions', 'doc/adr', 'adr'],
    statuses: DECISION_STATUSES,
  },
  {
    id: 'fix', label: 'Fixes', prefix: 'FIX', color: '#e8590c', template: 'fix.md',
    dirs: ['docs/fixes', 'docs/fix', 'docs/bugs', 'fixes'],
    statuses: FIX_STATUSES,
  },
];
const DEFAULT_STATUSES = FEATURE_STATUSES;

// Alias al leer: cada palabra apunta a uno o varios estados; se usa el primero que exista en el tipo
const ALIASES = {
  borrador: 'draft', idea: 'draft', todo: 'draft', pendiente: ['draft', 'reported'], planned: 'draft', planificada: 'draft',
  nueva: ['draft', 'reported', 'proposed'], new: ['draft', 'reported', 'proposed'],
  propuesta: ['proposed', 'draft'], propuesto: ['proposed', 'draft'], proposed: ['proposed', 'draft'], proposal: ['proposed', 'draft'],
  revision: 'review', 'revisión': 'review', 'en revisión': 'review', 'en revision': 'review', 'in review': 'review',
  'pending review': 'review',
  aprobada: ['approved', 'accepted'], aprobado: ['approved', 'accepted'], accepted: ['accepted', 'approved'],
  aceptada: ['accepted', 'approved'], aceptado: ['accepted', 'approved'], ready: 'approved', lista: 'approved',
  vigente: 'accepted', adopted: 'accepted', adoptada: 'accepted',
  reported: 'reported', reportado: 'reported', reportada: 'reported', open: ['reported', 'draft'], abierto: ['reported', 'draft'],
  abierta: ['reported', 'draft'], bug: 'reported',
  investigating: 'investigating', investigando: 'investigating', 'en investigación': 'investigating', 'en investigacion': 'investigating',
  triage: 'investigating', analizando: 'investigating',
  'in progress': 'in-progress', inprogress: 'in-progress', 'en curso': 'in-progress', 'en progreso': 'in-progress',
  'en desarrollo': 'in-progress', doing: 'in-progress', wip: 'in-progress', implementing: 'in-progress',
  'implementación': 'in-progress', active: 'in-progress', activa: 'in-progress', started: 'in-progress', fixing: 'in-progress',
  verificada: 'verified', verificado: 'verified', done: 'verified', hecha: 'verified', hecho: 'verified',
  completed: 'verified', complete: 'verified', completada: 'verified', completado: 'verified',
  implemented: 'verified', implementada: 'verified', terminada: 'verified', finished: 'verified',
  fixed: 'verified', resuelto: 'verified', resuelta: 'verified', corregido: 'verified', solved: 'verified', resolved: 'verified',
  publicada: 'released', publicado: 'released', shipped: 'released', deployed: 'released', desplegada: 'released',
  desplegado: 'released', archived: 'released', archivada: 'released', live: 'released', 'en producción': 'released',
  rejected: ['rejected', 'superseded'], rechazada: ['rejected', 'superseded'], rechazado: ['rejected', 'superseded'],
  descartada: ['rejected', 'superseded'], descartado: ['rejected', 'superseded'], wontfix: ['rejected', 'superseded'],
  deprecated: ['deprecated', 'superseded'], obsoleta: ['deprecated', 'superseded'], obsoleto: ['deprecated', 'superseded'],
  reemplazada: 'superseded', reemplazado: 'superseded', sustituida: 'superseded', sustituido: 'superseded',
  cancelled: ['superseded', 'rejected'], canceled: ['superseded', 'rejected'], cancelada: ['superseded', 'rejected'],
};

const KEY_MAP = [
  ['createdUpdated', /^(creada|creado|created)\s*\/\s*(actualizada|actualizado|updated)$/],
  ['status', /^(estado|status|state|estatus)$/],
  ['updated', /^(actualizad[ao]|updated|last updated|last update|última actualización|ultima actualizacion|modificad[ao])$/],
  ['created', /^(creada|creado|created|fecha|fecha de creación|date|creation date)$/],
  ['owner', /^(propietari[oa]|owner|responsable)$/],
  ['author', /^(autor|autora|autores|author|authors)$/],
  ['deps', /^(dependencias|dependencies|depends on|depende de|relacionadas|relacionados|related|relates to|see also|ver también)$/],
  ['release', /^(objetivo de release|release|target release|versión objetivo|milestone)$/],
  ['branch', /^(feature branch|rama|branch)$/],
  ['priority', /^(prioridad|priority)$/],
  ['severity', /^(gravedad|severidad|severity)$/],
];

const ID_RE = /\b([A-Z][A-Z0-9]{1,9}-\d{1,5})\b/;

function normKey(k) {
  return String(k).replace(/[*_`]/g, '').replace(/:\s*$/, '').trim().toLowerCase();
}

function canonicalKey(k) {
  const n = normKey(k);
  for (const [c, re] of KEY_MAP) if (re.test(n)) return c;
  return null;
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim());
}

function isSeparatorRow(line) {
  if (!/^\s*\|?\s*:?-{2,}/.test(line)) return false;
  return splitRow(line).every((c) => /^:?-{2,}:?$/.test(c) || c === '');
}

function cleanValue(s) {
  return String(s).replace(/\*\*|__/g, '').trim();
}

function normalizeStatus(raw, ids) {
  if (!raw) return { status: null, raw: null, note: '' };
  let v = String(raw).trim();
  let note = '';
  const bt = v.match(/`([^`]+)`/);
  if (bt) {
    note = v.replace(bt[0], '').trim();
    v = bt[1];
  }
  v = v.replace(/[*_]/g, '').trim();
  const lower = v.toLowerCase().replace(/^[^\p{L}\d]+/u, '').trim();
  const tryKey = (s) => {
    if (!s) return null;
    s = s.trim().replace(/[.:;,]+$/, '');
    if (ids.includes(s)) return s;
    const d = s.replace(/[\s_]+/g, '-');
    if (ids.includes(d)) return d;
    const list = [].concat(ALIASES[s] || ALIASES[s.replace(/[-_]+/g, ' ')] || []);
    return list.find((x) => ids.includes(x)) || null;
  };
  let status = tryKey(lower);
  if (!status) {
    const words = lower.split(/[\s(—–,;/]+/).filter(Boolean);
    for (let n = Math.min(3, words.length); n >= 1 && !status; n--) {
      status = tryKey(words.slice(0, n).join(' '));
      if (status && !note) note = v.split(/\s+/).slice(n).join(' ').trim();
    }
  }
  return { status, raw: v, note };
}

// Frontmatter YAML sencillo: claves de primer nivel, valores en línea o bloques > |
function parseFrontmatter(lines) {
  if (!lines.length || lines[0].trim() !== '---') return null;
  const data = {};
  const keyLines = {};
  let key = null;
  let block = null;
  for (let j = 1; j < lines.length && j < 200; j++) {
    const line = lines[j];
    if (line.trim() === '---' || line.trim() === '...') {
      if (block) data[block.key] = block.parts.join(block.fold ? ' ' : '\n').trim();
      return { data, keyLines, end: j };
    }
    const m = line.match(/^([A-Za-z_][\w .-]*):\s*(.*)$/);
    if (m && !/^\s/.test(line)) {
      if (block) data[block.key] = block.parts.join(block.fold ? ' ' : '\n').trim();
      block = null;
      key = m[1].trim().toLowerCase();
      keyLines[key] = j;
      const val = m[2].trim();
      if (val === '>' || val === '|' || val === '>-' || val === '|-' || val === '') {
        block = { key, parts: [], fold: val.startsWith('>') || val === '' };
        data[key] = '';
      } else {
        data[key] = val.replace(/^["']|["']$/g, '');
      }
    } else if (block && /^\s+/.test(line)) {
      block.parts.push(line.trim());
    }
  }
  return null; // sin cierre: no es frontmatter
}

function classifySection(text) {
  const t = text.toLowerCase();
  if (/criterio|acceptance|aceptaci|definition of done|definición de hecho|\bdod\b|verificaci/.test(t)) return 'ac';
  if (/tarea|tasks?\b|plan de (tareas|implementación|trabajo)|implementation plan|checklist|pasos/.test(t)) return 'task';
  return null;
}

function parseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const out = {
    title: null, h1Line: -1, fields: {}, loc: {}, fm: null,
    checks: [], headings: [], history: null, requirements: [], lineCount: lines.length,
  };

  let start = 0;
  const fm = parseFrontmatter(lines);
  if (fm) {
    out.fm = fm;
    start = fm.end + 1;
    for (const [k, v] of Object.entries(fm.data)) {
      if (k === 'title' && v) out.title = v;
      const ck = canonicalKey(k);
      if (ck && !(ck in out.fields) && v) {
        out.fields[ck] = v;
        out.loc[ck] = { kind: 'fm', line: fm.keyLines[k] };
      }
    }
  }

  let inFence = false;
  let fenceChar = '';
  let headerZone = true;
  let sectionKind = null;
  let sectionTitle = '';
  let inHistory = false;
  let historyLevel = 0;
  let historyHeaderSeen = false;
  let statusSection = false;

  for (let n = start; n < lines.length; n++) {
    const line = lines[n];
    const f = line.match(/^\s*(`{3,}|~{3,})/);
    if (f) {
      if (!inFence) { inFence = true; fenceChar = f[1][0]; }
      else if (line.trim().startsWith(fenceChar.repeat(3))) inFence = false;
      continue;
    }
    if (inFence) continue;

    const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) {
      const level = h[1].length;
      const htext = h[2].trim();
      out.headings.push({ level, text: htext, line: n });
      if (level === 1 && out.h1Line < 0) {
        out.h1Line = n;
        if (!out.title) out.title = htext;
      } else if (level >= 2) {
        headerZone = false;
      }
      if (inHistory && level <= historyLevel) inHistory = false;
      statusSection = level >= 2 && /^(\d+[.)]?\s*)?(estado|status)$/i.test(htext) && !('status' in out.fields);
      sectionKind = classifySection(htext);
      sectionTitle = htext;
      if (/^(\d+[.)]?\s*)?(historial|changelog|registro de cambios|history|histórico|change log)\b/i.test(htext)) {
        inHistory = true;
        historyLevel = level;
        historyHeaderSeen = false;
        out.history = { line: n, rows: [], tableStart: -1, lastRowLine: -1 };
      }
      continue;
    }

    if (statusSection && line.trim()) {
      statusSection = false;
      out.fields.status = cleanValue(line.trim());
      out.loc.status = { kind: 'section', line: n };
      continue;
    }

    const isRow = /^\s*\|.*\|\s*$/.test(line);

    if (headerZone && n < start + 150) {
      if (isRow) {
        const cells = splitRow(line);
        if (cells.length >= 2) {
          const ck = canonicalKey(cells[0]);
          if (ck && !(ck in out.fields)) {
            out.fields[ck] = cleanValue(cells[1]);
            out.loc[ck] = { kind: 'table', line: n };
          }
        }
      } else {
        const b = line.match(/^\s*(?:[-*+>]\s+)?\*\*([^*]+?)\*\*\s*:?\s*(.*)$/) ||
          line.match(/^\s*(?:[-*+>]\s+)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ /]{1,30}?)\s*:\s+(.+)$/);
        if (b) {
          const ck = canonicalKey(b[1]);
          const val = b[2].replace(/^:\s*/, '').trim();
          if (ck && val && !(ck in out.fields)) {
            out.fields[ck] = cleanValue(val);
            out.loc[ck] = { kind: 'inline', line: n };
          }
        }
      }
    }

    if (inHistory && isRow) {
      if (out.history.tableStart < 0) out.history.tableStart = n;
      if (isSeparatorRow(line)) { historyHeaderSeen = true; continue; }
      if (!historyHeaderSeen) continue;
      const cells = splitRow(line);
      out.history.rows.push({ date: cleanValue(cells[0] || ''), status: cleanValue((cells[1] || '').replace(/`/g, '')), note: cells.slice(2).join(' | '), line: n });
      out.history.lastRowLine = n;
      continue;
    }

    if (isRow && !headerZone) {
      const cells = splitRow(line);
      const id = (cells[0] || '').replace(/[*`]/g, '').trim();
      if (/^(N?FR|RN?F|REQ|R|US|HU)-?\d+[a-z]?$/i.test(id) && cells.length >= 2) {
        out.requirements.push({ id, text: cells.slice(1).join(' · '), line: n });
      }
      continue;
    }

    const c = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+\[([ xX~-])\]\s+(.*)$/);
    if (c) {
      const txt = c[3];
      const bare = txt.replace(/^[*_~`]+/, '');
      let kind = sectionKind || 'task';
      if (/^AC[-\s]?\d/i.test(bare)) kind = 'ac';
      else if (/^(T|TASK|TAREA)[-\s]?\d/i.test(bare)) kind = 'task';
      out.checks.push({
        line: n, done: /[xX]/.test(c[2]), text: txt, kind,
        struck: /^\s*~~/.test(txt), section: sectionTitle,
      });
    }
  }
  return out;
}

function countChecks(checks) {
  const res = { total: 0, done: 0, ac: { total: 0, done: 0 }, task: { total: 0, done: 0 } };
  for (const c of checks) {
    if (c.struck) continue;
    res.total++;
    if (c.done) res.done++;
    const b = c.kind === 'ac' ? res.ac : res.task;
    b.total++;
    if (c.done) b.done++;
  }
  return res;
}

function extractIds(s) {
  if (!s) return [];
  const re = new RegExp(ID_RE.source, 'g');
  return [...new Set((String(s).match(re) || []))];
}

function cleanTitle(title, id) {
  if (!title) return '';
  let t = title.replace(/[*_`]/g, '').trim();
  if (id) {
    const esc = id.replace(/[-]/g, '\\-');
    t = t.replace(new RegExp('^' + esc + '\\s*[·:\\-—–|]?\\s*', 'i'), '');
  }
  t = t.replace(/^\d+\.\s+/, '');
  t = t.replace(/^(feature specification|especificación( de (la )?funcionalidad)?|requirements document|design document|implementation plan|plan de implementación|change proposal|propuesta de cambio|change|proposal|spec)\s*[:—–-]\s*/i, '');
  return t.trim();
}

module.exports = {
  DEFAULT_STATUSES, DEFAULT_TYPES, ID_RE, parseMarkdown, parseFrontmatter, normalizeStatus, canonicalKey,
  splitRow, isSeparatorRow, countChecks, extractIds, cleanTitle,
};
