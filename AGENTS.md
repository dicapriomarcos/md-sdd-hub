# AGENTS.md · MD SDD Hub

Instrucciones para agentes de IA (Claude Code, Codex, Gemini…) que trabajen en este repositorio.

## Qué es

MD SDD Hub es un panel local para seguir specs SDD y los `.md` de varios proyectos. Servidor Node.js sin dependencias (`server.js` + `lib/`) e interfaz HTML/CSS/JS sin frameworks (`public/`). La estructura completa está en la sección «Arquitectura» de [`README.es.md`](README.es.md).

## Reglas del código

- **Sin dependencias.** Solo la biblioteca estándar de Node.js (≥ 18) en el servidor y JavaScript del navegador en la interfaz. No añadas `node_modules`, bundlers ni frameworks.
- **Sin base de datos.** La configuración vive en `data/` (ignorada por git); los datos de los proyectos son sus propios `.md`.
- Comentarios del código en español, como el resto del repositorio.
- **Interfaz traducible:** todo texto visible va dentro de `t('Texto en español')` (o `tn(n, 'singular', 'plural')`) en `public/app.js`, con su traducción en `public/i18n.js`. Los mensajes del servidor que llegan a la interfaz van en `lib/i18n.js` (es y en). Ejecuta `node tools/i18n-check.js` antes de terminar: debe decir 0 sin traducir y 0 sin usar.
- **El kit que se instala en los proyectos tiene dos idiomas** (`kit/es/` y `kit/en/`) y deben decir lo mismo. El idioma del kit de cada proyecto decide el contenido y los nombres de archivo (`instrucciones.md` / `plantillas/` / `review/hecho/` frente a `instructions.md` / `templates/` / `review/done/`); ver `LAYOUT` en `lib/write.js`. Los textos que la app escribe en los `.md` (avisos, historial, registros) están en `lib/i18n.js` en los dos idiomas.
- **El kit es neutral respecto al agente.** Las reglas viven en `.sdd/` del proyecto y se enlazan desde `AGENTS.md` (y `CLAUDE.md` / `GEMINI.md` si existen). Lo específico de Claude Code (skill corta y hook) es opcional; no añadas reglas que solo funcionen con un agente.
- No cambies los identificadores técnicos sin una migración: carpeta `.sdd/`, marcas `<!-- sdd-hub:start -->` / `<!-- sdd-hub:end -->`, formato `sdd-hub/1`, marcas de versión `sdd-hub vN` (y `sdd-hub-skill vN` de los kits antiguos) y cabecera `X-SDD-Hub`.
- Cualquier escritura en un proyecto debe pasar por `resolveIn()` de `lib/write.js` (no salir de la carpeta del proyecto) y limitarse a archivos Markdown, salvo el kit.

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
4. Si cambia el kit (`kit/`), sube `KIT_VERSION` en `lib/scan.js` y la marca `sdd-hub vN` de `kit/es/instrucciones.md`, `kit/en/instructions.md` y los dos `claude-skill.md`, para que los proyectos vean que hay actualización. Cambia siempre los dos idiomas a la vez.
5. Ejecuta las comprobaciones de arriba.
6. Haz el commit y etiqueta la versión como `vX.Y.Z` (solo cuando la persona lo pida).

Mientras se trabaja en cambios que aún no son una versión, anótalos en «Sin publicar / Unreleased» de ambos changelogs.
