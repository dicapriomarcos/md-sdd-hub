// Comprueba que todos los textos marcados con t()/tn() en public/app.js tienen traducción
// en public/i18n.js. Uso: node tools/i18n-check.js  (con --list imprime todas las claves)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const keys = new Set();
const STR = "'((?:[^'\\\\]|\\\\.)*)'";
const patterns = [
  new RegExp(`\\bt\\(\\s*${STR}`, 'g'),
  new RegExp(`\\btn\\([^,]+,\\s*${STR},\\s*${STR}`, 'g'),
  new RegExp(`\\bt\\([^'()]*\\?\\s*${STR}\\s*:\\s*${STR}`, 'g'),
];
for (const re of patterns) {
  let m;
  while ((m = re.exec(src))) for (const g of m.slice(1)) if (g != null) keys.add(g.replace(/\\'/g, "'").replace(/\\n/g, '\n'));
}

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'i18n.js'), 'utf8'), ctx);
const en = (ctx.window.I18N && ctx.window.I18N.en) || {};

if (process.argv.includes('--list')) { for (const k of keys) console.log(JSON.stringify(k)); process.exit(0); }
const missing = [...keys].filter((k) => !(k in en));
const unused = Object.keys(en).filter((k) => !keys.has(k));
console.log(`${keys.size} textos · ${missing.length} sin traducir · ${unused.length} sin usar`);
missing.forEach((k) => console.log('  falta:', JSON.stringify(k)));
unused.forEach((k) => console.log('  sobra:', JSON.stringify(k)));
process.exit(missing.length ? 1 : 0);
