#!/usr/bin/env node
'use strict';
// MD SDD Hub · servidor local sin dependencias. Solo escucha en 127.0.0.1.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const S = require('./lib/scan');
const W = require('./lib/write');
const P = require('./lib/md-parse');
const { tr, LANGS } = require('./lib/i18n');

const PORT = Number(process.env.PORT) || 4780;
const HOST = '127.0.0.1';
// Carpeta de datos (configurable para pruebas: SDD_HUB_DATA=/ruta node server.js)
const DATA_DIR = process.env.SDD_HUB_DATA ? path.resolve(process.env.SDD_HUB_DATA) : path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SEEN_FILE = path.join(DATA_DIR, 'seen.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const VERSION = require('./package.json').version;

// ---------- configuración (JSON, sin base de datos) ----------
const DEFAULT_SETTINGS = {
  statusesByType: {}, // estados personalizados por tipo; si falta un tipo se usan los de serie
  staleDays: 14,
  editor: 'auto',
  appendHistory: true,
  reviewLog: true,
  protectWeb: true, // .htaccess que bloquea el acceso web a las carpetas con documentos
  author: '',
  theme: 'auto',
  lang: '', // '' = automático (idioma del navegador); 'es' o 'en' si se elige a mano
};

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function saveJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}
const config = loadJSON(CONFIG_FILE, { projects: [], settings: {} });
config.projects = config.projects || [];
config.settings = { ...DEFAULT_SETTINGS, ...(config.settings || {}) };
// Migración desde la 1.1: había una sola lista de estados, que pasa a ser la de las features
if (Array.isArray(config.settings.statuses)) {
  if (!config.settings.statusesByType.feature) config.settings.statusesByType.feature = config.settings.statuses;
  delete config.settings.statuses;
}

// Tipos de documento con sus estados efectivos (de serie o personalizados en Ajustes)
function effectiveTypes() {
  const custom = config.settings.statusesByType || {};
  return P.DEFAULT_TYPES.map((tp) => ({ ...tp, statuses: Array.isArray(custom[tp.id]) && custom[tp.id].length ? custom[tp.id] : tp.statuses }));
}
function typeDef(id) {
  const tp = effectiveTypes().find((x) => x.id === (id || 'feature'));
  if (!tp) throw W.httpError(400, 'err.badType');
  return tp;
}
function cleanStatuses(list) {
  return (Array.isArray(list) ? list : [])
    .filter((x) => x && /^[a-z0-9][a-z0-9-]*$/.test(x.id))
    .map((x) => ({ id: x.id, label: String(x.label || x.id), color: /^#[0-9a-f]{6}$/i.test(x.color) ? x.color : '#8b93a1', closed: !!x.closed }));
}
const seen = loadJSON(SEEN_FILE, {});
let seenDirty = false;
const saveConfig = () => saveJSON(CONFIG_FILE, config);
// Idioma de la interfaz: el elegido en Ajustes o, en automático, el del navegador de cada petición
let reqLang = 'es';
const uiLang = () => config.settings.lang || reqLang;
const t = (key, vars) => tr(uiLang(), key, vars);
function langFromRequest(req) {
  const h = String(req.headers['x-sdd-lang'] || req.headers['accept-language'] || '').toLowerCase();
  return h.startsWith('es') || (!h.startsWith('en') && h.includes('es')) ? 'es' : h ? 'en' : 'es';
}
setInterval(() => { if (seenDirty) { seenDirty = false; saveJSON(SEEN_FILE, seen); } }, 2000).unref();

function markSeen(abs) {
  try { seen[S.sameKey(abs)] = fs.statSync(abs).mtimeMs; seenDirty = true; } catch {}
}

// ---------- editores ----------
function detectEditors() {
  const found = [];
  const cands = process.platform === 'win32'
    ? [['code', 'VS Code'], ['cursor', 'Cursor'], ['windsurf', 'Windsurf'], ['zed', 'Zed'], ['phpstorm64', 'PhpStorm'], ['phpstorm', 'PhpStorm'], ['notepad++', 'Notepad++']]
    : [['code', 'VS Code'], ['cursor', 'Cursor'], ['windsurf', 'Windsurf'], ['zed', 'Zed'], ['phpstorm', 'PhpStorm'], ['subl', 'Sublime Text']];
  for (const [cmd, label] of cands) {
    try {
      execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
      if (!found.some((f) => f.label === label)) found.push({ cmd, label });
    } catch {}
  }
  if (process.platform === 'win32') {
    const la = process.env.LOCALAPPDATA || '';
    const known = [
      [path.join(la, 'Programs', 'Microsoft VS Code', 'Code.exe'), 'VS Code'],
      [path.join(la, 'Programs', 'cursor', 'Cursor.exe'), 'Cursor'],
    ];
    for (const [exe, label] of known) if (fs.existsSync(exe) && !found.some((f) => f.label === label)) found.push({ cmd: `"${exe}"`, label });
  }
  return found;
}
const EDITORS = detectEditors();
function editorCmd() {
  const e = config.settings.editor;
  if (e && e !== 'auto') return e;
  return EDITORS[0] ? EDITORS[0].cmd : null;
}

// ---------- escaneo con caché corta ----------
let stateCache = null;
let stateAt = 0;
function invalidate() { stateCache = null; }
function project(id) {
  const p = config.projects.find((x) => x.id === id);
  if (!p) throw W.httpError(404, 'err.projectNotFound');
  return p;
}
// Ajustes para las escrituras: el idioma de la interfaz decide el del kit si el proyecto aún no tiene uno
const wset = () => ({ ...config.settings, lang: uiLang() });
function scanOne(p, full) { return S.scanProject(p, { ...config.settings, types: effectiveTypes(), lang: uiLang() }, seen, full); }
function getState() {
  if (stateCache && stateCache.lang === uiLang() && Date.now() - stateAt < 1500) return stateCache;
  const projects = config.projects.map((p) => {
    try { return scanOne(p, false); } catch (e) { return { ...p, ok: false, error: e.message }; }
  });
  stateCache = { lang: uiLang(), version: VERSION, types: effectiveTypes(), settings: config.settings, editors: EDITORS, editor: editorCmd(), projects, home: os.homedir(), platform: process.platform };
  stateAt = Date.now();
  return stateCache;
}
function findSpec(scan, key) {
  const s = scan.specs.find((x) => x.key === key);
  if (!s) throw W.httpError(404, 'err.specNotFound');
  return s;
}

// ---------- abrir en el sistema ----------
function openPath(abs, how) {
  const isFile = fs.existsSync(abs) && fs.statSync(abs).isFile();
  if (how === 'editor') {
    const cmd = editorCmd();
    if (!cmd) throw W.httpError(400, 'err.noEditor');
    spawn(`${cmd} "${abs}"`, { shell: true, detached: true, stdio: 'ignore', windowsHide: true }).unref();
    return;
  }
  if (process.platform === 'win32') {
    if (isFile) spawn('explorer.exe', [`/select,"${abs}"`], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref();
    else spawn('explorer.exe', [abs], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', isFile ? ['-R', abs] : [abs], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [isFile ? path.dirname(abs) : abs], { detached: true, stdio: 'ignore' }).unref();
  }
}

// ---------- explorador de carpetas ----------
function listDir(p) {
  if (!p) {
    const roots = [];
    if (process.platform === 'win32') {
      for (let c = 65; c <= 90; c++) {
        const d = String.fromCharCode(c) + ':\\';
        try { fs.accessSync(d); roots.push({ name: d, path: d }); } catch {}
      }
    } else roots.push({ name: '/', path: '/' });
    roots.unshift({ name: t('fs.home'), path: os.homedir() });
    return { path: '', parent: null, dirs: roots, suggestions: S.suggestedRoots() };
  }
  const abs = path.resolve(p);
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const dirs = entries.filter((e) => {
    try { return e.isDirectory() && !e.name.startsWith('$') && e.name !== 'System Volume Information'; } catch { return false; }
  }).map((e) => ({ name: e.name, path: path.join(abs, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  const markers = ['.sdd.json', 'CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.git', 'docs', 'specs', '.specify', '.kiro', 'openspec', '.claude']
    .filter((m) => entries.some((e) => e.name === m));
  const parent = path.dirname(abs) === abs ? '' : path.dirname(abs);
  return { path: abs, parent, dirs, markers };
}

// ---------- búsqueda ----------
function search(q) {
  q = String(q || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const out = [];
  for (const p of config.projects) {
    if (!S.isDir(p.path)) continue;
    let scan;
    try { scan = scanOne(p, true); } catch { continue; }
    for (const d of scan.docs) {
      if (out.length >= 150) return out;
      if (d.size > 1024 * 1024) continue;
      let text;
      try { text = S.readText(path.join(p.path, d.rel)); } catch { continue; }
      const low = text.toLowerCase();
      const nameHit = d.rel.toLowerCase().includes(q);
      const i = low.indexOf(q);
      if (i < 0 && !nameHit) continue;
      let count = 0; let k = i;
      while (k >= 0 && count < 99) { count++; k = low.indexOf(q, k + q.length); }
      const line = i >= 0 ? text.slice(0, i).split('\n').length : 1;
      const from = Math.max(0, i - 70);
      out.push({
        projectId: p.id, project: p.name, rel: d.rel, category: d.category, count, line,
        snippet: i >= 0 ? (from > 0 ? '…' : '') + text.slice(from, i + q.length + 110).replace(/\s+/g, ' ') : '',
      });
    }
  }
  return out;
}

// ---------- API ----------
const routes = {
  'GET /api/state': () => getState(),

  'GET /api/project': (q) => scanOne(project(q.id), true),

  'GET /api/file': (q) => {
    const p = project(q.id);
    const abs = W.resolveIn(p.path, q.rel);
    const st = fs.statSync(abs);
    if (st.size > 5 * 1024 * 1024) throw W.httpError(413, 'err.tooBig');
    const content = S.readText(abs);
    markSeen(abs);
    invalidate();
    return { rel: q.rel, content, mtime: st.mtimeMs, parsed: S.parseCached(abs) };
  },

  'GET /api/activity': (q) => {
    const limit = Math.min(Number(q.limit) || 120, 500);
    const items = [];
    for (const p of config.projects) {
      if (!S.isDir(p.path)) continue;
      try {
        for (const d of scanOne(p, true).docs) items.push({ projectId: p.id, project: p.name, ...d });
      } catch {}
    }
    items.sort((a, b) => b.mtime - a.mtime);
    return { items: items.slice(0, limit) };
  },

  'GET /api/search': (q) => ({ results: search(q.q) }),

  'GET /api/fs': (q) => listDir(q.path),

  'GET /api/global-skills': () => ({ skills: S.globalSkills() }),

  'POST /api/projects/add': (b) => {
    const abs = path.resolve(String(b.path || '').trim());
    if (!S.isDir(abs)) throw W.httpError(400, 'err.folderMissing');
    const existing = config.projects.find((p) => S.sameKey(p.path) === S.sameKey(abs));
    if (existing) return { project: existing, existed: true };
    const p = { id: crypto.randomBytes(5).toString('hex'), name: (b.name || path.basename(abs)).trim(), path: abs, addedAt: Date.now() };
    if (b.markAllSeen === false) p.addedAt = 0;
    config.projects.push(p);
    saveConfig(); invalidate();
    // Opcional: instala la skill y enlaza sus instrucciones desde AGENTS.md
    let prepared = [];
    if (b.prepare) {
      const c = scanOne(p, false).compat;
      prepared = W.installKit(p.path, scanOne(p, false), { ...W.kitPlan(c, 'prepare'), lang: b.lang || uiLang() }, p, wset());
      invalidate();
    }
    return { project: p, prepared };
  },

  'POST /api/projects/remove': (b) => {
    config.projects = config.projects.filter((p) => p.id !== b.id);
    saveConfig(); invalidate();
    return { ok: true };
  },

  'POST /api/projects/update': (b) => {
    const p = project(b.id);
    if (b.name) p.name = String(b.name).trim();
    if (Array.isArray(b.order)) {
      const map = new Map(config.projects.map((x) => [x.id, x]));
      config.projects = b.order.map((id) => map.get(id)).filter(Boolean).concat(config.projects.filter((x) => !b.order.includes(x.id)));
    }
    if (b.pinned != null) p.pinned = !!b.pinned;
    // estados del flujo que este proyecto no usa (p. ej. «planning»); el resto de proyectos no cambia
    if (b.hiddenStatuses && typeof b.hiddenStatuses === 'object') {
      const out = {};
      for (const [type, list] of Object.entries(b.hiddenStatuses)) {
        const def = typeDef(type);
        const ids = (Array.isArray(list) ? list : []).filter((id, i, a) => a.indexOf(id) === i && def.statuses.some((x) => x.id === id && !x.closed) && def.statuses[0].id !== id);
        if (ids.length) out[type] = ids;
      }
      if (Object.keys(out).length) p.hiddenStatuses = out; else delete p.hiddenStatuses;
      W.saveSkipStatuses(p.path, p.hiddenStatuses || {});
    }
    saveConfig(); invalidate();
    return { project: p };
  },

  'POST /api/discover': (b) => {
    const root = path.resolve(String(b.root || ''));
    if (!S.isDir(root)) throw W.httpError(400, 'err.folderMissing');
    const known = new Set(config.projects.map((p) => S.sameKey(p.path)));
    return { results: S.discover(root, 5).map((r) => ({ ...r, added: known.has(S.sameKey(r.path)) })) };
  },

  'POST /api/file/save': (b) => {
    const p = project(b.id);
    const r = W.saveFile(p.path, b.rel, String(b.content ?? ''), b.baseMtime, !!b.force, wset());
    markSeen(W.resolveIn(p.path, b.rel));
    invalidate();
    return r;
  },

  'POST /api/file/new': (b) => {
    const p = project(b.id);
    let rel = String(b.rel || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!rel) throw W.httpError(400, 'err.noPath');
    if (!/\.(md|markdown|mdx)$/i.test(rel)) rel += '.md';
    const abs = W.resolveIn(p.path, rel);
    if (fs.existsSync(abs)) throw W.httpError(409, 'err.fileExists');
    const title = path.basename(rel).replace(/\.(md|markdown|mdx)$/i, '');
    W.saveFile(p.path, rel, `# ${title}\n\n`, null, false, wset());
    markSeen(abs);
    invalidate();
    return { rel };
  },

  'POST /api/seen': (b) => {
    const p = project(b.id);
    if (b.all) {
      for (const d of scanOne(p, true).docs) markSeen(path.join(p.path, d.rel));
    } else markSeen(W.resolveIn(p.path, b.rel));
    invalidate();
    return { ok: true };
  },

  'POST /api/spec/status': (b) => {
    const p = project(b.id);
    const spec = findSpec(scanOne(p, false), b.key);
    if (!typeDef(spec.type).statuses.some((x) => x.id === b.status)) throw W.httpError(400, 'err.badStatus');
    const r = W.setStatus(p.path, spec, b.status, b.note, wset());
    markSeen(W.resolveIn(p.path, spec.statusFile || spec.mainFile));
    markSeen(path.join(p.path, path.posix.dirname(spec.key), 'README.md'));
    invalidate();
    return r;
  },

  'POST /api/spec/check': (b) => {
    const p = project(b.id);
    const r = W.toggleCheck(p.path, b.rel, Number(b.line), b.text, !!b.done, wset());
    markSeen(W.resolveIn(p.path, b.rel));
    invalidate();
    return r;
  },

  'POST /api/spec/new': (b) => {
    const p = project(b.id);
    const r = W.createSpec(p.path, scanOne(p, false), b.title, wset(), typeDef(b.type), b.slug);
    markSeen(W.resolveIn(p.path, r.rel));
    markSeen(path.join(p.path, path.posix.dirname(r.key), 'README.md'));
    invalidate();
    return r;
  },

  'POST /api/registry': (b) => {
    const p = project(b.id);
    const r = W.regenerateRegistry(p.path, scanOne(p, false), typeDef(b.type), wset());
    invalidate();
    return r;
  },

  'POST /api/install': (b) => {
    const p = project(b.id);
    const scan = scanOne(p, false);
    // «update»: renueva lo que el proyecto ya tiene, conservando el idioma de su kit
    const opts = b.update ? { ...W.kitPlan(scan.compat, 'update'), lang: scan.compat.kitLang || b.lang || uiLang() } : { ...b };
    const done = W.installKit(p.path, scan, { ...opts, featureType: typeDef('feature') }, p, wset());
    invalidate();
    return { done };
  },

  'POST /api/skills/copy': (b) => {
    const p = project(b.id);
    let src;
    if (b.scope === 'builtin') {
      const scan = scanOne(p, false);
      return { done: W.installKit(p.path, scan, { ...W.kitPlan(scan.compat, 'prepare'), lang: scan.compat.kitLang || uiLang() }, p, wset()) };
    } else if (b.scope === 'global') {
      src = path.join(os.homedir(), '.claude', 'skills', path.basename(String(b.dir)));
    } else {
      const from = project(b.fromId);
      const base = b.base === '.skills' ? '.skills' : path.posix.join(b.base || '.claude', 'skills');
      src = W.resolveIn(from.path, path.posix.join(base, b.dir));
    }
    // se copia a la misma carpeta de la que viene (las globales de ~/.claude/skills, a .claude/skills)
    const rel = W.copySkill(src, p.path, path.basename(b.dir), b.scope === 'global' ? '.claude' : (b.base || '.claude'), wset());
    invalidate();
    return { rel };
  },

  'POST /api/decisions/add': (b) => {
    const p = project(b.id);
    const r = W.addDecision(p.path, b.area, b.text, b.ref, wset());
    markSeen(W.resolveIn(p.path, r.rel));
    invalidate();
    return r;
  },

  'POST /api/protect': (b) => {
    const p = project(b.id);
    const scan = scanOne(p, false);
    const done = W.installKit(p.path, scan, { protect: true, lang: scan.compat.kitLang || undefined }, p, wset());
    invalidate();
    return { done };
  },

  'POST /api/skills/new': (b) => {
    const p = project(b.id);
    const rel = W.newSkill(p.path, String(b.name || '').trim() || 'new-skill', b.description, wset(), b.base);
    invalidate();
    return { rel };
  },

  'POST /api/open': (b) => {
    let abs;
    if (b.global) abs = path.join(os.homedir(), '.claude', 'skills', path.basename(String(b.global)), 'SKILL.md');
    else { const p = project(b.id); abs = W.resolveIn(p.path, b.rel || '.'); }
    openPath(abs, b.how);
    return { ok: true };
  },

  'GET /api/global-file': (q) => {
    const abs = path.join(os.homedir(), '.claude', 'skills', path.basename(String(q.dir)), 'SKILL.md');
    return { content: S.readText(abs), mtime: fs.statSync(abs).mtimeMs };
  },

  'POST /api/shortcut': () => {
    if (process.platform !== 'win32') throw W.httpError(400, 'err.windowsOnly');
    const ps = [
      '$d = [Environment]::GetFolderPath("Desktop")',
      '$s = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d "MD SDD Hub.lnk"))',
      `$s.TargetPath = '${path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'wscript.exe')}'`,
      `$s.Arguments = '"${path.join(__dirname, 'lanzar.vbs')}"'`,
      `$s.WorkingDirectory = '${__dirname}'`,
      `$s.IconLocation = '${path.join(__dirname, 'public', 'icon.ico')},0'`,
      `$s.Description = "${t('shortcut.desc')}"`,
      '$s.Save()',
      'Write-Output (Join-Path $d "MD SDD Hub.lnk")',
    ].join('; ');
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' }).trim();
    return { path: out };
  },

  'POST /api/shutdown': () => {
    setTimeout(() => process.exit(0), 300);
    return { ok: true };
  },

  'POST /api/settings': (b) => {
    const allowed = ['staleDays', 'editor', 'appendHistory', 'reviewLog', 'protectWeb', 'author', 'theme', 'lang'];
    for (const k of allowed) if (k in b) config.settings[k] = b[k];
    // estados de un tipo: { statusesType: 'fix', statuses: [...] } · restaurar: { resetStatuses: 'fix' }
    if (b.statusesType && Array.isArray(b.statuses)) {
      typeDef(b.statusesType);
      const list = cleanStatuses(b.statuses);
      if (list.length) config.settings.statusesByType[b.statusesType] = list;
      else delete config.settings.statusesByType[b.statusesType];
    }
    if (b.resetStatuses) delete config.settings.statusesByType[b.resetStatuses];
    if (!LANGS.includes(config.settings.lang)) config.settings.lang = '';
    saveConfig(); invalidate();
    return { settings: config.settings };
  },
};

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  // Protección frente a DNS rebinding: solo hosts locales
  const host = String(req.headers.host || '').toLowerCase();
  reqLang = langFromRequest(req);
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return send(res, 403, { error: t('err.host') });
  const url = new URL(req.url, `http://${host}`);
  if (url.pathname === '/api/raw' && req.method === 'GET') {
    // Imágenes referenciadas desde los .md del proyecto
    try {
      const p = project(url.searchParams.get('id'));
      const abs = W.resolveIn(p.path, url.searchParams.get('rel'));
      const ext = path.extname(abs).toLowerCase();
      const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
      if (!types[ext]) return send(res, 415, { error: t('err.type') });
      res.writeHead(200, { 'Content-Type': types[ext], 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'Cache-Control': 'no-store' });
      return res.end(fs.readFileSync(abs));
    } catch (e) { return send(res, e.status || 404, { error: t(e.message, e.vars) }); }
  }
  if (url.pathname.startsWith('/api/')) {
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) return send(res, 404, { error: t('err.route') });
    // Protección CSRF: las peticiones de escritura deben llevar una cabecera propia
    if (req.method !== 'GET' && req.headers['x-sdd-hub'] !== '1') return send(res, 403, { error: t('err.header') });
    // se juntan los trozos como bytes y se decodifica al final (un carácter UTF-8 puede quedar partido entre trozos)
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { chunks.push(c); size += c.length; if (size > 10 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const body = raw ? JSON.parse(raw) : {};
        const q = Object.fromEntries(url.searchParams);
        const out = handler(req.method === 'GET' ? q : body);
        send(res, 200, out);
      } catch (e) {
        if (!e.status) console.error(e);
        send(res, e.status || 500, { error: t(e.message || 'Error', e.vars) });
      }
    });
    return;
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const abs = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!abs.startsWith(PUBLIC_DIR) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return send(res, 404, 'No encontrado', 'text/plain');
  send(res, 200, fs.readFileSync(abs), MIME[path.extname(abs)] || 'application/octet-stream');
});

function openBrowser(url) {
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`\n  ${t('console.inUse', { port: PORT })}\n`);
    if (process.argv.includes('--open')) openBrowser(`http://localhost:${PORT}`);
    setTimeout(() => process.exit(0), 500);
    return;
  }
  throw e;
});

server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  ${t('console.running', { url, n: config.projects.length, cfg: CONFIG_FILE })}\n`);
  if (process.argv.includes('--open')) openBrowser(url);
});
