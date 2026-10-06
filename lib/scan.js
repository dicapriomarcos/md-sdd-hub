'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const P = require('./md-parse');
const { tr } = require('./i18n');
const { findSecrets } = require('./secrets');

// Versión del kit que instala la app. v6: sistema de diseño por partes (<carpeta de diseño>/sistema/index.md);
// v5: skill por carpetas en .skills/sdd/ (índice + archivos cortos);
// v4: un solo archivo en .sdd/instrucciones.md; v1-v3: .claude/skills/sdd-spec.
const KIT_VERSION = 6;
const SKILL_DIR = '.skills/sdd';
// Estructura del kit por idioma: el idioma decide el contenido y también los nombres de los archivos.
// project / status / decisions son archivos del proyecto en .sdd/ (la app no los sobrescribe).
const LAYOUT = {
  es: {
    instructions: 'instrucciones.md', templatesDir: 'plantillas', doneDir: 'hecho',
    templates: { feature: 'feature.md', design: 'diseno.md', architecture: 'arquitectura.md', fix: 'fix.md' },
    project: 'proyecto.md', status: 'estado.md', decisions: 'decisiones.md', git: 'git.md', areas: ['Textos', 'Interfaz', 'Código', 'Proceso'],
    designSystem: 'sistema', designGroups: ['fundamentos', 'componentes', 'patrones'],
  },
  en: {
    instructions: 'instructions.md', templatesDir: 'templates', doneDir: 'done',
    templates: { feature: 'feature.md', design: 'design.md', architecture: 'adr.md', fix: 'fix.md' },
    project: 'project.md', status: 'status.md', decisions: 'decisions.md', git: 'git.md', areas: ['Copy', 'Interface', 'Code', 'Process'],
    designSystem: 'system', designGroups: ['foundations', 'components', 'patterns'],
  },
};

const SKIP_DIRS = new Set([
  'node_modules', 'vendor', '.git', 'wp-admin', 'wp-includes', 'uploads', 'dist', 'build', '.next', '.nuxt',
  '.cache', 'cache', 'bower_components', '.idea', '.vscode', 'coverage', 'tmp', 'temp', 'logs', 'languages',
  '__pycache__', '.venv', 'venv', 'target', 'out', '.svn', '.turbo', 'public/build', 'storage', 'bootstrap',
]);
const DOT_DIRS_ALLOWED = new Set(['.claude', '.sdd', '.skills', '.memory', '.specify', '.kiro', '.github', '.cursor', '.codex', '.agents', '.gemini', '.windsurf', '.clinerules', '.continue', '.junie']);
const MAX_MD_FILES = 3000;
const PRIORITY = ['spec.md', 'requirements.md', 'proposal.md', 'design.md', 'plan.md', 'research.md', 'data-model.md', 'quickstart.md', 'tasks.md'];

// ---------- utilidades ----------
const posix = (p) => p.split(path.sep).join('/');
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
function readText(abs) { return fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''); }
function readJSON(abs) { try { return JSON.parse(readText(abs)); } catch { return null; } }
function sameKey(p) { return process.platform === 'win32' ? p.toLowerCase() : p; }

const cache = new Map();
function parseCached(abs) {
  const st = fs.statSync(abs);
  const c = cache.get(abs);
  if (c && c.m === st.mtimeMs && c.s === st.size) return c.v;
  let v;
  if (st.size > 2 * 1024 * 1024) v = { title: null, fields: {}, loc: {}, checks: [], headings: [], requirements: [], history: null, h1Line: -1 };
  else v = P.parseMarkdown(readText(abs));
  v.mtime = st.mtimeMs;
  v.size = st.size;
  cache.set(abs, { m: st.mtimeMs, s: st.size, v });
  return v;
}

function listMd(dirAbs, depth) {
  const out = [];
  (function walk(d, lvl) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isFile() && /\.md$/i.test(e.name)) out.push(path.join(d, e.name));
      else if (e.isDirectory() && lvl < depth && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name)) walk(path.join(d, e.name), lvl + 1);
    }
  })(dirAbs, 0);
  return out;
}

// ---------- specs ----------
function isIgnoredSpecFile(name) {
  return /^(readme|index|_index|changelog|contributing)\.md$/i.test(name) || /template|plantilla/i.test(name) ||
    name.startsWith('_') || name.startsWith('.');
}

function statusFrom(parsed, ids) {
  const raw = parsed.fields.status;
  if (!raw) return null;
  return P.normalizeStatus(raw, ids);
}

function inferStatus(fileNames, counts, archived) {
  // devuelve los estados candidatos por orden de preferencia; se usa el primero que exista en el tipo
  if (archived) return ['done', 'released'];
  if (counts.total && counts.done === counts.total) return ['awaiting-review', 'verified'];
  if (counts.done > 0) return ['in-progress'];
  if (fileNames.includes('tasks.md')) return ['in-progress', 'approved'];
  if (fileNames.includes('design.md') || fileNames.includes('plan.md')) return ['planning', 'review'];
  return ['backlog'];
}

function buildSpec(root, opts, ids) {
  // opts: { mainRel, fileRels[], key, kind: 'file'|'folder', format, folderName, archived, type }
  const parsedFiles = opts.fileRels.map((rel) => ({ rel, p: parseCached(path.join(root, rel)) }));
  const main = parsedFiles.find((f) => f.rel === opts.mainRel) || parsedFiles[0];
  const checks = [];
  for (const f of parsedFiles) for (const c of f.p.checks) checks.push({ ...c, file: f.rel });
  const counts = P.countChecks(checks);
  let st = statusFrom(main.p, ids);
  let statusFile = main.rel;
  if (!st) {
    for (const f of parsedFiles) {
      const s = statusFrom(f.p, ids);
      if (s) { st = s; statusFile = f.rel; break; }
    }
  }
  let status = st ? st.status : null;
  let inferred = false;
  if (!st && opts.kind === 'folder' && (opts.type || 'feature') === 'feature') {
    const s = inferStatus(parsedFiles.map((f) => path.basename(f.rel).toLowerCase()), counts, opts.archived);
    status = s.find((x) => ids.includes(x)) || null;
    inferred = true;
  }
  const base = path.basename(opts.kind === 'folder' ? opts.folderName : main.rel, '.md');
  let id = null;
  const mName = base.match(/^([A-Za-z][A-Za-z0-9]{1,9}-\d{1,5})(?=[-_ .]|$)/);
  if (mName) id = mName[1].toUpperCase();
  else if (main.p.title && P.ID_RE.test(main.p.title)) id = main.p.title.match(P.ID_RE)[1];
  else if (/^\d{2,}[-_]/.test(base)) id = base.match(/^(\d{2,})/)[1];
  let title = P.cleanTitle(main.p.title, id);
  if (!title || /^(requirements document|design document|tasks?|implementation plan|spec)$/i.test(title)) {
    title = base.replace(/^[A-Za-z]{2,10}-\d+[-_]?/, '').replace(/^\d+[-_]/, '').replace(/[-_]+/g, ' ').trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  const f = main.p.fields;
  const mtime = Math.max(...parsedFiles.map((x) => x.p.mtime));
  const allRequirements = [];
  for (const x of parsedFiles) for (const r of x.p.requirements) allRequirements.push({ ...r, file: x.rel });
  return {
    key: opts.key,
    type: opts.type || 'feature',
    kind: opts.kind,
    format: opts.format,
    id,
    title,
    status,
    statusRaw: st ? st.raw : null,
    statusNote: st ? st.note : '',
    statusInferred: inferred,
    statusFile,
    mainFile: main.rel,
    files: parsedFiles.map((x) => ({ rel: x.rel, name: opts.kind === 'folder' ? posix(path.relative(path.join(root, opts.key), path.join(root, x.rel))) : path.basename(x.rel) })),
    owner: f.owner || null,
    author: f.author || null,
    created: f.created || (f.createdUpdated || null),
    updated: f.updated || (f.createdUpdated || null),
    release: f.release || null,
    priority: f.priority || null,
    severity: f.severity || null,
    depsRaw: f.deps || null,
    deps: P.extractIds(f.deps).filter((d) => d !== id),
    checks: counts,
    requirementsCount: allRequirements.length,
    history: main.p.history ? main.p.history.rows.slice(-50) : [],
    mtime,
    archived: !!opts.archived,
    alerts: [],
  };
}

// ctx: { type, ids, format }. Las features admiten specs de carpeta (Spec Kit, Kiro, OpenSpec);
// los demás tipos solo archivos con ID en el nombre (DES-001-…, ADR-001-…, 0001-…).
function scanSpecDir(root, dirRel, ctx, specs, seenFiles) {
  const abs = path.join(root, dirRel);
  let entries;
  try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  const isFeature = ctx.type === 'feature';
  const addFile = (rel, archived) => {
    if (seenFiles.has(rel)) return;
    try {
      const sp = buildSpec(root, { mainRel: rel, fileRels: [rel], key: rel, kind: 'file', format: ctx.format, type: ctx.type }, ctx.ids);
      if (!isFeature && !sp.id) return; // documentos sueltos de la carpeta (p. ej. una introducción): no son decisiones
      if (archived) sp.archived = true;
      seenFiles.add(rel);
      specs.push(sp);
    } catch {}
  };
  for (const e of entries) {
    const rel = posix(path.join(dirRel, e.name));
    if (e.isFile() && /\.md$/i.test(e.name)) {
      if (!isIgnoredSpecFile(e.name)) addFile(rel, false);
    } else if (e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_') && !SKIP_DIRS.has(e.name)) {
      if (['archive', 'archivo', 'hecho', 'done'].includes(e.name)) {
        let subs;
        try { subs = fs.readdirSync(path.join(abs, e.name), { withFileTypes: true }); } catch { continue; }
        for (const sub of subs) {
          const subRel = posix(path.join(rel, sub.name));
          if (sub.isDirectory() && isFeature) addFolderSpec(root, subRel, sub.name, ctx, specs, seenFiles, true);
          else if (sub.isFile() && /\.md$/i.test(sub.name) && !isIgnoredSpecFile(sub.name)) addFile(subRel, true);
        }
        continue;
      }
      if (isFeature) addFolderSpec(root, rel, e.name, ctx, specs, seenFiles, false);
    }
  }
}

function addFolderSpec(root, rel, name, ctx, specs, seenFiles, archived) {
  const files = listMd(path.join(root, rel), 2).map((a) => posix(path.relative(root, a)));
  if (!files.length) return;
  files.sort((a, b) => {
    const ia = PRIORITY.indexOf(path.basename(a).toLowerCase());
    const ib = PRIORITY.indexOf(path.basename(b).toLowerCase());
    const da = a.split('/').length; const db = b.split('/').length;
    if (da !== db) return da - db;
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  files.forEach((f) => seenFiles.add(f));
  const fmt = ctx.format === 'auto' ? (files.some((f) => /requirements\.md$/i.test(f)) ? 'kiro' : 'speckit') : ctx.format;
  try {
    specs.push(buildSpec(root, { mainRel: files[0], fileRels: files, key: rel, kind: 'folder', format: fmt, folderName: name, archived, type: ctx.type }, ctx.ids));
  } catch {}
}

// Registro (README de la carpeta de specs): archivo → estado declarado
function parseRegistry(root, dirRel, ids) {
  const abs = path.join(root, dirRel, 'README.md');
  if (!isFile(abs)) return null;
  const map = new Map();
  const lines = readText(abs).split(/\r?\n/);
  lines.forEach((line, n) => {
    if (!/^\s*\|/.test(line)) return;
    const link = line.match(/\]\(([^)#\s]+)/);
    if (!link) return;
    const cells = P.splitRow(line);
    let status = null;
    for (const c of cells) {
      const bt = c.match(/`([^`]+)`/);
      if (bt) { const s = P.normalizeStatus(bt[0], ids).status; if (s) { status = s; break; } }
    }
    const target = posix(path.normalize(path.join(dirRel, decodeURIComponent(link[1])))).replace(/\/$/, '');
    map.set(sameKey(target), { status, line: n });
  });
  return { rel: posix(path.join(dirRel, 'README.md')), map };
}

// ---------- skills / documentos de agentes ----------
function readSkillDir(dirAbs, scope, root) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skillFile = path.join(dirAbs, e.name, 'SKILL.md');
    if (!isFile(skillFile)) continue;
    let name = e.name; let description = ''; let version = null; let install = null; let kitVersion = null; let mtime = 0;
    try {
      const text = readText(skillFile);
      const fm = P.parseFrontmatter(text.split(/\r?\n/));
      // formato de skill por carpetas: name, version, install (always | conditional | on-demand | never), description
      if (fm) { name = fm.data.name || name; description = fm.data.description || ''; version = fm.data.version || null; install = fm.data.install || null; }
      const v = text.match(/sdd-hub(?:-skill)? v(\d+)/);
      if (v) kitVersion = Number(v[1]);
      mtime = fs.statSync(skillFile).mtimeMs;
    } catch {}
    const files = listMd(path.join(dirAbs, e.name), 3).length;
    out.push({
      dir: e.name, name, description, scope, version, install, kitVersion, mtime, files,
      rel: root ? posix(path.relative(root, skillFile)) : null,
      abs: skillFile,
    });
  }
  return out;
}

function readMdEntries(dirAbs, root, kind) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isFile() || !/\.md$/i.test(e.name)) continue;
    const abs = path.join(dirAbs, e.name);
    let description = '';
    try {
      const fm = P.parseFrontmatter(readText(abs).split(/\r?\n/));
      if (fm) description = fm.data.description || '';
    } catch {}
    out.push({ name: e.name.replace(/\.md$/i, ''), description, kind, rel: posix(path.relative(root, abs)) });
  }
  return out;
}

function globalSkills() {
  return readSkillDir(path.join(os.homedir(), '.claude', 'skills'), 'global', null);
}

// ---------- documentos ----------
function walkProjectMd(root) {
  const out = [];
  (function walk(d, lvl) {
    if (out.length >= MAX_MD_FILES || lvl > 7) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= MAX_MD_FILES) return;
      const abs = path.join(d, e.name);
      if (e.isFile()) {
        if (/\.(md|markdown|mdx)$/i.test(e.name)) {
          try { const st = fs.statSync(abs); out.push({ abs, mtime: st.mtimeMs, size: st.size }); } catch {}
        }
      } else if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        if (e.name.startsWith('.') && !DOT_DIRS_ALLOWED.has(e.name)) continue;
        walk(abs, lvl + 1);
      }
    }
  })(root, 0);
  return out;
}

// Posibles secretos en un .md (cacheado por fecha y tamaño para no releer los archivos en cada escaneo)
const secretCache = new Map();
function secretLines(abs, mtime, size) {
  const c = secretCache.get(abs);
  if (c && c.m === mtime && c.s === size) return c.v;
  let v = [];
  if (size <= 1024 * 1024) { try { v = findSecrets(readText(abs)).map((h) => h.line); } catch {} }
  secretCache.set(abs, { m: mtime, s: size, v });
  return v;
}

function docCategory(rel) {
  const low = rel.toLowerCase();
  const base = path.basename(low);
  if (low.startsWith('.sdd/review/')) return 'review';
  if (/^\.sdd\/(instrucciones|instructions)\.md$/.test(low) || /^\.sdd\/(plantillas|templates)\//.test(low)) return 'agent';
  if (low.startsWith('.skills/') || /^\.(claude|agents|gemini|codex|cursor|windsurf)\/skills\//.test(low)) return 'skill';
  if (/^\.sdd\/(proyecto|project|estado|status|decisiones|decisions)\.md$/.test(low) || low.startsWith('.memory/')) return 'agent';
  if (low.startsWith('.claude/') || ['claude.md', 'agents.md', 'gemini.md', 'claude.local.md'].includes(base) ||
      low.startsWith('.cursor/') || low.startsWith('.kiro/steering/') || low.startsWith('.github/copilot') ||
      /^\.(codex|gemini|agents|windsurf|clinerules|continue|junie)\//.test(low) || ['gemini.md', 'codex.md', 'copilot-instructions.md', 'conventions.md'].includes(base)) return 'agent';
  return 'doc';
}

// ---------- kit v5: skill, ficha, estado y decisiones ----------
// Idioma de la skill del kit (marca «lang xx» de .skills/sdd/SKILL.md)
function kitSkillLang(root) {
  const abs = path.join(root, SKILL_DIR, 'SKILL.md');
  if (!isFile(abs)) return null;
  const m = readText(abs).match(/sdd-hub v\d+[^\n]*?\blang (es|en)\b/);
  return m ? m[1] : null;
}

// Archivo del proyecto en .sdd/ en cualquiera de los dos idiomas (primero el del kit)
function sddFile(root, key, lang) {
  const order = lang === 'en' ? ['en', 'es'] : ['es', 'en'];
  for (const l of order) { const rel = `.sdd/${LAYOUT[l][key]}`; if (isFile(path.join(root, rel))) return rel; }
  return null;
}

// Sistema de diseño: <carpeta de diseño>/sistema/ (system/ en inglés), con su index.md y un archivo por parte
// agrupados en fundamentos, componentes y patrones. Si no existe, se devuelve la carpeta donde se creará.
function readDesignSystem(root, designDir, docs, lang) {
  if (!designDir) return null;
  const order = lang === 'en' ? ['en', 'es'] : ['es', 'en'];
  const found = order.find((l) => isDir(path.join(root, designDir, LAYOUT[l].designSystem)));
  const L = LAYOUT[found || order[0]];
  const dir = posix(path.join(designDir, L.designSystem));
  if (!found) return { dir, index: null, parts: [], updated: 0 };
  let index = null;
  const parts = [];
  for (const d of docs) {
    if (!d.rel.startsWith(dir + '/')) continue;
    const sub = d.rel.slice(dir.length + 1);
    if (/^(index|readme).md$/i.test(sub)) { if (!index || /^index/i.test(sub)) index = d.rel; continue; }
    let title = null;
    try { title = parseCached(path.join(root, d.rel)).title; } catch {}
    const slash = sub.indexOf('/');
    const folder = slash < 0 ? '' : sub.slice(0, slash).toLowerCase();
    const g = order.map((l) => LAYOUT[l].designGroups.indexOf(folder)).find((i) => i >= 0);
    parts.push({ rel: d.rel, path: sub, title: title || path.basename(sub, '.md'), group: g != null ? ['foundations', 'components', 'patterns'][g] : (folder || ''), folder, mtime: d.mtime, unread: d.unread });
  }
  parts.sort((a, b) => a.path.localeCompare(b.path, 'es', { numeric: true }));
  const updated = Math.max(0, ...parts.map((x) => x.mtime), ...docs.filter((x) => x.rel === index).map((x) => x.mtime));
  return { dir, index, parts, updated };
}

// Secciones «## Título» de un .md: [{ title, lines }]
function sectionsOf(text) {
  const out = [];
  let cur = null;
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence && line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (m) { cur = { title: m[1].trim(), lines: [] }; out.push(cur); } else if (cur) cur.lines.push(line);
  }
  return out;
}
const listItems = (lines) => lines.map((l) => l.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/)).filter(Boolean).map((m) => m[1].trim()).filter((x) => x && x !== '…' && x !== '...');
const NONE_RE = /^(ninguno|ninguna|none|n\/a|—|-)\.?$/i;

// Estado de la sesión (.sdd/estado.md / status.md): dónde quedó, siguientes pasos y bloqueos
function readSession(root, lang) {
  const rel = sddFile(root, 'status', lang);
  if (!rel) return null;
  try {
    const abs = path.join(root, rel);
    const p = parseCached(abs);
    const secs = sectionsOf(readText(abs));
    const find = (re) => secs.find((x) => re.test(x.title));
    const where = find(/d[oó]nde qued|where/i);
    const next = find(/siguiente|next/i);
    const block = find(/bloqueo|blocker/i);
    const para = (sec) => (sec ? sec.lines.map((l) => l.trim()).filter((l) => l && !/^\|/.test(l)).join(' ') : '');
    let blockers = block ? listItems(block.lines) : [];
    if (block && !blockers.length) { const t = para(block); if (t) blockers = [t]; }
    blockers = blockers.filter((x) => !NONE_RE.test(x));
    return {
      rel, mtime: p.mtime,
      updated: p.fields.updated || null,
      agent: p.fields.agent || null,
      where: para(where).slice(0, 600),
      next: next ? listItems(next.lines).slice(0, 8) : [],
      blockers: blockers.slice(0, 5),
    };
  } catch { return null; }
}

// Decisiones rápidas (.sdd/decisiones.md / decisions.md): una regla por línea, agrupadas por área
function readDecisions(root, lang) {
  const rel = sddFile(root, 'decisions', lang);
  if (!rel) return null;
  try {
    const abs = path.join(root, rel);
    const areas = sectionsOf(readText(abs)).map((sec) => ({
      area: sec.title,
      items: listItems(sec.lines).map((raw) => {
        const m = raw.match(/^(\d{4}-\d{2}-\d{2})\s*[·\-–—:]\s*(.*)$/);
        const body = m ? m[2] : raw;
        const parts = body.split(/\s*→\s*/);
        const refs = parts.length > 1 ? P.extractIds(parts.slice(1).join(', ')) : [];
        return { date: m ? m[1] : null, text: parts[0].trim(), refs };
      }),
    }));
    return { rel, mtime: fs.statSync(abs).mtimeMs, areas, count: areas.reduce((n, a) => n + a.items.length, 0) };
  } catch { return null; }
}

// Filas de las tablas de una sección (sin cabecera ni separador): [[celda, …], …]
const tableRows = (lines) => {
  const rows = lines.filter((l) => /^\s*\|/.test(l)).map((l) => P.splitRow(l).map((c) => c.replace(/\*\*/g, '').trim()));
  return rows.filter((r, i) => !r.every((c) => /^:?-{2,}:?$/.test(c)) && !(rows[i + 1] && rows[i + 1].every((c) => /^:?-{2,}:?$/.test(c))));
};

// Progreso del onboarding (tabla «## Onboarding» de .sdd/proyecto.md)
function readOnboarding(root, rel) {
  if (!rel) return null;
  try {
    const sec = sectionsOf(readText(path.join(root, rel))).find((x) => /onboarding/i.test(x.title));
    if (!sec) return null;
    const steps = tableRows(sec.lines).filter((r) => r.length >= 2 && r[0]).map((r) => ({
      step: r[0],
      done: /✅|✔|^(s[ií]|yes|hecho|done|ok)$/i.test(r[1]) || /no aplica|n\/a|^—$/i.test(r[1]),
    }));
    return steps.length ? { steps, pending: steps.filter((x) => !x.done).map((x) => x.step) } : null;
  } catch { return null; }
}

// Git del proyecto (.sdd/git.md): identidad y remotes con cuándo se sube a cada uno
function readGit(root, lang) {
  const rel = sddFile(root, 'git', lang);
  if (!rel) return null;
  try {
    const text = readText(path.join(root, rel));
    const all = tableRows(text.split(/\r?\n/));
    const field = (re) => { const r = all.find((x) => re.test(x[0])); return r && r[1] && !/^(…|\.\.\.)$/.test(r[1]) ? r[1].replace(/`/g, '') : null; };
    const sec = sectionsOf(text).find((x) => /^remotes?$/i.test(x.title));
    const remotes = sec ? tableRows(sec.lines).filter((r) => r.length >= 2 && r[0] && r[0] !== '…')
      .map((r) => ({ name: r[0].replace(/`/g, ''), branch: (r[2] || '').replace(/`/g, ''), when: r[3] || '' })) : [];
    return { rel, name: field(/^user\.name$|^nombre$|^name$/i), email: field(/^user\.email$|^email$|^correo$/i), remotes };
  } catch { return null; }
}

// Carpetas que deben llevar .htaccess: las ocultas con documentos se bloquean enteras; las de documentos, solo los .md.
// extraDirs: carpetas de documentos del proyecto (por tipo). ok = ya tiene .htaccess (no se toca).
const HIDDEN_PROTECT = ['.sdd', '.skills', '.claude', '.memory', '.specify', '.kiro'];
function protectTargets(root, extraDirs) {
  const out = [];
  const seen = new Set();
  const add = (rel, mdOnly) => {
    rel = posix(path.normalize(rel)).replace(/\/$/, '');
    if (!rel || rel === '.' || rel.startsWith('..') || seen.has(rel) || !isDir(path.join(root, rel))) return;
    // una carpeta dentro de otra ya protegida queda cubierta por el .htaccess del padre
    if (out.some((o) => rel.startsWith(o.rel + '/') && (!o.mdOnly || mdOnly))) return;
    seen.add(rel);
    out.push({ rel, mdOnly, ok: isFile(path.join(root, rel, '.htaccess')) });
  };
  for (const d of HIDDEN_PROTECT) add(d, false);
  add('docs', true);
  for (const d of extraDirs || []) if (d) add(d.split('/')[0].startsWith('.') ? d.split('/')[0] : d, !d.startsWith('.'));
  return out;
}

// ---------- proyecto completo ----------
const claudeSkillVersionPre = (root) => isFile(path.join(root, '.claude', 'skills', 'sdd-spec', 'SKILL.md'));
// Reglas de alertas por tipo (los ID de estado pueden personalizarse; si no existen, la alerta no salta)
const ALERT_RULES = {
  feature: { checks: true, pre: ['backlog', 'planning', 'awaiting-approval', 'review', 'approved'], work: ['in-progress'], done: ['awaiting-review', 'done', 'verified', 'released'], stale: ['in-progress'] },
  fix: { checks: true, pre: ['reported', 'investigating'], work: ['in-progress'], done: ['verified', 'released'], stale: ['investigating', 'in-progress'] },
  design: { checks: false, stale: ['proposed'], staleCode: 'stale-proposed' },
  architecture: { checks: false, stale: ['proposed'], staleCode: 'stale-proposed' },
};

function scanProject(project, settings, seen, full) {
  const root = project.path;
  const types = settings.types;
  const typeById = Object.fromEntries(types.map((t) => [t.id, t]));
  const idsOf = (type) => (typeById[type] || types[0]).statuses.map((x) => x.id);
  const closedOf = (type) => new Set((typeById[type] || types[0]).statuses.filter((x) => x.closed).map((x) => x.id));
  if (!isDir(root)) return { ...project, ok: false, error: tr(settings.lang, 'err.folderInaccessible') };

  const manifest = readJSON(path.join(root, '.sdd.json'));
  const mdirs = (manifest && manifest.dirs) || {};
  const specDirs = [];
  const norm = (rel) => posix(path.normalize(rel)).replace(/\/$/, '');
  const addDir = (rel, format, type) => {
    if (!rel) return;
    rel = norm(rel);
    if (isDir(path.join(root, rel)) && !specDirs.some((d) => d.rel === rel)) specDirs.push({ rel, format, type });
  };
  if (manifest && manifest.specsDir) addDir(manifest.specsDir, 'auto', 'feature');
  for (const t of types) if (mdirs[t.id]) addDir(mdirs[t.id], 'auto', t.id);
  for (const t of types) for (const d of t.dirs || []) addDir(d, 'auto', t.id);
  addDir('.specify/specs', 'speckit', 'feature');
  addDir('.kiro/specs', 'kiro', 'feature');
  addDir('openspec/changes', 'openspec', 'feature');

  const specs = [];
  const seenFiles = new Set();
  // las carpetas más profundas primero, para que docs/architecture/decisions gane a docs/architecture
  const ordered = specDirs.slice().sort((a, b) => b.rel.split('/').length - a.rel.split('/').length);
  for (const d of ordered) scanSpecDir(root, d.rel, { type: d.type, ids: idsOf(d.type), format: d.format }, specs, seenFiles);

  // specs sueltas en docs/ (p. ej. docs/spec-algo.md)
  const docsDir = path.join(root, 'docs');
  if (isDir(docsDir)) {
    for (const abs of listMd(docsDir, 2)) {
      const rel = posix(path.relative(root, abs));
      if (seenFiles.has(rel) || !/(^|[-_ ])spec/i.test(path.basename(rel)) || isIgnoredSpecFile(path.basename(rel))) continue;
      if (specDirs.some((d) => rel.startsWith(d.rel + '/'))) continue;
      seenFiles.add(rel);
      try { specs.push(buildSpec(root, { mainRel: rel, fileRels: [rel], key: rel, kind: 'file', format: 'generic', type: 'feature' }, idsOf('feature'))); } catch {}
    }
  }

  for (const sp of specs) {
    if (sp.format === 'auto') {
      const p = parseCached(path.join(root, sp.mainFile));
      const kind = p.loc.status && p.loc.status.kind;
      sp.format = kind === 'table' && sp.id ? 'sddhub' : kind === 'section' ? 'adr' : 'generic';
    }
  }

  // carpeta principal de cada tipo (la del manifiesto o la primera encontrada)
  const dirsByType = {};
  for (const t of types) {
    const fromManifest = t.id === 'feature' ? (mdirs.feature || (manifest && manifest.specsDir)) : mdirs[t.id];
    const found = specDirs.find((d) => d.type === t.id && (!fromManifest || d.rel === norm(fromManifest))) || specDirs.find((d) => d.type === t.id);
    dirsByType[t.id] = found ? found.rel : null;
  }
  const registries = specDirs.map((d) => parseRegistry(root, d.rel, idsOf(d.type))).filter(Boolean);

  // ---------- alertas ----------
  const now = Date.now();
  const staleMs = (settings.staleDays || 14) * 864e5;
  const idSet = new Set(specs.map((x) => x.id).filter(Boolean));
  const prefixes = new Set([...types.map((t) => t.prefix), ...[...idSet].map((x) => x.split('-')[0])]);
  for (const sp of specs) {
    const A = (level, code, vars) => sp.alerts.push({ level, code, text: tr(settings.lang, 'alert.' + code, vars) });
    if (sp.archived) continue;
    const R = ALERT_RULES[sp.type] || ALERT_RULES.feature;
    const closed = closedOf(sp.type);
    const firstStatus = idsOf(sp.type)[0];
    if (!sp.status && !sp.statusRaw) A('warn', 'no-status');
    else if (!sp.status) A('warn', 'unknown-status', { raw: sp.statusRaw });
    const c = sp.checks;
    const pending = c.total - c.done;
    if (R.stale.includes(sp.status) && now - sp.mtime > staleMs) A('warn', R.staleCode || 'stale', { days: Math.round((now - sp.mtime) / 864e5) });
    if (R.checks) {
      if (c.total && !pending && [...R.pre, ...R.work].includes(sp.status)) A('info', 'ready', { done: c.done, total: c.total });
      if (c.done && pending && R.pre.includes(sp.status)) A('info', 'started', { done: c.done, status: sp.status });
      if (pending && R.done.includes(sp.status)) A('warn', 'pending-checks', { n: pending, status: sp.status });
      if (sp.status && !closed.has(sp.status) && sp.status !== firstStatus && sp.format !== 'kiro' && c.total === 0) A('info', 'no-criteria');
    }
    for (const d of sp.deps) if (!idSet.has(d) && prefixes.has(d.split('-')[0])) A('warn', 'missing-dep', { dep: d });
    for (const r of registries) {
      const entry = r.map.get(sameKey(sp.key)) || r.map.get(sameKey(sp.mainFile));
      if (entry && entry.status && sp.status && entry.status !== sp.status) A('warn', 'registry', { rel: r.rel, status: entry.status });
    }
    if (sp.format === 'sddhub' && registries.some((r) => r.rel.startsWith(path.posix.dirname(sp.key) + '/')) && !registries.some((r) => r.map.has(sameKey(sp.key)))) {
      A('info', 'not-registered');
    }
  }

  // ---------- revisiones pendientes / hechas ----------
  const reviewDir = path.join(root, '.sdd', 'review');
  const reviews = { pending: [], done: [] };
  const readReview = (abs, done) => {
    try {
      const text = readText(abs);
      const target = (text.match(/^- (?:Archivo|File): `([^`]+)`/m) || [])[1] || null;
      const changes = (text.match(/^## (?:Cambio|Change) · /gm) || []).length;
      const result = done ? (text.split(/^## (?:Resultado de la revisión|Review result)\s*$/m)[1] || '').trim() : '';
      return { rel: posix(path.relative(root, abs)), target, changes, mtime: fs.statSync(abs).mtimeMs, result: result.slice(0, 1500) };
    } catch { return null; }
  };
  try {
    for (const e of fs.readdirSync(reviewDir, { withFileTypes: true })) {
      if (e.isFile() && /\.md$/i.test(e.name)) { const r = readReview(path.join(reviewDir, e.name), false); if (r) reviews.pending.push(r); }
    }
  } catch {}
  for (const sub of ['hecho', 'done']) {
    try {
      const doneDir = path.join(reviewDir, sub);
      for (const e of fs.readdirSync(doneDir, { withFileTypes: true })) {
        if (e.isFile() && /\.md$/i.test(e.name)) { const r = readReview(path.join(doneDir, e.name), true); if (r) reviews.done.push(r); }
      }
    } catch {}
  }
  reviews.done.sort((a, b) => b.mtime - a.mtime);
  reviews.done = reviews.done.slice(0, 30);
  const pendingTargets = new Set(reviews.pending.map((r) => r.target).filter(Boolean));
  for (const s of specs) {
    if (s.files.some((f) => pendingTargets.has(f.rel))) s.alerts.push({ level: 'review', code: 'review', text: tr(settings.lang, 'alert.review') });
  }

  // ---------- documentos .md y no leídos ----------
  const mdFiles = walkProjectMd(root);
  const baseline = project.addedAt || 0;
  const specFileSet = new Set();
  for (const s of specs) for (const f of s.files) specFileSet.add(f.rel);
  let unread = 0;
  const docs = mdFiles.map((m) => {
    const rel = posix(path.relative(root, m.abs));
    const seenAt = seen[sameKey(m.abs)];
    const isUnread = m.mtime > Math.max(seenAt || 0, baseline) + 1000;
    if (isUnread && docCategory(rel) !== 'review') unread++;
    const secrets = secretLines(m.abs, m.mtime, m.size);
    return { rel, mtime: m.mtime, size: m.size, unread: isUnread, category: specFileSet.has(rel) ? 'spec' : docCategory(rel), secrets: secrets.length ? secrets : undefined };
  });
  const secretDocs = docs.filter((d) => d.secrets).map((d) => ({ rel: d.rel, lines: d.secrets }));
  const unreadSet = new Set(docs.filter((d) => d.unread).map((d) => d.rel));
  for (const s of specs) s.unread = s.files.some((f) => unreadSet.has(f.rel));

  // ---------- compatibilidad MD SDD Hub ----------
  // Versión e idioma del kit: los de la skill .skills/sdd/SKILL.md (v5+), los de .sdd/instructions.md (en) o
  // .sdd/instrucciones.md (es) del kit v4 o, en instalaciones antiguas, la versión de la skill de Claude Code
  const versionIn = (abs) => {
    if (!isFile(abs)) return null;
    const m = readText(abs).match(/sdd-hub(?:-skill)? v(\d+)/);
    return m ? Number(m[1]) : 0;
  };
  const skillKitVersion = versionIn(path.join(root, SKILL_DIR, 'SKILL.md'));
  const enVersion = versionIn(path.join(root, '.sdd', 'instructions.md'));
  const esVersion = versionIn(path.join(root, '.sdd', 'instrucciones.md'));
  const instructionsVersion = skillKitVersion != null ? skillKitVersion : enVersion != null ? enVersion : esVersion;
  const kitLang = (manifest && (manifest.lang === 'en' || manifest.lang === 'es')) ? manifest.lang
    : kitSkillLang(root) || (enVersion != null ? 'en' : (esVersion != null || claudeSkillVersionPre(root)) ? 'es' : null);
  const claudeSkillVersion = versionIn(path.join(root, '.claude', 'skills', 'sdd-spec', 'SKILL.md'));
  const legacyKit = instructionsVersion == null && claudeSkillVersion != null;
  const skillVersion = instructionsVersion != null ? instructionsVersion : (claudeSkillVersion != null ? Math.min(claudeSkillVersion, KIT_VERSION - 1) : null);
  // archivos de instrucciones de agentes y si enlazan las instrucciones actuales
  const agentFiles = {};
  for (const f of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
    const abs = path.join(root, f);
    if (!isFile(abs)) continue;
    const text = readText(abs);
    const block = text.includes('<!-- sdd-hub:start');
    agentFiles[f] = { block, current: block && /\.skills\/sdd\/SKILL\.md/.test(text) };
  }
  const sddDocCandidates = [];
  if (manifest && manifest.sddDoc) sddDocCandidates.push(manifest.sddDoc);
  if (isDir(docsDir)) {
    try { for (const n of fs.readdirSync(docsDir)) if (/sdd/i.test(n) && /\.md$/i.test(n)) sddDocCandidates.push('docs/' + n); } catch {}
  }
  sddDocCandidates.push('.specify/memory/constitution.md', 'openspec/project.md');
  const sddDoc = sddDocCandidates.find((r) => isFile(path.join(root, r))) || null;
  const templates = {};
  for (const t of types) {
    templates[t.id] = null;
    if (!dirsByType[t.id]) continue;
    try {
      const f = fs.readdirSync(path.join(root, dirsByType[t.id])).find((n) => /template|plantilla/i.test(n) && /\.md$/i.test(n));
      if (f) templates[t.id] = dirsByType[t.id] + '/' + f;
    } catch {}
  }
  let hookInstalled = false;
  for (const f of ['settings.local.json', 'settings.json']) {
    const j = readJSON(path.join(root, '.claude', f));
    if (j && JSON.stringify(j.hooks || {}).includes('sdd-review.js')) hookInstalled = true;
  }
  const compat = {
    manifest: !!manifest,
    manifestData: manifest,
    specsDir: dirsByType.feature,
    dirs: dirsByType,
    templates,
    skill: skillVersion,
    skillLatest: KIT_VERSION,
    legacyKit,
    kitLang,
    instructionsFile: skillKitVersion != null ? SKILL_DIR + '/SKILL.md' : enVersion != null ? '.sdd/instructions.md' : esVersion != null ? '.sdd/instrucciones.md' : null,
    projectFile: sddFile(root, 'project', kitLang),
    git: readGit(root, kitLang),
    protect: protectTargets(root, Object.values(dirsByType)),
    claudeSkill: claudeSkillVersion != null,
    usesClaude: isDir(path.join(root, '.claude')) || isFile(path.join(root, 'CLAUDE.md')),
    agentFiles,
    template: templates.feature,
    registry: dirsByType.feature ? (registries.find((r) => r.rel === dirsByType.feature + '/README.md') || {}).rel || null : null,
    registries: Object.fromEntries(types.map((t) => [t.id, dirsByType[t.id] ? (registries.find((r) => r.rel === dirsByType[t.id] + '/README.md') || {}).rel || null : null])),
    sddDoc,
    agentsBlock: !!(agentFiles['AGENTS.md'] && agentFiles['AGENTS.md'].block),
    agentsFile: !!agentFiles['AGENTS.md'],
    claudeMd: !!agentFiles['CLAUDE.md'],
    hook: hookInstalled,
  };
  compat.outdated = (compat.skill != null && compat.skill < KIT_VERSION) ||
    Object.values(agentFiles).some((a) => a.block && !a.current);
  compat.unprotected = compat.protect.filter((x) => !x.ok).map((x) => x.rel);
  compat.onboarding = readOnboarding(root, compat.projectFile);
  const session = readSession(root, kitLang);
  const decisions = readDecisions(root, kitLang);

  // ---------- resumen ----------
  const byType = {};
  for (const t of types) byType[t.id] = { total: 0, active: 0, byStatus: {} };
  let alerts = 0;
  for (const sp of specs) {
    const b = byType[sp.type] || (byType[sp.type] = { total: 0, active: 0, byStatus: {} });
    if (!sp.archived) {
      b.total++;
      const k = sp.status || '_none';
      b.byStatus[k] = (b.byStatus[k] || 0) + 1;
      if (sp.status && !closedOf(sp.type).has(sp.status)) b.active++;
    }
    alerts += sp.alerts.filter((a) => a.level === 'warn').length;
  }
  const lastActivity = Math.max(0, ...docs.map((d) => d.mtime));
  const summary = {
    total: specs.filter((x) => !x.archived).length,
    byType,
    // trabajo abierto: features y fixes sin cerrar; decisiones pendientes: diseño y arquitectura propuestas
    active: (byType.feature ? byType.feature.active : 0) + (byType.fix ? byType.fix.active : 0),
    proposed: specs.filter((x) => !x.archived && (x.type === 'design' || x.type === 'architecture') && x.status === 'proposed').length,
    byStatus: byType.feature ? byType.feature.byStatus : {},
    alerts,
    unread,
    reviewsPending: reviews.pending.length,
    lastActivity,
    docs: docs.length,
    decisions: decisions ? decisions.count : 0,
    secrets: secretDocs.length,
  };

  const res = { ...project, ok: true, summary, compat, specs, session, secretDocs };
  if (full) {
    res.docs = docs;
    res.skills = [
      ...readSkillDir(path.join(root, '.skills'), '.skills', root),
      ...['.claude', '.agents', '.codex', '.gemini', '.cursor'].flatMap((d) => readSkillDir(path.join(root, d, 'skills'), d, root)),
    ];
    res.decisions = decisions;
    res.decisionAreas = LAYOUT[kitLang === 'en' ? 'en' : 'es'].areas;
    // decisiones con documento: los DES y ADR vigentes
    res.decisionDocs = specs.filter((x) => !x.archived && (x.type === 'design' || x.type === 'architecture') && x.status === 'accepted')
      .map((x) => ({ key: x.key, id: x.id, title: x.title, type: x.type, updated: x.updated }));
    res.commands = readMdEntries(path.join(root, '.claude', 'commands'), root, 'command');
    res.agents = readMdEntries(path.join(root, '.claude', 'agents'), root, 'agent');
    res.reviews = reviews;
    res.designSystem = readDesignSystem(root, dirsByType.design, docs, kitLang);
    res.specDirs = specDirs.map((d) => ({ rel: d.rel, type: d.type }));
  } else {
    res.reviewsPending = reviews.pending;
  }
  return res;
}

// ---------- descubrimiento de proyectos ----------
function discover(rootAbs, maxDepth = 5) {
  const results = [];
  let visited = 0;
  (function walk(dir, depth) {
    if (visited++ > 6000) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const names = new Set(entries.map((e) => e.name));
    const signals = [];
    if (names.has('.sdd.json')) signals.push('MD SDD Hub');
    if (isDir(path.join(dir, 'docs', 'specs')) || (names.has('specs') && isDir(path.join(dir, 'specs')))) signals.push('specs');
    if (names.has('.specify')) signals.push('Spec Kit');
    if (names.has('.kiro')) signals.push('Kiro');
    if (names.has('openspec')) signals.push('OpenSpec');
    if (names.has('CLAUDE.md')) signals.push('CLAUDE.md');
    if (names.has('AGENTS.md')) signals.push('AGENTS.md');
    if (names.has('.claude') && isDir(path.join(dir, '.claude'))) signals.push('.claude');
    if (names.has('docs') && isDir(path.join(dir, 'docs'))) {
      try { if (fs.readdirSync(path.join(dir, 'docs')).some((n) => /spec/i.test(n))) signals.push('docs/spec'); } catch {}
    }
    // un AGENTS.md suelto suele venir en plugins de terceros: no se premarca
    const strong = signals.length > 0 && !(signals.length === 1 && signals[0] === 'AGENTS.md');
    if (signals.length || (names.has('.git') && depth > 0)) {
      if (!signals.length) signals.push('git');
      results.push({ path: dir, name: path.basename(dir), signals, strong });
      if (depth > 0) return;
    }
    if (depth >= maxDepth) return;
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.') || e.name.startsWith('$') || SKIP_DIRS.has(e.name)) continue;
      if (['wp-content'].includes(path.basename(dir)) && !['plugins', 'themes', 'mu-plugins'].includes(e.name)) continue;
      walk(path.join(dir, e.name), depth + 1);
    }
  })(rootAbs, 0);
  return results;
}

function suggestedRoots() {
  const home = os.homedir();
  const c = [
    'C:\\xampp\\htdocs', 'C:\\laragon\\www', 'C:\\wamp64\\www',
    path.join(home, 'Desktop', 'localmywp', 'sites'),
    path.join(home, 'Local Sites'),
    path.join(home, 'code'), path.join(home, 'projects'), path.join(home, 'proyectos'), path.join(home, 'dev'),
    path.join(home, 'Documents', 'GitHub'), path.join(home, 'source', 'repos'),
  ];
  return [...new Set(c)].filter(isDir);
}

module.exports = {
  scanProject, discover, suggestedRoots, globalSkills, parseCached, readText, readJSON, isDir, isFile, posix, sameKey,
  KIT_VERSION, SKIP_DIRS, SKILL_DIR, LAYOUT, kitSkillLang, protectTargets,
};
