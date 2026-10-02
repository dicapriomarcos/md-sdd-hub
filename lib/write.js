'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./md-parse');
const S = require('./scan');
const { unified } = require('./diff');
const { tr } = require('./i18n');

const APP_DIR = path.join(__dirname, '..');
const SKILL_SRC = path.join(APP_DIR, 'skill');

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
const md = (key, vars) => tr('es', key, vars);

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

// ---------- nueva spec ----------
function fillTemplate(tpl, id, title, author) {
  const d = today();
  let out = tpl.replace(/SPEC-NNN|SPEC-XXX|\{\{ID\}\}/g, id).replace(/AAAA-MM-DD|YYYY-MM-DD|\{\{FECHA\}\}|\{\{DATE\}\}/g, d);
  out = out.replace(/^#\s+.*$/m, `# ${id} · ${title}`);
  out = out.replace(/^(\|\s*(?:Estado|Status)\s*\|\s*).*?(\s*\|\s*)$/m, '$1`draft`$2');
  if (author) out = out.replace(/^(\|\s*(?:Autor|Author)\s*\|\s*)(?:Nombre|Name)(\s*\|\s*)$/m, `$1${author}$2`);
  return out;
}

function createSpec(root, projectScan, title, settings) {
  title = String(title || '').trim();
  if (!title) throw httpError(400, 'err.noTitle');
  const manifest = projectScan.compat.manifestData || {};
  const dirRel = projectScan.compat.specsDir || manifest.specsDir || 'docs/specs';
  const dirAbs = resolveIn(root, dirRel);
  fs.mkdirSync(dirAbs, { recursive: true });
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  const slug = slugify(title);
  let prefix = manifest.idPrefix || 'SPEC';
  let maxN = 0; let width = 3;
  let folderStyle = null;
  for (const e of entries) {
    const m = e.name.match(/^([A-Za-z][A-Za-z0-9]{1,9})-(\d+)/);
    if (m && (e.isFile() || e.isDirectory())) {
      if (!manifest.idPrefix) prefix = m[1].toUpperCase();
      maxN = Math.max(maxN, Number(m[2])); width = Math.max(width, m[2].length);
      continue;
    }
    const n = e.name.match(/^(\d{2,})-/);
    if (n && e.isDirectory()) { folderStyle = 'numbered'; maxN = Math.max(maxN, Number(n[1])); width = n[1].length; }
  }
  const isKiro = /(^|\/)\.kiro\/specs$/.test(dirRel);
  const num = String(maxN + 1).padStart(width, '0');
  const builtinTpl = path.join(SKILL_SRC, 'template.md');
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
    writeText(path.join(root, rel, 'spec.md'), fillTemplate(S.readText(builtinTpl), num, title));
    created = { rel: `${rel}/spec.md`, key: rel, id: num };
  } else {
    const id = `${prefix}-${num}`;
    const rel = `${dirRel}/${id}-${slug}.md`;
    let tplAbs = projectScan.compat.template ? path.join(root, projectScan.compat.template) : null;
    if (!tplAbs || !fs.existsSync(tplAbs)) tplAbs = builtinTpl;
    writeText(path.join(root, rel), fillTemplate(S.readText(tplAbs), id, title, settings.author || ''));
    created = { rel, key: rel, id };
    appendRegistryRow(root, dirRel, path.posix.basename(rel), id, title);
  }
  if (settings.reviewLog) logReview(root, created.rel, 'create', md('review.newSpec', { title }), null, null);
  return created;
}

function appendRegistryRow(root, dirRel, fileName, id, title) {
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
  const cells = [`[${id}](${fileName})`, title.replace(/\|/g, '\\|'), '`draft`'];
  while (cells.length < cols - 1) cells.push('—');
  if (cells.length < cols) cells.push(today());
  lines.splice(last + 1, 0, `| ${cells.join(' | ')} |`);
  writeText(abs, lines.join(eol));
}

// ---------- registro completo ----------
function regenerateRegistry(root, projectScan, statusLabels) {
  const t = md;
  const dirRel = projectScan.compat.specsDir;
  if (!dirRel) throw httpError(400, 'err.noSpecsDir');
  const abs = path.join(root, dirRel, 'README.md');
  const specs = projectScan.specs.filter((s) => s.key.startsWith(dirRel + '/') && !s.archived)
    .sort((a, b) => (a.id || a.key).localeCompare(b.id || b.key, 'es', { numeric: true }));
  const rows = specs.map((s) => {
    const link = path.posix.relative(dirRel, s.kind === 'folder' ? s.mainFile : s.key);
    const upd = (s.updated && /\d{4}-\d{2}-\d{2}/.test(s.updated) ? s.updated.match(/\d{4}-\d{2}-\d{2}/g).pop() : new Date(s.mtime).toISOString().slice(0, 10));
    return `| [${s.id || path.posix.basename(s.key, '.md')}](${link}) | ${s.title.replace(/\|/g, '\\|')} | ${s.status ? '`' + s.status + '`' : '—'} | ${(s.owner || '—').replace(/\|/g, '\\|')} | ${upd} |`;
  });
  const table = [t('reg.head'), '|---|---|---|---|---|', ...rows];
  if (!fs.existsSync(abs)) {
    const estados = [t('reg.statesHead'), '|---|---|', ...statusLabels.map((s) => `| \`${s.id}\` | ${s.label} |`)];
    writeText(abs, [`# ${t('reg.title')}`, '', t('reg.intro'), '', `## ${t('reg.states')}`, '', ...estados, '', `## ${t('reg.registry')}`, '', ...table, ''].join('\n'));
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

// ---------- kit SDD Hub (skill, manifiesto, plantilla, AGENTS.md, hook) ----------
const AGENTS_BLOCK = `<!-- sdd-hub:start -->
## Especificaciones (SDD)

Este proyecto usa desarrollo dirigido por especificaciones con el formato de SDD Hub.
Antes de crear, modificar o implementar una funcionalidad, lee y sigue **todas** las reglas de
[\`.claude/skills/sdd-spec/SKILL.md\`](.claude/skills/sdd-spec/SKILL.md) (ubicación y nombre de las specs, metadatos, casillas \`AC-NN\` / \`T-NN\`,
ciclo de vida, registro e historial).

Al empezar a trabajar, revisa si hay avisos en \`.sdd/review/\`: son cambios que la persona ha hecho en los
documentos desde SDD Hub y debes revisarlos (sección 7 de esa skill).
<!-- sdd-hub:end -->`;

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name); const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

function installKit(root, projectScan, opts, project) {
  const done = [];
  const compat = projectScan.compat;
  const specsDir = compat.specsDir || 'docs/specs';
  const src = SKILL_SRC;
  if (opts.skill) {
    const dst = path.join(root, '.claude', 'skills', 'sdd-spec');
    fs.mkdirSync(dst, { recursive: true });
    fs.copyFileSync(path.join(src, 'SKILL.md'), path.join(dst, 'SKILL.md'));
    fs.copyFileSync(path.join(src, 'template.md'), path.join(dst, 'template.md'));
    done.push('.claude/skills/sdd-spec/');
  }
  if (opts.manifest && !compat.manifest) {
    const m = { format: 'sdd-hub/1', name: project.name, specsDir, idPrefix: 'SPEC' };
    if (compat.sddDoc) m.sddDoc = compat.sddDoc;
    writeText(path.join(root, '.sdd.json'), JSON.stringify(m, null, 2) + '\n');
    done.push('.sdd.json');
  }
  if (opts.template && !compat.template) {
    writeText(resolveIn(root, `${specsDir}/000-TEMPLATE.md`), S.readText(path.join(src, 'template.md')));
    done.push(`${specsDir}/000-TEMPLATE.md`);
  }
  if (opts.agents) {
    const abs = path.join(root, 'AGENTS.md');
    let text = fs.existsSync(abs) ? S.readText(abs) : '';
    const eol = text ? eolOf(text) : '\n';
    const block = AGENTS_BLOCK.replace(/\n/g, eol);
    if (/<!-- sdd-hub:start -->[\s\S]*?<!-- sdd-hub:end -->/.test(text)) text = text.replace(/<!-- sdd-hub:start -->[\s\S]*?<!-- sdd-hub:end -->/, block);
    else text = (text ? text.replace(/\s*$/, '') + eol + eol : '# AGENTS.md' + eol + eol) + block + eol;
    writeText(abs, text);
    done.push(md('kit.agentsDone'));
  }
  if (opts.hook) {
    const hookDst = path.join(root, '.claude', 'hooks', 'sdd-review.js');
    fs.mkdirSync(path.dirname(hookDst), { recursive: true });
    fs.copyFileSync(path.join(SKILL_SRC, 'hook', 'sdd-review.js'), hookDst);
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
    done.push(regenerateRegistry(root, projectScan, opts.statuses).rel);
  }
  return done;
}

function copySkill(srcDirAbs, root, dirName) {
  if (!fs.existsSync(path.join(srcDirAbs, 'SKILL.md'))) throw httpError(404, 'err.noSkillMd');
  const dst = path.join(root, '.claude', 'skills', dirName);
  if (fs.existsSync(dst)) throw httpError(409, 'err.skillExistsDir', { dir: dirName });
  copyDir(srcDirAbs, dst);
  return `.claude/skills/${dirName}/SKILL.md`;
}

function newSkill(root, name, description) {
  const dir = slugify(name);
  const dst = path.join(root, '.claude', 'skills', dir, 'SKILL.md');
  if (fs.existsSync(dst)) throw httpError(409, 'err.skillExists');
  const desc = String(description || md('skill.defaultDesc')).replace(/\r?\n/g, ' ');
  writeText(dst, `---\nname: ${dir}\ndescription: ${desc}\n---\n\n# ${name}\n\n${md('skill.newBody')}`);
  return `.claude/skills/${dir}/SKILL.md`;
}

module.exports = {
  resolveIn, httpError, saveFile, setStatus, toggleCheck, createSpec, regenerateRegistry, installKit, copySkill, newSkill,
  applyStatus, today,
};
