# Changelog

[English](CHANGELOG.md) · **Español**

Aquí se documentan todos los cambios relevantes de MD SDD Hub. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

Cada versión debe actualizar este archivo, [`CHANGELOG.md`](CHANGELOG.md), [`README.md`](README.md) y [`README.es.md`](README.es.md) (ver la lista de [`AGENTS.md`](AGENTS.md)).

## [Sin publicar]

### Corregido
- Las instrucciones de Copiar spec y Copiar tarea respetan la fase: completan la planificación y pasan a Esperando aprobación, esperan autorización antes de implementar y pasan a Esperando revisión solo con todas las tareas y criterios verificados.
- El selector de carpetas de «Agregar proyecto» permite desplazarse hasta los últimos proyectos en ventanas bajas o con zoom, sin recortar la lista ni su barra de desplazamiento.

### Cambiado
- **Flujo nuevo de las features:** `backlog` («Por hacer») → `planning` («En planificación») → `awaiting-approval` («Esperando aprobación», lo pone la IA) → `in-progress` («En desarrollo», la persona aprueba) → `awaiting-review` («Esperando revisión», lo pone la IA) → `done` («Finalizado», la persona). `review`, `approved`, `verified` y `released` antiguos se siguen reconociendo al leer y pasan al estado nuevo más cercano. Cada proyecto puede quitar los estados que no usa (pestaña Configurar SDD): desaparecen de su tablero y se guardan como `skipStatuses` en `.sdd.json` para que la IA los salte. Fixes y diseño/arquitectura conservan sus estados. Nuevo botón **Eliminar proyecto** en la cabecera del proyecto (solo lo quita de la app).
- **Estados nuevos en features y fixes.** `draft` («Borrador») pasa a ser `backlog` («Backlog», trabajo pendiente) y se añade el estado cerrado `cancelled` («Cancelada») a features y fixes. Al leer se siguen reconociendo `draft`, `borrador`, `todo`, `wontfix`, `cancelled`…; los documentos y estados personalizados que ya usan `draft` siguen funcionando.
- **Las instrucciones SDD se leen por partes.** El kit v5 las instala como una skill por carpetas en `.skills/sdd/`: `SKILL.md` es un índice corto (frontmatter `name`, `version`, `install`, `description`, las reglas que valen siempre y una tabla con qué archivo leer para cada tarea) y cada tema va en un archivo corto (`tipos.md`, `formato.md`, `estados.md`, `implementacion.md`, `registro.md`, `registrar-decisiones.md`, `sesion.md`, `revision.md` y `plantillas/`; en inglés, `types.md`, `format.md`, `statuses.md`…). La IA abre solo lo que necesita la tarea en lugar de leer todas las instrucciones cada vez.
- El bloque de enlace se escribe en **`AGENTS.md`, `CLAUDE.md` y `GEMINI.md`**, y se crean los que no existan, para que cada agente lo encuentre en su archivo.
- Al actualizar un kit v4 se instala `.skills/sdd/` y se retiran `.sdd/instrucciones.md` y `.sdd/plantillas/` (o sus equivalentes en inglés). `.sdd/` queda para los archivos del proyecto: avisos de revisión, ficha, estado y decisiones.
- Las skills nuevas se crean por defecto en `.skills/<nombre>/` (para cualquier IA) con formato de índice; también se puede elegir `.claude/skills/`.
- Kit v6. El paso «Diseño» del onboarding arma el sistema de diseño en lugar de proponer un DES «Sistema visual», y el bloque de `AGENTS.md`, `CLAUDE.md` y `GEMINI.md` pide preguntar por los pasos del onboarding que sigan pendientes, una vez por sesión.

### Añadido
- **Sistema de diseño por partes** (`sistema-diseno.md` / `design-system.md` en la skill, con plantillas de índice y de parte): las decisiones de diseño se escriben en `<carpeta de diseño>/sistema/` (`system/` en inglés), un archivo por parte (`fundamentos/colores.md`, `fundamentos/tipografia.md`, `fundamentos/bordes.md`, `componentes/botones.md`, `patrones/estados-vacios.md`…) con un `index.md` que dice dónde está cada cosa. Se arma de a poco: solo entra lo decidido, los valores se definen una vez como tokens y los componentes los citan. Los DES aceptados pasan sus reglas al sistema y `.sdd/decisiones.md` lo enlaza con una sola línea. La IA lee el índice y solo las partes que toca antes de construir pantallas.
- Si el proyecto ya tiene diseño y el sistema no está escrito, la IA **pregunta una vez por sesión** si lo arma ahora; si la persona dice que no, el paso «Diseño» queda `Pendiente` y vuelve a preguntar en la siguiente sesión (o deja de hacerlo si se lo piden).
- La pestaña **Diseño** muestra el sistema de diseño: partes agrupadas en fundamentos, componentes y patrones, enlace al índice y, si aún no existe, dónde se creará y un botón para copiar la instrucción que pide a la IA armarlo a partir del código.
- **Botón de copiar tarea**: cada tarea con casilla (`T-NN`, `AC-NN`…) de una spec muestra un botón ⧉ al pasar el ratón que la copia lista para pegar en el chat de cualquier IA (Claude, Codex, Gemini…): proyecto, spec (ID, título y estado), archivo, tarea con su descripción y estado, un aviso si la spec aún no está en desarrollo y una instrucción final para seguir la skill `sdd` y marcar la casilla al terminar.
- **Decisiones rápidas** (`.sdd/decisiones.md` / `.sdd/decisions.md`): una regla por línea, agrupada por área (Textos, Interfaz, Código, Proceso), con fecha y enlace opcional a su DES o ADR. La IA apunta en el momento las normas que fijas al hablar con ella («di X en vez de Y», «nunca…») y las lee antes de programar o de escribir textos. Las que necesitan contexto siguen yendo en un DES o ADR, enlazado desde la lista.
- Pestaña **Decisiones** en cada proyecto: reglas por área con buscador, formulario para añadir una (la IA recibe un aviso) y la lista de DES y ADR aceptados.
- **Estado de la sesión** (`.sdd/estado.md` / `.sdd/status.md`): la IA anota dónde quedó el trabajo, los siguientes pasos y los bloqueos al terminar cada tarea o sesión, y lo lee al empezar. La app lo muestra en el proyecto («Dónde quedó») y en su tarjeta.
- **Ficha del proyecto** (`.sdd/proyecto.md` / `.sdd/project.md`) y **onboarding por pasos** (`onboarding.md`): ficha, Git, diseño y decisiones existentes. Pensado también para proyectos ya empezados: la IA deduce lo que puede del código (stack, comandos, variables CSS, Tailwind, `theme.json`, fuentes, componentes, tono de los textos, librerías y convenciones), propone y solo pregunta lo que falta, de una en una. El progreso queda en la tabla «Onboarding» de la ficha; cuando todo está hecho, no vuelve a preguntar. **Configurar SDD** muestra los pasos pendientes.
- **Seguridad** (`seguridad.md` / `security.md`) y regla de las que valen siempre: **nunca se escriben secretos** (contraseñas, claves, tokens, cadenas de conexión, valores de `.env`) en ningún `.md`, solo el nombre de la variable; qué hacer si aparece uno (quitarlo y rotarlo) y qué archivos no se suben a git.
- **La app se niega a guardar secretos**: al editar un `.md`, añadir una decisión, crear un documento o una skill, o cambiar un estado con nota, si el texto contiene algo con pinta de contraseña, clave o token, no se guarda y se indica la línea. Los marcadores de ejemplo (`<tu-clave>`, `${DB_PASSWORD}`, `********`) y los nombres de variable sí se permiten.
- **Aviso de secretos ya escritos**: la app revisa los `.md` de cada proyecto y avisa (🔑) de los que contienen posibles secretos, con archivo y línea, en el proyecto, su tarjeta y la lista de documentos.
- **Git del proyecto** (`.sdd/git.md`) y reglas en `git.md`, que la IA **solo lee al hacer commit, push o desplegar**: nombre y email con los que se commitea (con `git config --local`, nunca global), remotes `origin`, `dev` y `pro` con su rama y cuándo se sube a cada uno, idioma y formato de los commits. **Producción (`pro`) solo con autorización expresa** para cada push, nunca `--force`; `git status` y revisión de secretos antes de cada commit. **Configurar SDD** muestra la identidad y los remotes.
- **Protección web**: las carpetas con documentos llevan un `.htaccess` (Apache 2.4 y 2.2) que bloquea el acceso desde el navegador. Las ocultas (`.sdd/`, `.skills/`, `.claude/`…) se bloquean enteras y `docs/` solo para los Markdown. Nunca se pisa un `.htaccess` que ya exista. Se instala con el kit, se comprueba en **Configurar SDD** (botón «Proteger») y se puede desactivar en **Ajustes**.
- La pestaña **Skills** muestra las skills de `.skills/` con su versión y su política de instalación (`install`).
- Las carpetas `.skills/` y `.memory/` aparecen en «Documentos» y en «Cambios en .md».

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
