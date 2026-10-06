'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./md-parse');
const S = require('./scan');
const { unified } = require('./diff');
const { tr } = require('./i18n');
const { findSecrets } = require('./secrets');

const APP_DIR = path.join(__dirname, '..');
// Estados que el proyecto no usa: se anotan en .sdd.json (si existe) para que la IA los salte
function saveSkipStatuses(root, hidden) {
  const abs = path.join(root, '.sdd.json');
  const m = S.readJSON(abs);
  if (!m) return;
  const list = [].concat(...Object.values(hidden || {}));
  if (list.length) m.skipStatuses = list; else delete m.skipStatuses;
  writeText(abs, JSON.stringify(m, null, 2) + '\n');
}

// Kit que se instala en los proyectos: instrucciones comunes, plantillas, acceso para Claude Code y hook
const KIT_DIR = path.join(APP_DIR, 'kit');

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function nowStamp() {
  const d = new Date();
  return `${today()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function eolOf(text) { return text.includes('\r\n') ? '\r\n' : '\n'; }
function writeText(abs, text) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');
}
function slugify(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 7).join('-') || 'spec';
}
function httpError(status, key, vars) { const e = new Error(key); e.status = status; e.vars = vars; return e; }
// Nunca se escriben secretos (claves, contraseñas, tokens) en los .md: se rechaza el cambio indicando las líneas
function assertNoSecrets(text) {
  const hits = findSecrets(text);
  if (hits.length) throw httpError(422, 'err.secret', { lines: hits.map((h) => h.line).join(', ') });
}

// Lo que se escribe en los .md de los proyectos va siempre en español (solo la interfaz se traduce)
// Estructura del kit por idioma: el idioma decide el contenido y también los nombres de los archivos
// Desde el kit v5 las instrucciones son una skill por carpetas (.skills/sdd/): SKILL.md hace de índice y cada
// tema va en un archivo corto. Los archivos del proyecto (ficha, estado, decisiones) viven en .sdd/.
const LAYOUT = S.LAYOUT; // definido en lib/scan.js
const SKILL_DIR = S.SKILL_DIR;
// Idioma de un proyecto: el de .sdd.json, el del kit instalado o, si no hay kit, el de la interfaz
function projectLang(root, settings) {
  const m = S.readJSON(path.join(root, '.sdd.json'));
  if (m && LAYOUT[m.lang]) return m.lang;
  const skillLang = S.kitSkillLang(root);
  if (skillLang) return skillLang;
  if (fs.existsSync(path.join(root, '.sdd', LAYOUT.en.instructions))) return 'en';
  if (fs.existsSync(path.join(root, '.sdd', LAYOUT.es.instructions))) return 'es';
  if (fs.existsSync(path.join(root, '.claude', 'skills', 'sdd-spec', 'SKILL.md'))) return 'es'; // kits antiguos (v1-v3), en español
  return settings && LAYOUT[settings.lang] ? settings.lang : 'es';
}
// Las operaciones son síncronas: se fija el idioma del proyecto al empezar cada una
let CUR_LANG = 'es';
let CUR_SETTINGS = null;
const useProject = (root, settings, forced) => { CUR_SETTINGS = settings; CUR_LANG = LAYOUT[forced] ? forced : projectLang(root, settings); return CUR_LANG; };
const md = (key, vars) => tr(CUR_LANG, key, vars);

// Ruta segura dentro del proyecto
function resolveIn(root, rel) {
  const abs = path.resolve(root, rel || '.');
  const r = S.sameKey(path.resolve(root));
  const a = S.sameKey(abs);
  if (a !== r && !a.startsWith(r + path.sep)) throw httpError(400, 'err.outside');
  return abs;
}

// ---------- avisos para que la IA revise los cambios de la persona ----------
function logReview(root, rel, kind, summary, before, after) {
  if (rel.toLowerCase().startsWith('.sdd/review/')) return;
  const t = md;
  const dir = path.join(root, '.sdd', 'review');
  const name = rel.replace(/[\\/]+/g, '__').replace(/\.(md|markdown|mdx)$/i, '') + '.md';
  const file = path.join(dir, name);
  let out = '';
  if (!fs.existsSync(file)) {
    out += `# ${t('review.title')} · ${rel}\n\n> ${t('review.intro')}\n\n- ${t('review.file')}: \`${rel}\`\n`;
  }
  let block = `\n## ${t('review.change')} · ${nowStamp()} · ${t('review.kind.' + kind)}\n\n${summary}\n`;
  if (before != null && after != null) {
    const d = unified(before, after);
    if (d.text) {
      const body = d.text.length > 20000 ? d.text.slice(0, 20000) + '\n' + t('review.trimmed') : d.text;
      block += `\n${t('review.lines', { a: d.added, r: d.removed })}\n\n\`\`\`diff\n${body}\n\`\`\`\n`;
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(file, out + block, 'utf8');
  protectProject(root, CUR_SETTINGS);
}

// ---------- edición directa ----------
function saveFile(root, rel, content, baseMtime, force, settings) {
  useProject(root, settings);
  if (!/\.(md|markdown|mdx)$/i.test(rel)) throw httpError(400, 'err.onlyMd');
  const abs = resolveIn(root, rel);
  const exists = fs.existsSync(abs);
  const before = exists ? S.readText(abs) : '';
  if (exists && baseMtime && !force) {
    const m = fs.statSync(abs).mtimeMs;
    if (Math.abs(m - baseMtime) > 1) throw httpError(409, 'err.changedOnDisk');
  }
  const eol = exists ? eolOf(before) : '\n';
  const normalized = content.replace(/\r?\n/g, eol);
  assertNoSecrets(normalized);
  if (normalized === before) return { changed: false, mtime: exists ? fs.statSync(abs).mtimeMs : 0 };
  writeText(abs, normalized);
  if (settings.reviewLog) {
    logReview(root, rel, exists ? 'edit' : 'create', md(exists ? 'review.edited' : 'review.created'), before, normalized);
  }
  return { changed: true, mtime: fs.statSync(abs).mtimeMs };
}

// ---------- estado ----------
function replaceFieldValue(line, loc, key, value, plainValue) {
  if (loc.kind === 'fm') return line.replace(/^(\s*[\w .-]+:\s*).*$/, `$1${plainValue}`);
  if (loc.kind === 'section') return plainValue;
  if (loc.kind === 'table') {
    const parts = line.split(/(?<!\\)\|/);
    for (let k = 1; k < parts.length - 1; k++) {
      if (P.canonicalKey(parts[k]) === key) { parts[k + 1] = ` ${value} `; return parts.join('|'); }
    }
    return line;
  }
  const m = line.match(/^(\s*(?:[-*+>]\s+)?\*\*[^*]+?\*\*\s*:?\s*)(.*)$/) || line.match(/^(\s*(?:[-*+>]\s+)?[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ /]{1,30}?\s*:\s+)(.*)$/);
  return m ? m[1] + value : line;
}

function applyStatus(text, newStatus, oldStatus, note, appendHistory) {
  const t = md;
  const eol = eolOf(text);
  const lines = text.split(/\r?\n/);
  let p = P.parseMarkdown(text);
  const val = '`' + newStatus + '`';
  if (p.loc.status) {
    lines[p.loc.status.line] = replaceFieldValue(lines[p.loc.status.line], p.loc.status, 'status', val, newStatus);
  } else if (p.fm) {
    lines.splice(p.fm.end, 0, `status: ${newStatus}`);
  } else {
    const at = p.h1Line >= 0 ? p.h1Line + 1 : 0;
    lines.splice(at, 0, '', `**${t('md.statusKey')}:** ${val}`);
  }
  p = P.parseMarkdown(lines.join('\n'));
  if (p.loc.updated) {
    lines[p.loc.updated.line] = replaceFieldValue(lines[p.loc.updated.line], p.loc.updated, 'updated', today(), today());
  }
  if (appendHistory) {
    p = P.parseMarkdown(lines.join('\n'));
    const noteText = (note || `${t('md.historyNote')}${oldStatus ? ` (${oldStatus} → ${newStatus})` : ''}`).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    const row = `| ${today()} | ${val} | ${noteText} |`;
    if (p.history && p.history.lastRowLine >= 0) {
      lines.splice(p.history.lastRowLine + 1, 0, row);
    } else if (p.history) {
      lines.splice(p.history.line + 1, 0, '', t('md.historyHead'), '|---|---|---|', row);
    } else {
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      lines.push('', `## ${t('md.history')}`, '', t('md.historyHead'), '|---|---|---|', row, '');
    }
  }
  return lines.join(eol);
}

function updateRegistryRow(root, specRel, specKey, newStatus) {
  const dirs = new Set([path.posix.dirname(specKey), path.posix.dirname(specRel)]);
  for (const d of dirs) {
    const abs = path.join(root, d, 'README.md');
    if (!fs.existsSync(abs)) continue;
    const text = S.readText(abs);
    const eol = eolOf(text);
    const lines = text.split(/\r?\n/);
    const targets = [specKey, specRel].map((x) => S.sameKey(path.posix.relative(d, x)));
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!/^\s*\|/.test(l)) continue;
      const link = l.match(/\]\(([^)#\s]+)/);
      if (!link) continue;
      const tgt = S.sameKey(decodeURIComponent(link[1]).replace(/^\.\//, '').replace(/\/$/, ''));
      if (!targets.includes(tgt)) continue;
      const parts = l.split(/(?<!\\)\|/);
      for (let k = 1; k < parts.length - 1; k++) {
        if (/`[^`]+`/.test(parts[k])) { parts[k] = ` \`${newStatus}\` `; break; }
      }
      const lastIdx = parts.length - 2;
      if (lastIdx > 0 && /^\s*\d{4}-\d{2}-\d{2}\s*$/.test(parts[lastIdx])) parts[lastIdx] = ` ${today()} `;
      lines[i] = parts.join('|');
      changed = true;
    }
    if (changed) writeText(abs, lines.join(eol));
  }
}

function setStatus(root, spec, newStatus, note, settings) {
  useProject(root, settings);
  const rel = spec.statusFile || spec.mainFile;
  const abs = resolveIn(root, rel);
  const before = S.readText(abs);
  if (note) assertNoSecrets(note);
  const after = applyStatus(before, newStatus, spec.status, note, settings.appendHistory);
  writeText(abs, after);
  try { updateRegistryRow(root, rel, spec.key, newStatus); } catch {}
  if (settings.reviewLog) {
    let summary = md('review.status', { from: spec.status || md('review.noStatus'), to: newStatus });
    if (note) summary += '\n\n' + md('review.note', { note });
    logReview(root, rel, 'status', summary, before, after);
  }
  return { mtime: fs.statSync(abs).mtimeMs };
}

// ---------- casillas ----------
function toggleCheck(root, rel, line, text, done, settings) {
  useProject(root, settings);
  const abs = resolveIn(root, rel);
  const before = S.readText(abs);
  const eol = eolOf(before);
  const lines = before.split(/\r?\n/);
  const re = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX~-])(\]\s+)(.*)$/;
  const m = lines[line] != null && lines[line].match(re);
  if (!m || m[4].trim() !== String(text).trim()) throw httpError(409, 'err.changedReload');
  lines[line] = m[1] + (done ? 'x' : ' ') + m[3] + m[4];
  writeText(abs, lines.join(eol));
  if (settings.reviewLog) {
    logReview(root, rel, 'check', md(done ? 'review.checked' : 'review.unchecked', { line: line + 1, text: m[4].trim() }), null, null);
  }
  return { mtime: fs.statSync(abs).mtimeMs };
}

// ---------- nuevo documento (feature, diseño, arquitectura o fix) ----------
function fillTemplate(tpl, id, title, author, initialStatus) {
  const d = today();
  let out = tpl.replace(/\b(?:SPEC|DES|ADR|FIX)-(?:NNN|XXX)\b|\{\{ID\}\}/g, id).replace(/AAAA-MM-DD|YYYY-MM-DD|\{\{FECHA\}\}|\{\{DATE\}\}/g, d);
  out = out.replace(/^#\s+.*$/m, `# ${id} · ${title}`);
  out = out.replace(/^(\|\s*(?:Estado|Status)\s*\|\s*).*?(\s*\|\s*)$/m, `$1\`${initialStatus}\`$2`);
  if (author) out = out.replace(/^(\|\s*(?:Autor|Author)\s*\|\s*)(?:Nombre|Name)(\s*\|\s*)$/m, `$1${author}$2`);
  return out;
}

function createSpec(root, projectScan, title, settings, typeDef, slugIn) {
  const L = LAYOUT[useProject(root, settings)];
  title = String(title || '').trim();
  if (!title) throw httpError(400, 'err.noTitle');
  assertNoSecrets(title);
  const type = typeDef.id;
  const isFeature = type === 'feature';
  const initialStatus = typeDef.statuses[0] ? typeDef.statuses[0].id : 'backlog';
  const manifest = projectScan.compat.manifestData || {};
  const mdirs = manifest.dirs || {};
  const dirRel = (projectScan.compat.dirs && projectScan.compat.dirs[type]) || mdirs[type] ||
    (isFeature && manifest.specsDir) || typeDef.dirs[0];
  const dirAbs = resolveIn(root, dirRel);
  fs.mkdirSync(dirAbs, { recursive: true });
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  const slug = slugify(slugIn || title);
  let prefix = isFeature ? (manifest.idPrefix || typeDef.prefix) : typeDef.prefix;
  let maxN = 0; let width = 3;
  let folderStyle = null;
  let plainNumbers = false;
  for (const e of entries) {
    const m = e.name.match(/^([A-Za-z][A-Za-z0-9]{1,9})-(\d+)/);
    if (m && (e.isFile() || e.isDirectory())) {
      if (isFeature && !manifest.idPrefix) prefix = m[1].toUpperCase();
      if (m[1].toUpperCase() === prefix) { maxN = Math.max(maxN, Number(m[2])); width = Math.max(width, m[2].length); }
      continue;
    }
    const n = e.name.match(/^(\d{2,})-/);
    if (n && e.isDirectory() && isFeature) { folderStyle = 'numbered'; maxN = Math.max(maxN, Number(n[1])); width = n[1].length; }
    else if (n && e.isFile() && !isFeature) { plainNumbers = true; maxN = Math.max(maxN, Number(n[1])); width = Math.max(4, n[1].length); }
  }
  const isKiro = isFeature && /(^|\/)\.kiro\/specs$/.test(dirRel);
  const num = String(maxN + 1).padStart(width, '0');
  const tplName = L.templates[type] || L.templates.feature;
  const builtinTpl = path.join(KIT_DIR, CUR_LANG, 'skill', L.templatesDir, tplName);
  // plantilla: la de la carpeta (000-TEMPLATE.md), la de la skill del proyecto (.skills/sdd/plantillas), la de un kit
  // anterior (.sdd/plantillas) o la del kit
  const tplFor = () => {
    const own = projectScan.compat.templates && projectScan.compat.templates[type];
    const candidates = [own ? path.join(root, own) : null, path.join(root, SKILL_DIR, L.templatesDir, tplName), path.join(root, '.sdd', L.templatesDir, tplName), builtinTpl];
    return S.readText(candidates.find((c) => c && fs.existsSync(c)));
  };
  let created;
  if (isKiro) {
    const rel = `${dirRel}/${slug}`;
    if (fs.existsSync(path.join(root, rel))) throw httpError(409, 'err.specExists');
    writeText(path.join(root, rel, 'requirements.md'), `# Requirements Document\n\n## Introduction\n\n${title}\n\n## Requirements\n`);
    writeText(path.join(root, rel, 'design.md'), '# Design Document\n\n## Overview\n');
    writeText(path.join(root, rel, 'tasks.md'), '# Implementation Plan\n\n- [ ] 1. Primera tarea\n');
    created = { rel: `${rel}/requirements.md`, key: rel, id: null };
  } else if (folderStyle === 'numbered') {
    const rel = `${dirRel}/${num}-${slug}`;
    writeText(path.join(root, rel, 'spec.md'), fillTemplate(S.readText(builtinTpl), num, title, settings.author || '', initialStatus));
    created = { rel: `${rel}/spec.md`, key: rel, id: num };
  } else {
    // carpetas tipo adr-tools (0001-titulo.md) mantienen su numeración; si no, PREFIJO-NNN
    const id = plainNumbers && maxN ? num : `${prefix}-${num}`;
    const rel = `${dirRel}/${id}-${slug}.md`;
    if (fs.existsSync(path.join(root, rel))) throw httpError(409, 'err.specExists');
    writeText(path.join(root, rel), fillTemplate(tplFor(), id, title, settings.author || '', initialStatus));
    created = { rel, key: rel, id };
    appendRegistryRow(root, dirRel, path.posix.basename(rel), id, title, initialStatus);
  }
  protectProject(root, settings, [dirRel]);
  if (settings.reviewLog) logReview(root, created.rel, 'create', md('review.newSpec', { title }), null, null);
  return created;
}

function appendRegistryRow(root, dirRel, fileName, id, title, initialStatus) {
  const abs = path.join(root, dirRel, 'README.md');
  if (!fs.existsSync(abs)) return;
  const text = S.readText(abs);
  const eol = eolOf(text);
  const lines = text.split(/\r?\n/);
  let last = -1;
  lines.forEach((l, i) => { if (/^\s*\|.*\]\([^)]*\.md\)/.test(l)) last = i; });
  if (last < 0) return;
  const cols = P.splitRow(lines[last]).length;
  if (cols < 3) return;
  const cells = [`[${id}](${fileName})`, title.replace(/\|/g, '\\|'), '`' + (initialStatus || 'backlog') + '`'];
  while (cells.length < cols - 1) cells.push('—');
  if (cells.length < cols) cells.push(today());
  lines.splice(last + 1, 0, `| ${cells.join(' | ')} |`);
  writeText(abs, lines.join(eol));
}

// ---------- registro completo ----------
function regenerateRegistry(root, projectScan, typeDef, settings) {
  if (settings) useProject(root, settings);
  const t = md;
  const statusLabels = typeDef.statuses;
  const dirRel = projectScan.compat.dirs ? projectScan.compat.dirs[typeDef.id] : projectScan.compat.specsDir;
  if (!dirRel) throw httpError(400, 'err.noSpecsDir');
  const abs = path.join(root, dirRel, 'README.md');
  const specs = projectScan.specs.filter((s) => s.type === typeDef.id && s.key.startsWith(dirRel + '/') && !s.archived)
    .sort((a, b) => (a.id || a.key).localeCompare(b.id || b.key, 'es', { numeric: true }));
  const rows = specs.map((s) => {
    const link = path.posix.relative(dirRel, s.kind === 'folder' ? s.mainFile : s.key);
    const upd = (s.updated && /\d{4}-\d{2}-\d{2}/.test(s.updated) ? s.updated.match(/\d{4}-\d{2}-\d{2}/g).pop() : new Date(s.mtime).toISOString().slice(0, 10));
    return `| [${s.id || path.posix.basename(s.key, '.md')}](${link}) | ${s.title.replace(/\|/g, '\\|')} | ${s.status ? '`' + s.status + '`' : '—'} | ${(s.owner || '—').replace(/\|/g, '\\|')} | ${upd} |`;
  });
  const table = [t('reg.head'), '|---|---|---|---|---|', ...rows];
  if (!fs.existsSync(abs)) {
    const estados = [t('reg.statesHead'), '|---|---|', ...statusLabels.map((s) => `| \`${s.id}\` | ${s.label} |`)];
    writeText(abs, [`# ${t('reg.title.' + typeDef.id)}`, '', t('reg.intro'), '', `## ${t('reg.states')}`, '', ...estados, '', `## ${t('reg.registry')}`, '', ...table, ''].join('\n'));
    return { rel: `${dirRel}/README.md`, rows: rows.length, created: true };
  }
  const text = S.readText(abs);
  const eol = eolOf(text);
  const lines = text.split(/\r?\n/);
  const h = lines.findIndex((l) => /^#{2,3}\s+(\d+[.)]?\s*)?(registro|registry|índice|indice|index|listado|list)\b/i.test(l));
  if (h < 0) {
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    lines.push('', `## ${t('reg.registry')}`, '', ...table, '');
  } else {
    let s = h + 1;
    while (s < lines.length && !/^\s*\|/.test(lines[s]) && !/^#/.test(lines[s])) s++;
    if (s < lines.length && /^\s*\|/.test(lines[s])) {
      let e = s;
      while (e < lines.length && /^\s*\|/.test(lines[e])) e++;
      lines.splice(s, e - s, ...table);
    } else {
      lines.splice(h + 1, 0, '', ...table);
    }
  }
  writeText(abs, lines.join(eol));
  return { rel: `${dirRel}/README.md`, rows: rows.length, created: false };
}

// ---------- kit MD SDD Hub ----------
// Las reglas son una skill por carpetas en .skills/sdd/, válida para cualquier agente (Codex, Claude Code, Gemini,
// Cursor…): SKILL.md es un índice corto y cada tema va en su archivo, para que la IA lea solo lo que necesita.
// AGENTS.md, CLAUDE.md y GEMINI.md la enlazan; en Claude Code, además, una skill corta remite a ella.
// El idioma del kit decide el contenido, los nombres de archivo y el idioma de la IA.
const KIT_VERSION = S.KIT_VERSION; // definida en lib/scan.js
function agentsBlock(lang) {
  const L = LAYOUT[lang];
  const f = SKILL_DIR + '/SKILL.md';
  const p = '.sdd/' + L.project; const st = '.sdd/' + L.status; const dec = '.sdd/' + L.decisions;
  const designIndex = `docs/design/${L.designSystem}/index.md`;
  if (lang === 'en') {
    return `<!-- sdd-hub:start · v${KIT_VERSION} · en -->
## Specifications and decisions (SDD)

This project uses spec-driven development in the MD SDD Hub format.
**Always answer, write and speak in English** (chat, documents, code comments and commits).

The rules live in the [\`${f}\`](${f}) skill. That file is a short index: the rules that always apply and
which file to read for each task (document types, format, statuses, implementation, decisions, review).
**Open only the files the task needs**, not the whole folder.

At the start of every session:

1. If \`${st}\` exists, read it: it says where the work stands.
2. If \`${p}\` does not exist, do the onboarding described in the skill; if it exists, ask only about the onboarding
   steps still \`Pending\` (such as building the design system), once per session: if the user leaves it for later,
   ask again in the next one.
3. Check for notices in \`.sdd/review/\` (changes the user made from MD SDD Hub) and review them.

Before coding or writing interface copy, read \`${dec}\` and respect it, together with the \`accepted\` ADRs and
design decisions; before touching the interface, also the design system index (\`${designIndex}\`) and only the
parts you touch. When the user sets a rule ("always…", "never…", "say X instead of Y"), record it there right away.

**Never write secrets** (passwords, API keys, tokens, \`.env\` values) in any \`.md\`: only the variable name.
Before committing, pushing or deploying, read \`${SKILL_DIR}/git.md\` and \`.sdd/${L.git}\`; **never push to production
(\`pro\`) without the user's explicit authorization** for that push.

The project's other skills, if any, are in \`.skills/<name>/\`: each \`SKILL.md\` is an index whose \`description\`
says when to use it. Open only the files you need.

<!-- sdd-hub:end -->`;
  }
  return `<!-- sdd-hub:start · v${KIT_VERSION} · es -->
## Especificaciones y decisiones (SDD)

Este proyecto usa desarrollo dirigido por especificaciones con el formato de MD SDD Hub.
**Responde, escribe y habla siempre en español** (chat, documentos, comentarios de código y commits).

Las reglas están en la skill [\`${f}\`](${f}). Ese archivo es un índice corto: las reglas que valen siempre
y qué archivo leer para cada tarea (tipos de documento, formato, estados, implementación, decisiones, revisión).
**Abre solo los archivos que necesite la tarea**, no la carpeta entera.

Al empezar cada sesión:

1. Si existe \`${st}\`, léelo: dice dónde quedó el trabajo.
2. Si no existe \`${p}\`, haz el onboarding que describe la skill; si existe, pregunta solo por los pasos de su
   onboarding que sigan \`Pendiente\` (como armar el sistema de diseño), una vez por sesión: si la persona lo deja
   para más tarde, vuelve a preguntar en la siguiente.
3. Revisa si hay avisos en \`.sdd/review/\` (cambios que la persona ha hecho desde MD SDD Hub) y revísalos.

Antes de programar o de escribir textos de la interfaz, lee \`${dec}\` y respétalo, junto con los ADR y las
decisiones de diseño en \`accepted\`; antes de tocar la interfaz, también el índice del sistema de diseño
(\`${designIndex}\`) y solo las partes que toques. Cuando la persona fije una norma («siempre…», «nunca…», «di X en vez de Y»),
apúntala ahí en el momento.

**Nunca escribas secretos** (contraseñas, claves de API, tokens, valores de \`.env\`) en ningún \`.md\`: solo el nombre
de la variable. Antes de hacer commit, push o desplegar, lee \`${SKILL_DIR}/git.md\` y \`.sdd/${L.git}\`; **nunca subas a
producción (\`pro\`) sin autorización expresa** de la persona para ese push.

Las demás skills del proyecto, si las hay, están en \`.skills/<nombre>/\`: cada \`SKILL.md\` es un índice cuya
\`description\` dice cuándo usarla. Abre solo los archivos que necesites.

<!-- sdd-hub:end -->`;
}
const BLOCK_RE = /<!-- sdd-hub:start[^>]*-->[\s\S]*?<!-- sdd-hub:end -->/;
const AGENT_FILES = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'];
const OLD_SKILL_FILES = ['template.md', 'template-design.md', 'template-adr.md', 'template-fix.md'];

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name); const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

// Inserta o sustituye el bloque de MD SDD Hub en un archivo de instrucciones de agente
function upsertBlock(abs, create, lang) {
  const exists = fs.existsSync(abs);
  if (!exists && !create) return false;
  let text = exists ? S.readText(abs) : '';
  const eol = text ? eolOf(text) : '\n';
  const block = agentsBlock(lang).replace(/\n/g, eol);
  if (BLOCK_RE.test(text)) text = text.replace(BLOCK_RE, block);
  else text = (text ? text.replace(/\s*$/, '') + eol + eol : `# ${path.basename(abs)}` + eol + eol) + block + eol;
  writeText(abs, text);
  return true;
}

// ---------- protección web ----------
// Muchos proyectos viven en carpetas servidas por Apache (XAMPP, hosting compartido): sin protección, cualquiera puede
// leer los .md por la web. Cada carpeta con documentos lleva un .htaccess: las ocultas (.sdd, .skills, .claude…) se
// bloquean enteras y las de documentos (docs/…) solo para los Markdown. Nunca se pisa un .htaccess que ya exista.
const DENY = '<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order allow,deny\n    Deny from all\n</IfModule>\n';
function htaccessText(mdOnly) {
  const head = `# MD SDD Hub · ${md(mdOnly ? 'kit.htaccessMd' : 'kit.htaccessDir')}\n# ${md('kit.htaccessHint')}\n`;
  if (!mdOnly) return head + DENY;
  return head + '<FilesMatch "(?i)\\.(md|markdown|mdx)$">\n' + DENY.replace(/^/gm, '    ').replace(/ +$/, '') + '</FilesMatch>\n';
}
// Crea los .htaccess que falten; devuelve las rutas creadas
function protectProject(root, settings, extraDirs) {
  if (settings && settings.protectWeb === false) return [];
  const done = [];
  for (const tgt of S.protectTargets(root, extraDirs)) {
    if (tgt.ok) continue;
    const abs = resolveIn(root, tgt.rel);
    try { fs.writeFileSync(path.join(abs, '.htaccess'), htaccessText(tgt.mdOnly), { encoding: 'utf8', flag: 'wx' }); done.push(`${tgt.rel}/.htaccess`); } catch {}
  }
  return done;
}

// Rutas relativas de todos los archivos de una carpeta del kit
function kitFiles(dirAbs, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...kitFiles(path.join(dirAbs, e.name), rel)); else out.push(rel);
  }
  return out;
}

// opts: lang, instructions, agents, claude, hook, manifest, template, registry, protect
function installKit(root, projectScan, opts, project, settings) {
  const lang = useProject(root, settings, opts.lang);
  const L = LAYOUT[lang];
  const other = lang === 'es' ? 'en' : 'es';
  const src = path.join(KIT_DIR, lang);
  const done = [];
  const compat = projectScan.compat;
  const specsDir = compat.specsDir || 'docs/specs';
  if (opts.instructions) {
    const skillAbs = path.join(root, SKILL_DIR);
    copyDir(path.join(src, 'skill'), skillAbs);
    // si se cambia de idioma, se retiran los archivos del otro idioma (son del kit, no de la persona)
    const mine = new Set(kitFiles(path.join(src, 'skill')));
    for (const rel of kitFiles(path.join(KIT_DIR, other, 'skill'))) {
      if (!mine.has(rel)) { try { fs.unlinkSync(path.join(skillAbs, rel)); } catch {} }
    }
    try { fs.rmdirSync(path.join(skillAbs, LAYOUT[other].templatesDir)); } catch {}
    // hasta el kit v4 las instrucciones vivían en .sdd/ en un solo archivo
    for (const l of Object.values(LAYOUT)) {
      try { fs.unlinkSync(path.join(root, '.sdd', l.instructions)); } catch {}
      try { fs.rmSync(path.join(root, '.sdd', l.templatesDir), { recursive: true, force: true }); } catch {}
    }
    done.push(SKILL_DIR + '/');
  }
  if (opts.agents) {
    // el mismo bloque en AGENTS.md, CLAUDE.md y GEMINI.md (se crean si no existen): cada agente lee el suyo
    for (const f of AGENT_FILES) if (upsertBlock(path.join(root, f), true, lang)) done.push(md('kit.blockDone', { file: f }));
  }
  if (opts.claude) {
    const dst = path.join(root, '.claude', 'skills', 'sdd-spec');
    fs.mkdirSync(dst, { recursive: true });
    fs.copyFileSync(path.join(src, 'claude-skill.md'), path.join(dst, 'SKILL.md'));
    // las plantillas de versiones anteriores vivían aquí; ahora están en la skill
    for (const f of OLD_SKILL_FILES) { try { fs.unlinkSync(path.join(dst, f)); } catch {} }
    done.push('.claude/skills/sdd-spec/SKILL.md');
  }
  if (opts.manifest && !compat.manifest) {
    const dirs = compat.dirs || {};
    const m = {
      format: 'sdd-hub/1', name: project.name, lang, specsDir, idPrefix: 'SPEC',
      dirs: { feature: specsDir, design: dirs.design || 'docs/design', architecture: dirs.architecture || 'docs/architecture', fix: dirs.fix || 'docs/fixes' },
    };
    if (compat.sddDoc) m.sddDoc = compat.sddDoc;
    writeText(path.join(root, '.sdd.json'), JSON.stringify(m, null, 2) + '\n');
    done.push('.sdd.json');
  }
  if (compat.manifest && opts.lang) {
    const m = S.readJSON(path.join(root, '.sdd.json'));
    if (m && m.lang !== lang) { m.lang = lang; writeText(path.join(root, '.sdd.json'), JSON.stringify(m, null, 2) + '\n'); }
  }
  if (opts.template && !compat.template) {
    writeText(resolveIn(root, `${specsDir}/000-TEMPLATE.md`), S.readText(path.join(src, 'skill', L.templatesDir, L.templates.feature)));
    done.push(`${specsDir}/000-TEMPLATE.md`);
  }
  if (opts.hook) {
    const hookDst = path.join(root, '.claude', 'hooks', 'sdd-review.js');
    fs.mkdirSync(path.dirname(hookDst), { recursive: true });
    fs.copyFileSync(path.join(KIT_DIR, 'hook', 'sdd-review.js'), hookDst);
    const setAbs = path.join(root, '.claude', 'settings.local.json');
    let cfg = {};
    if (fs.existsSync(setAbs)) {
      cfg = S.readJSON(setAbs);
      if (!cfg) throw httpError(400, 'err.badSettingsJson');
    }
    cfg.hooks = cfg.hooks || {};
    const cmd = 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/sdd-review.js"';
    for (const ev of ['UserPromptSubmit', 'SessionStart']) {
      cfg.hooks[ev] = cfg.hooks[ev] || [];
      if (!JSON.stringify(cfg.hooks[ev]).includes('sdd-review.js')) cfg.hooks[ev].push({ hooks: [{ type: 'command', command: cmd }] });
    }
    writeText(setAbs, JSON.stringify(cfg, null, 2) + '\n');
    done.push(md('kit.hookDone'));
  }
  if (opts.registry && !compat.registry && compat.specsDir) {
    done.push(regenerateRegistry(root, projectScan, opts.featureType, settings).rel);
  }
  // al final, para cubrir también las carpetas que acaba de crear la instalación
  if (opts.protect) done.push(...protectProject(root, { protectWeb: true }, Object.values(compat.dirs || {})));
  return done;
}

// Qué instalar al agregar una carpeta («preparar») o al actualizar un kit antiguo
function kitPlan(compat, mode) {
  if (mode === 'prepare') return { instructions: true, agents: true, claude: compat.usesClaude, protect: true };
  // actualizar conserva el idioma del kit instalado y renueva lo que el proyecto ya tiene, con el formato actual
  return {
    instructions: true,
    agents: true,
    claude: !!compat.claudeSkill || compat.usesClaude,
    hook: !!compat.hook,
    protect: true,
  };
}

// ---------- decisiones rápidas (.sdd/decisiones.md) ----------
const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
function addDecision(root, area, text, ref, settings) {
  const L = LAYOUT[useProject(root, settings)];
  text = String(text || '').replace(/\s*\r?\n\s*/g, ' ').trim();
  area = String(area || '').replace(/[\r\n#]/g, '').trim() || L.areas[0];
  if (!text) throw httpError(400, 'err.noDecision');
  assertNoSecrets(text);
  const ids = String(ref || '').toUpperCase().match(/\b[A-Z][A-Z0-9]{1,9}-\d{1,5}\b/g);
  const line = `- ${today()} · ${text}${ids ? ' → ' + ids.join(', ') : ''}`;
  const rel = '.sdd/' + L.decisions;
  const abs = resolveIn(root, rel);
  const exists = fs.existsSync(abs);
  const before = exists ? S.readText(abs) : S.readText(path.join(KIT_DIR, CUR_LANG, 'skill', L.templatesDir, L.decisions));
  const eol = eolOf(before);
  const lines = before.split(/\r?\n/);
  const h = lines.findIndex((l) => { const m = l.match(/^##\s+(.+?)\s*$/); return m && plain(m[1]) === plain(area); });
  if (h < 0) {
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    lines.push('', `## ${area}`, '', line, '');
  } else {
    let e = h + 1;
    while (e < lines.length && !/^#{1,2}\s/.test(lines[e])) e++;
    let last = -1;
    for (let i = h + 1; i < e; i++) if (/^\s*[-*]\s/.test(lines[i])) last = i;
    if (last >= 0) lines.splice(last + 1, 0, line);
    else lines.splice(h + 1, 0, '', line);
  }
  const after = lines.join(eol);
  writeText(abs, after);
  protectProject(root, settings);
  if (settings.reviewLog) logReview(root, rel, exists ? 'edit' : 'create', md('review.decision', { text: line.slice(2) }), exists ? before : '', after);
  return { rel, line };
}

// ---------- skills ----------
// Las skills del proyecto van por defecto en .skills/<nombre>/ (neutral, para cualquier agente); también se admite
// .claude/skills/ (Claude Code las carga solo)
const SKILL_BASES = ['.skills', '.claude', '.agents', '.codex', '.gemini', '.cursor'];
const skillsRoot = (base) => (base === '.skills' ? '.skills' : `${base}/skills`);

function copySkill(srcDirAbs, root, dirName, base, settings) {
  useProject(root, settings);
  if (!fs.existsSync(path.join(srcDirAbs, 'SKILL.md'))) throw httpError(404, 'err.noSkillMd');
  const b = SKILL_BASES.includes(base) ? base : '.claude';
  const rel = `${skillsRoot(b)}/${dirName}`;
  const dst = resolveIn(root, rel);
  if (fs.existsSync(dst)) throw httpError(409, 'err.skillExistsDir', { dir: rel });
  copyDir(srcDirAbs, dst);
  protectProject(root, settings);
  return `${rel}/SKILL.md`;
}

function newSkill(root, name, description, settings, base) {
  useProject(root, settings);
  const dir = slugify(name);
  const b = base === '.claude' ? '.claude' : '.skills';
  const rel = `${skillsRoot(b)}/${dir}/SKILL.md`;
  const dst = resolveIn(root, rel);
  if (fs.existsSync(dst)) throw httpError(409, 'err.skillExists');
  const desc = String(description || md('skill.defaultDesc')).replace(/\r?\n/g, ' ').trim();
  assertNoSecrets(desc);
  // índice: frontmatter (name, version, install, description), reglas que valen siempre y tabla de archivos
  writeText(dst, `---\nname: ${dir}\nversion: 1\ninstall: on-demand\ndescription: >\n  ${desc}\n---\n\n# ${name}\n\n${md('skill.newBody')}`);
  protectProject(root, settings);
  return rel;
}

module.exports = {
  saveSkipStatuses,
  KIT_VERSION, LAYOUT, projectLang, kitPlan, resolveIn, httpError, saveFile, setStatus, toggleCheck, createSpec, regenerateRegistry, installKit, copySkill, newSkill,
  addDecision, protectProject,
  applyStatus, today,
};
