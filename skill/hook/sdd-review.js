#!/usr/bin/env node
// SDD Hub · hook de Claude Code (UserPromptSubmit / SessionStart).
// Si la persona ha editado .md desde SDD Hub y la IA aún no los ha revisado,
// imprime un recordatorio que Claude Code añade al contexto. Sin avisos, no imprime nada.
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const dir = path.join(root, '.sdd', 'review');

let files = [];
try {
  files = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => e.name);
} catch {
  process.exit(0);
}
if (!files.length) process.exit(0);

const lines = files.slice(0, 15).map((name) => {
  let target = '';
  try {
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    const m = text.match(/^- Archivo: `([^`]+)`/m);
    const changes = (text.match(/^## Cambio · /gm) || []).length;
    target = m ? ` → ${m[1]} (${changes} cambio${changes === 1 ? '' : 's'})` : '';
  } catch {}
  return `- .sdd/review/${name}${target}`;
});
if (files.length > 15) lines.push(`- … y ${files.length - 15} más`);

process.stdout.write(
  `[SDD Hub] La persona ha modificado documentos desde SDD Hub y hay ${files.length} aviso(s) pendiente(s) de revisión:\n` +
  lines.join('\n') +
  `\nAntes de seguir con trabajo relacionado, revísalos siguiendo la sección 7 de la skill sdd-spec ` +
  `(lee el diff y el archivo actual, ajusta spec/tareas, escribe «## Resultado de la revisión» y mueve el aviso a .sdd/review/hecho/). ` +
  `Si la persona te pide otra cosa urgente, menciónale que hay revisiones pendientes.\n`
);
