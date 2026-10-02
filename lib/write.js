'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./md-parse');
const S = require('./scan');
const { unified } = require('./diff');
const { tr } = require('./i18n');

const APP_DIR = path.join(__dirname, '..');
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

// Lo que se escribe en los .md de los proyectos va siempre en español (solo la interfaz se traduce)
// Estructura del kit por idioma: el idioma decide el contenido y también los nombres de los archivos
const LAYOUT = {
  es: { instructions: 'instrucciones.md', templatesDir: 'plantillas', doneDir: 'hecho', templates: { feature: 'feature.md', design: 'diseno.md', architecture: 'arquitectura.md', fix: 'fix.md' } },
  en: { instructions: 'instructions.md', templatesDir: 'templates', doneDir: 'done', templates: { feature: 'feature.md', design: 'design.md', architecture: 'adr.md', fix: 'fix.md' } },
};
// Idioma de un proyecto: el de .sdd.json, el del kit instalado o, si no hay kit, el de la interfaz
function projectLang(root, settings) {
  const m = S.readJSON(path.join(root, '.sdd.json'));
  if (m && LAYOUT[m.lang]) return m.lang;
  if (fs.existsSync(path.join(root, '.sdd', LAYOUT.en.instructions))) return 'en';
  if (fs.existsSync(path.join(root, '.sdd', LAYOUT.es.instructions))) return 'es';
  if (fs.existsSync(path.join(root, '.claude', 'skills', 'sdd-spec', 'SKILL.md'))) return 'es'; // kits antiguos (v1-v3), en español
  return settings && LAYOUT[settings.lang] ? settings.lang : 'es';
}
// Las operaciones son síncronas: se fija el idioma del proyecto al empezar cada una
let CUR_LANG = 'es';
const useProject = (root, settings, forced) => { CUR_LANG = LAYOUT[forced] ? forced : projectLang(root, settings); return CUR_LANG; };
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
  if (rel.toLowerCase().startsWith('.sdd/')) return;
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
  const type = typeDef.id;
  const isFeature = type === 'feature';
  const initialStatus = typeDef.statuses[0] ? typeDef.statuses[0].id : 'draft';
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
  const builtinTpl = path.join(KIT_DIR, CUR_LANG, L.templatesDir, tplName);
  // plantilla: la de la carpeta (000-TEMPLATE.md), la del proyecto (.sdd/plantillas o .sdd/templates) o la del kit
  const tplFor = () => {
    const own = projectScan.compat.templates && projectScan.compat.templates[type];
    const candidates = [own ? path.join(root, own) : null, path.join(root, '.sdd', L.templatesDir, tplName), builtinTpl];
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
  const cells = [`[${id}](${fileName})`, title.replace(/\|/g, '\\|'), '`' + (initialStatus || 'draft') + '`'];
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
// Las reglas viven en .sdd/instrucciones.md (es) o .sdd/instructions.md (en), válidas para cualquier agente
// (Codex, Claude Code, Gemini, Cursor…). AGENTS.md (y CLAUDE.md / GEMINI.md si existen) las enlazan; en Claude Code,
// además, una skill corta remite a ellas. El idioma del kit decide el contenido, los nombres de archivo y el idioma de la IA.
const KIT_VERSION = S.KIT_VERSION; // definida en lib/scan.js
function agentsBlock(lang) {
  const L = LAYOUT[lang];
  const f = '.sdd/' + L.instructions;
  const tpl = '.sdd/' + L.templatesDir + '/';
  if (lang === 'en') {
    return `<!-- sdd-hub:start · v${KIT_VERSION} · en -->
## Specifications and decisions (SDD)

This project uses spec-driven development in the MD SDD Hub format.
**Always answer, write and speak in English** (chat, documents, code comments and commits).

Before creating, changing or implementing a feature, making a design (UX/UI) or architecture decision,
or fixing an important bug, read and follow **all** the rules in [\`${f}\`](${f}): document types
(features \`SPEC\`, design \`DES\`, architecture \`ADR\`, fixes \`FIX\`), location and naming, metadata,
\`AC-NN\` / \`T-NN\` checkboxes, lifecycles, registry and history. Templates are in \`${tpl}\`. When coding,
respect the ADRs and design decisions with status \`accepted\`.

When you start working, check for notices in \`.sdd/review/\`: they are changes the user made to the documents
from MD SDD Hub and you must review them (section 8 of the instructions).

<!-- sdd-hub:end -->`;
  }
  return `<!-- sdd-hub:start · v${KIT_VERSION} · es -->
## Especificaciones y decisiones (SDD)

Este proyecto usa desarrollo dirigido por especificaciones con el formato de MD SDD Hub.
**Responde, escribe y habla siempre en español** (chat, documentos, comentarios de código y commits).

Antes de crear, modificar o implementar una funcionalidad, tomar una decisión de diseño (UX/UI) o de
arquitectura, o corregir un error importante, lee y sigue **todas** las reglas de [\`${f}\`](${f}):
tipos de documento (features \`SPEC\`, diseño \`DES\`, arquitectura \`ADR\`, fixes \`FIX\`), ubicación y nombre,
metadatos, casillas \`AC-NN\` / \`T-NN\`, ciclos de estados, registro e historial. Las plantillas están en
\`${tpl}\`. Al programar, respeta los ADR y las decisiones de diseño en estado \`accepted\`.

Al empezar a trabajar, revisa si hay avisos en \`.sdd/review/\`: son cambios que la persona ha hecho en los
documentos desde MD SDD Hub y debes revisarlos (sección 8 de las instrucciones).

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

// opts: lang, instructions, agents, claude, hook, manifest, template, registry
function installKit(root, projectScan, opts, project, settings) {
  const lang = useProject(root, settings, opts.lang);
  const L = LAYOUT[lang];
  const other = LAYOUT[lang === 'es' ? 'en' : 'es'];
  const src = path.join(KIT_DIR, lang);
  const done = [];
  const compat = projectScan.compat;
  const specsDir = compat.specsDir || 'docs/specs';
  if (opts.instructions) {
    writeText(path.join(root, '.sdd', L.instructions), S.readText(path.join(src, L.instructions)));
    copyDir(path.join(src, L.templatesDir), path.join(root, '.sdd', L.templatesDir));
    // si se cambia de idioma, se retiran las instrucciones y plantillas del otro idioma (son archivos del kit)
    try { fs.unlinkSync(path.join(root, '.sdd', other.instructions)); } catch {}
    try { fs.rmSync(path.join(root, '.sdd', other.templatesDir), { recursive: true, force: true }); } catch {}
    done.push('.sdd/' + L.instructions, '.sdd/' + L.templatesDir + '/');
  }
  if (opts.agents) {
    // AGENTS.md siempre (se crea si no existe); CLAUDE.md y GEMINI.md solo si el proyecto ya los tiene
    for (const f of AGENT_FILES) if (upsertBlock(path.join(root, f), f === 'AGENTS.md', lang)) done.push(md('kit.blockDone', { file: f }));
  }
  if (opts.claude) {
    const dst = path.join(root, '.claude', 'skills', 'sdd-spec');
    fs.mkdirSync(dst, { recursive: true });
    fs.copyFileSync(path.join(src, 'claude-skill.md'), path.join(dst, 'SKILL.md'));
    // las plantillas de versiones anteriores vivían aquí; ahora están en .sdd/
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
    writeText(resolveIn(root, `${specsDir}/000-TEMPLATE.md`), S.readText(path.join(src, L.templatesDir, L.templates.feature)));
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
  return done;
}

// Qué instalar al agregar una carpeta («preparar») o al actualizar un kit antiguo
function kitPlan(compat, mode) {
  if (mode === 'prepare') return { instructions: true, agents: true, claude: compat.usesClaude };
  // actualizar conserva el idioma del kit instalado
  // actualizar: se renueva lo que el proyecto ya tiene, con el formato actual
  return {
    instructions: true,
    agents: true,
    claude: !!compat.claudeSkill || compat.usesClaude,
    hook: !!compat.hook,
  };
}

function copySkill(srcDirAbs, root, dirName) {
  if (!fs.existsSync(path.join(srcDirAbs, 'SKILL.md'))) throw httpError(404, 'err.noSkillMd');
  const dst = path.join(root, '.claude', 'skills', dirName);
  if (fs.existsSync(dst)) throw httpError(409, 'err.skillExistsDir', { dir: dirName });
  copyDir(srcDirAbs, dst);
  return `.claude/skills/${dirName}/SKILL.md`;
}

function newSkill(root, name, description, settings) {
  useProject(root, settings);
  const dir = slugify(name);
  const dst = path.join(root, '.claude', 'skills', dir, 'SKILL.md');
  if (fs.existsSync(dst)) throw httpError(409, 'err.skillExists');
  const desc = String(description || md('skill.defaultDesc')).replace(/\r?\n/g, ' ');
  writeText(dst, `---\nname: ${dir}\ndescription: ${desc}\n---\n\n# ${name}\n\n${md('skill.newBody')}`);
  return `.claude/skills/${dir}/SKILL.md`;
}

module.exports = {
  KIT_VERSION, LAYOUT, projectLang, kitPlan, resolveIn, httpError, saveFile, setStatus, toggleCheck, createSpec, regenerateRegistry, installKit, copySkill, newSkill,
  applyStatus, today,
};
