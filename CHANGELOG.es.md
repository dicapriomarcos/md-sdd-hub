# Changelog

[English](CHANGELOG.md) · **Español**

Aquí se documentan todos los cambios relevantes de MD SDD Hub. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

Cada versión debe actualizar este archivo, [`CHANGELOG.md`](CHANGELOG.md), [`README.md`](README.md) y [`README.es.md`](README.es.md) (ver la lista de [`AGENTS.md`](AGENTS.md)).

## [Sin publicar]

## [1.3.0] - 2026-10-03

### Cambiado
- **El kit ya no depende de Claude Code.** Las instrucciones SDD se instalan en un sitio neutro del proyecto, `.sdd/instrucciones.md` (o `.sdd/instructions.md`) con las plantillas en `.sdd/plantillas/` (o `.sdd/templates/`), para que Codex, Claude Code, Gemini, Cursor o cualquier otro agente sigan las mismas reglas. No te ata a un solo agente.
- El bloque con el enlace se añade a `AGENTS.md` (se crea si no existe) y también a `CLAUDE.md` y `GEMINI.md` si existen.
- La skill `.claude/skills/sdd-spec` pasa a ser opcional y solo un acceso corto para Claude Code que remite a las instrucciones comunes.
- «Preparar el proyecto» (marcado por defecto al agregar un proyecto) instala las instrucciones y los enlaces.
- «Agregar carpeta» pasa a llamarse **«Agregar proyecto»** en toda la interfaz.
- Kit v4.

### Añadido
- **Kit en español o en inglés**, según el idioma del navegador por defecto y seleccionable al agregar un proyecto o instalar el kit. El idioma decide el contenido (instrucciones, plantillas, bloque de `AGENTS.md`, avisos de revisión, filas de historial) y los nombres de archivo (`instrucciones.md` / `plantillas/` / `review/hecho/` en español, `instructions.md` / `templates/` / `review/done/` en inglés).
- **Regla de idioma para la IA**: las instrucciones y el bloque de `AGENTS.md` le indican que responda, escriba y hable siempre en el idioma del kit (chat, documentos, comentarios de código y commits).
- **Actualización con un clic** de los proyectos con un kit antiguo: aviso «Actualizar» en el proyecto y distintivo «SDD ↑» en su tarjeta. Al actualizar se conserva el idioma del kit, las instrucciones pasan a `.sdd/`, se sustituye el bloque antiguo de `AGENTS.md` sin duplicarlo y la skill antigua pasa a ser el acceso corto.
- Nombre de archivo (slug) editable en el diálogo «Nuevo documento».
- El idioma y la versión del kit se muestran en **Configurar SDD** y en la tarjeta del proyecto.

### Corregido
- Los comentarios HTML dentro de un párrafo (como la marca `<!-- sdd-hub:end -->`) se mostraban como texto en el visor de documentos.
- Los cuerpos de petición con caracteres acentuados podían corromperse si llegaban partidos en varios trozos de red.

## [1.2.0] - 2026-10-02

### Añadido
- **Tipos de documento con sus propios tableros**: cada proyecto tiene cuatro pestañas, cada una con vista de lista y de tablero:
  - **Features** (`SPEC-NNN`, `docs/specs/`): características de la aplicación, como hasta ahora.
  - **Diseño** (`DES-NNN`, `docs/design/`): decisiones de diseño UX/UI.
  - **Arquitectura** (`ADR-NNN`, `docs/architecture/`, también `docs/adr/` y `docs/decisions/`): tecnologías, patrones, estructura de carpetas y clases, convenciones de código.
  - **Fixes** (`FIX-NNN`, `docs/fixes/`): correcciones importantes con síntoma, causa raíz, solución y prevención.
- Cada tipo tiene su propio ciclo de estados: las features mantienen el suyo; diseño y arquitectura usan `proposed` → `accepted` / `rejected` → `deprecated` / `superseded`; los fixes, `reported` → `investigating` → `in-progress` → `verified` → `released`.
- Plantillas de decisión de diseño, ADR y fix en la skill `sdd-spec`.
- Diálogo «Nuevo documento» con selector de tipo; cada tipo se crea en su carpeta con su prefijo y el siguiente número libre.
- Soporte de ADR clásicos (estilo adr-tools, `0001-titulo.md` con sección `## Status`): se leen, se les cambia el estado y se respeta su numeración.
- Página global de tableros con selector de tipo.
- Indicadores del panel: features activas, fixes abiertos y decisiones propuestas.
- Registros por tipo en **Configurar SDD** (crear o regenerar el `README.md` de cada carpeta).
- Estados por tipo en **Ajustes**.
- Nueva alerta: decisión propuesta y sin decidir desde hace N días.
- Metadatos `Relacionadas` (enlaces entre documentos) y `Gravedad` para los fixes.
- Variable de entorno `SDD_HUB_DATA` para usar otra carpeta de datos (útil para pruebas).

### Cambiado
- Skill `sdd-spec` v3: cubre los cuatro tipos de documento, cuándo crear cada uno, sus ciclos de estados y la regla de respetar los ADR y las decisiones de diseño `accepted` al programar. Los proyectos con una versión anterior muestran «hay una versión nueva».
- El `.sdd.json` que escribe el kit incluye `dirs` con la carpeta de cada tipo.
- El bloque de `AGENTS.md` menciona los cuatro tipos.
- Los ajustes de la 1.1 con estados personalizados se migran automáticamente a los estados de las Features.

## [1.1.0] - 2026-10-02

### Cambiado
- La app pasa a llamarse **MD SDD Hub** (interfaz, título de la ventana, consola, acceso directo y `package.json`). Los identificadores técnicos (`.sdd/`, marcas `<!-- sdd-hub:start -->`, formato `sdd-hub/1`) no cambian, así que los proyectos existentes siguen funcionando.
- La skill `sdd-spec` pasa a la v2 (nuevo nombre en su texto). Los proyectos con la v1 muestran «hay una versión nueva» en **Configurar SDD**.

### Añadido
- Versión de la app en la barra lateral y en **Ajustes**, con enlace a este changelog.
- README completo en inglés y español.
- Este changelog, en inglés y español.
- `AGENTS.md` y `CLAUDE.md` con las reglas del repositorio, incluida la lista obligatoria para cada versión.

## [1.0.0] - 2026-10-02

Primera versión.

### Añadido
- Servidor local de Node.js sin dependencias ni base de datos, que solo escucha en `127.0.0.1:4780`.
- Panel, «Cambios en .md» con marcas de no leído, tablero de specs (kanban) y búsqueda global.
- Pestañas por proyecto: Specs, Tablero, Documentos, Skills, Revisiones IA y Configurar SDD.
- Detección de specs en el formato canónico, Spec Kit, Kiro, OpenSpec y formato libre; extracción de estado, requisitos, criterios de aceptación, tareas, dependencias e historial.
- Edición desde la app: cambios de estado (con fila de historial y actualización del registro), casillas clicables, editor con vista previa, nuevas specs desde la plantilla, nuevos `.md` y regeneración del registro.
- Alertas SDD: sin estado, estado no reconocido, estancada, lista para verificar, empezada, casillas pendientes, registro desincronizado y dependencia inexistente.
- Kit MD SDD Hub: skill `sdd-spec`, bloque en `AGENTS.md`, hook de revisión para Claude Code, manifiesto `.sdd.json`, plantilla y registro.
- Opción «Preparar el proyecto» al agregar una carpeta: instala la skill y la enlaza desde `AGENTS.md`.
- Bucle de revisión con la IA: avisos con diff en `.sdd/review/` y resultados revisados en `.sdd/review/hecho/`.
- Gestión de skills: del proyecto, globales (`~/.claude/skills`), copia entre proyectos y creación de nuevas.
- Interfaz en español e inglés, detectada del navegador y seleccionable a mano.
- Tema claro/oscuro/automático, «Abrir en editor» y «Mostrar en el explorador».
- Acceso directo en el escritorio de Windows con lanzador sin ventana, y botón para apagar.
