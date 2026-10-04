'use strict';
// Detección de secretos (claves, contraseñas, tokens) en Markdown. Los .md de los proyectos se suben a git y los leen
// las IAs: nunca deben contener credenciales. La app se niega a guardar textos con secretos y avisa de los que ya existen.
// Los patrones buscan valores reales, no menciones: «la contraseña va en DB_PASSWORD» o `password=<tu-clave>` no saltan.

// Valores que son ejemplos o referencias, no secretos
const PLACEHOLDER = /^(<[^>]*>|\$\{?[\w.]*\}?|%[\w]+%|\*{3,}|x{3,}|\.{3}|…|\[[^\]]*\]|\{\{[^}]*\}\}|(your|tu|my|mi)[-_][\w-]*|example\w*|ejemplo\w*|placeholder|redacted|changeme|secret|password|contrase(ñ|n)a|clave|token|null|none|ninguna?|true|false|process\.env\..*|getenv\(.*|env\(.*)$/i;
const ENV_NAME = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/; // nombre de variable de entorno, p. ej. STRIPE_SECRET_KEY

const isPlaceholder = (v) => {
  const val = String(v).trim().replace(/^["'`]|["'`,;)]+$/g, '');
  return !val || PLACEHOLDER.test(val) || ENV_NAME.test(val) || /^[-_.*x•]+$/i.test(val);
};

// [tipo, expresión, índice del grupo con el valor (0 = toda la coincidencia, sin comprobar si es un ejemplo)]
const RULES = [
  ['private-key', /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/, 0],
  ['aws-key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, 0],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/, 0],
  ['gitlab-token', /\bglpat-[A-Za-z0-9_-]{20,}\b/, 0],
  ['slack-token', /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/, 0],
  ['stripe-key', /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/, 0],
  ['google-key', /\bAIza[0-9A-Za-z_-]{35}\b/, 0],
  ['ai-key', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}\b/, 0],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, 0],
  // usuario:contraseña dentro de una URL (mysql://root:clave@host)
  ['url-credentials', /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@'"`]+:([^\s/@'"`]+)@/i, 1],
  // define('DB_PASSWORD', 'valor') y similares (WordPress, PHP)
  ['php-define', /define\(\s*['"][A-Z0-9_]*(?:PASSWORD|PASS|SECRET|KEY|TOKEN|SALT)['"]\s*,\s*['"]([^'"]{6,})['"]/i, 1],
  // clave = valor / clave: valor
  ['assignment', /(?:^|[\s"'`|{(,])(?:[\w.-]*[_-])?(?:password|passwd|pwd|pass|contrase(?:ñ|n)a|clave|secret|api[_-]?key|apikey|access[_-]?key|auth[_-]?token|access[_-]?token|token|client[_-]?secret|private[_-]?key)["'`]?\s*[:=]\s*["'`]?([^\s"'`|,;)]{8,})/i, 1],
];

// Devuelve [{ line, kind }] (líneas desde 1); nunca devuelve el valor encontrado
function findSecrets(text) {
  const hits = [];
  const lines = String(text || '').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.length > 5000) return;
    for (const [kind, re, group] of RULES) {
      const m = line.match(re);
      if (!m) continue;
      if (group && isPlaceholder(m[group])) continue;
      hits.push({ line: i + 1, kind });
      break;
    }
  });
  return hits;
}

// Líneas con secretos que el texto nuevo añade respecto al anterior (las que ya estaban se ignoran si no se piden)
function newSecrets(after, before) {
  const old = new Set(String(before || '').split(/\r?\n/));
  const lines = String(after || '').split(/\r?\n/);
  return findSecrets(after).filter((h) => !old.has(lines[h.line - 1]));
}

module.exports = { findSecrets, newSecrets };
