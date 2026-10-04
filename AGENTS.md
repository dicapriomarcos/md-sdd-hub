# AGENTS.md · MD SDD Hub

Instrucciones para agentes de IA (Claude Code, Codex, Gemini…) que trabajen en este repositorio.

## Qué es

MD SDD Hub es un panel local para seguir specs SDD y los `.md` de varios proyectos. Servidor Node.js sin dependencias (`server.js` + `lib/`) e interfaz HTML/CSS/JS sin frameworks (`public/`). La estructura completa está en la sección «Arquitectura» de [`README.es.md`](README.es.md).

## Reglas del código

- **Sin dependencias.** Solo la biblioteca estándar de Node.js (≥ 18) en el servidor y JavaScript del navegador en la interfaz. No añadas `node_modules`, bundlers ni frameworks.
- **Sin base de datos.** La configuración vive en `data/` (ignorada por git); los datos de los proyectos son sus propios `.md`.
- Comentarios del código en español, como el resto del repositorio.
- **Interfaz traducible:** todo texto visible va dentro de `t('Texto en español')` (o `tn(n, 'singular', 'plural')`) en `public/app.js`, con su traducción en `public/i18n.js`. Los mensajes del servidor que llegan a la interfaz van en `lib/i18n.js` (es y en). Ejecuta `node tools/i18n-check.js` antes de terminar: debe decir 0 sin traducir y 0 sin usar.
- **El kit que se instala en los proyectos tiene dos idiomas** (`kit/es/` y `kit/en/`) y deben decir lo mismo. El idioma del kit de cada proyecto decide el contenido y los nombres de archivo (`tipos.md` / `plantillas/` / `estado.md` / `decisiones.md` / `review/hecho/` frente a `types.md` / `templates/` / `status.md` / `decisions.md` / `review/done/`); ver `LAYOUT` en `lib/scan.js`. Los textos que la app escribe en los `.md` (avisos, historial, registros) están en `lib/i18n.js` en los dos idiomas.
- **El kit es una skill por partes y neutral respecto al agente.** Las reglas viven en `.skills/sdd/` del proyecto (`kit/<idioma>/skill/` en este repo): `SKILL.md` es un índice corto (frontmatter `name`, `version`, `install`, `description`, reglas que valen siempre y tabla de archivos) y cada tema va en un archivo corto, para que la IA lea solo lo que necesita. No vuelvas a juntarlo en un archivo largo: si un tema crece, divídelo y actualiza la tabla del índice. Se enlaza desde `AGENTS.md`, `CLAUDE.md` y `GEMINI.md` (se crean los tres). `.sdd/` queda para los archivos del proyecto (avisos de revisión, ficha, estado y decisiones), que la app no sobrescribe. Lo específico de Claude Code (skill corta y hook) es opcional; no añadas reglas que solo funcionen con un agente.
- No cambies los identificadores técnicos sin una migración: carpeta `.sdd/`, marcas `<!-- sdd-hub:start · v5 · es -->
## Especificaciones y decisiones (SDD)

Este proyecto usa desarrollo dirigido por especificaciones con el formato de MD SDD Hub.
**Responde, escribe y habla siempre en español** (chat, documentos, comentarios de código y commits).

Las reglas están en la skill [`.skills/sdd/SKILL.md`](.skills/sdd/SKILL.md). Ese archivo es un índice corto: las reglas que valen siempre
y qué archivo leer para cada tarea (tipos de documento, formato, estados, implementación, decisiones, revisión).
**Abre solo los archivos que necesite la tarea**, no la carpeta entera.

Al empezar cada sesión:

1. Si existe `.sdd/estado.md`, léelo: dice dónde quedó el trabajo.
2. Si no existe `.sdd/proyecto.md`, haz el onboarding que describe la skill; si existe, no preguntes nada sobre el proyecto.
3. Revisa si hay avisos en `.sdd/review/` (cambios que la persona ha hecho desde MD SDD Hub) y revísalos.

Antes de programar o de escribir textos de la interfaz, lee `.sdd/decisiones.md` y respétalo, junto con los ADR y las
decisiones de diseño en `accepted`. Cuando la persona fije una norma («siempre…», «nunca…», «di X en vez de Y»),
apúntala ahí en el momento.

**Nunca escribas secretos** (contraseñas, claves de API, tokens, valores de `.env`) en ningún `.md`: solo el nombre
de la variable. Antes de hacer commit, push o desplegar, lee `.skills/sdd/git.md` y `.sdd/git.md`; **nunca subas a
producción (`pro`) sin autorización expresa** de la persona para ese push.

Las demás skills del proyecto, si las hay, están en `.skills/<nombre>/`: cada `SKILL.md` es un índice cuya
`description` dice cuándo usarla. Abre solo los archivos que necesites.

<!-- sdd-hub:end -->`, formato `sdd-hub/1`, marcas de versión `sdd-hub vN` (y `sdd-hub-skill vN` de los kits antiguos) y cabecera `X-SDD-Hub`.
- **Nunca secretos en los `.md`.** Todo texto que la app escribe en un proyecto pasa por `assertNoSecrets()` (`lib/write.js`, patrones en `lib/secrets.js`). Si añades una escritura nueva, pásala también. Al ampliar los patrones, prueba falsos positivos con textos normales de documentación.
- Cualquier escritura en un proyecto debe pasar por `resolveIn()` de `lib/write.js` (no salir de la carpeta del proyecto) y limitarse a archivos Markdown, salvo el kit y los `.htaccess` de protección web (`protectProject()`), que nunca pisan uno existente.

## Comprobaciones antes de terminar

```bash
node --check server.js
node tools/i18n-check.js
```

Arranca la app (`node server.js`) y prueba el cambio en el navegador. Las pruebas que escriben archivos se hacen en una carpeta temporal, nunca en proyectos reales de la persona.

## Cada versión (obligatorio)

En cada versión hay que documentar las nuevas funcionalidades. No des una versión por terminada sin estos pasos:

1. Sube `version` en `package.json` siguiendo [semver](https://semver.org/lang/es/): PARCHE para correcciones, MENOR para funcionalidades nuevas compatibles y MAYOR para cambios incompatibles.
2. Añade la versión, la fecha (`AAAA-MM-DD`) y los cambios (Añadido / Cambiado / Corregido / Eliminado) a **los dos** changelogs: [`CHANGELOG.md`](CHANGELOG.md) (inglés) y [`CHANGELOG.es.md`](CHANGELOG.es.md) (español). Mueve lo que haya en «Sin publicar / Unreleased».
3. Actualiza **los dos** README, [`README.md`](README.md) (inglés) y [`README.es.md`](README.es.md) (español): la línea «Versión actual / Current version», la lista de funcionalidades y cada sección afectada (uso, kit, formato, ajustes, API, solución de problemas…). Los dos README deben decir lo mismo.
4. Si cambia el kit (`kit/`), sube `KIT_VERSION` en `lib/scan.js` y la versión (`version:` y la marca `sdd-hub vN`) de `kit/es/skill/SKILL.md`, `kit/en/skill/SKILL.md` y los dos `claude-skill.md`, para que los proyectos vean que hay actualización. Cambia siempre los dos idiomas a la vez.
5. Ejecuta las comprobaciones de arriba.
6. Haz el commit y etiqueta la versión como `vX.Y.Z` (solo cuando la persona lo pida).

Mientras se trabaja en cambios que aún no son una versión, anótalos en «Sin publicar / Unreleased» de ambos changelogs.
