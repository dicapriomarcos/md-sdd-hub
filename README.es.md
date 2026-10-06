# MD SDD Hub

[English](README.md) · **Español**

Panel local para seguir el desarrollo dirigido por especificaciones (SDD) en todos tus proyectos. Ve cada spec con su estado y progreso, consulta y edita los `.md` que escriben los agentes de IA (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, docs, skills) y devuelve tus cambios a la IA para que los revise. Sin dependencias ni base de datos.

> Versión actual: **1.4.0** · Qué cambia en cada versión: [CHANGELOG](CHANGELOG.es.md).

## Contenido

- [Por qué](#por-qué)
- [Funcionalidades](#funcionalidades)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Arrancar y parar](#arrancar-y-parar)
- [Primeros pasos](#primeros-pasos)
- [Uso de la aplicación](#uso-de-la-aplicación)
- [El kit MD SDD Hub](#el-kit-md-sdd-hub)
- [Tipos de documento y formato](#tipos-de-documento-y-formato)
- [Bucle de revisión con la IA](#bucle-de-revisión-con-la-ia)
- [Alertas SDD](#alertas-sdd)
- [Idioma de la interfaz](#idioma-de-la-interfaz)
- [Configuración y datos](#configuración-y-datos)
- [Arquitectura](#arquitectura)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Solución de problemas](#solución-de-problemas)
- [Versiones y changelog](#versiones-y-changelog)
- [Contribuir](#contribuir)

## Por qué

Cuando programas con agentes de IA (Claude Code, Codex, Gemini…), estos escriben mucho Markdown: specs, planes, `CLAUDE.md`, `AGENTS.md`, skills, documentación. Con varios proyectos es fácil perder el control de qué se ha escrito, qué spec está terminada, qué requisitos tiene cada una y qué cambios la IA todavía no ha visto.

MD SDD Hub te da un único sitio para:

- ver todas las specs de todos los proyectos, con su estado y progreso;
- llevar tableros separados para features, decisiones de diseño, decisiones de arquitectura y fixes;
- saber qué `.md` ha creado o modificado la IA desde la última vez que miraste;
- leer y editar cualquiera de esos archivos directamente;
- hacer que cualquier IA (Codex, Claude Code, Gemini, Cursor…) escriba los documentos siempre en el mismo formato y en tu idioma;
- devolver tus cambios a la IA para que los revise.

## Funcionalidades

**Visión general**
- Panel con features activas, fixes abiertos, decisiones propuestas, trabajo en curso, `.md` sin leer, revisiones pendientes de la IA y alertas SDD de todos los proyectos.
- Tarjeta por proyecto con barra de estados, estado del kit y última actividad.

**Documentos por tipo**
- Cuatro tipos de documento por proyecto, cada uno con su pestaña, vista de lista y vista de tablero: **Features** (`SPEC`), **Diseño** (decisiones UX/UI, `DES`), **Arquitectura** (ADR, `ADR`) y **Fixes** (`FIX`).
- Cada tipo tiene su carpeta, prefijo de ID, plantilla y ciclo de estados (ver [Tipos de documento y formato](#tipos-de-documento-y-formato)).
- Detección automática de features en `docs/specs`, `specs`, `.specify/specs` (Spec Kit), `.kiro/specs` (Kiro) y `openspec/changes` (OpenSpec), además de archivos con «spec» en el nombre dentro de `docs/`; de decisiones de diseño en `docs/design`; de ADR en `docs/architecture`, `docs/adr` y `docs/decisions` (incluidos los ADR clásicos de adr-tools); y de fixes en `docs/fixes`.
- Extrae de cada documento el estado, propietario, fechas, dependencias y documentos relacionados, requisitos (`FR-NN`), criterios de aceptación (`AC-NN`), tareas (`T-NN`), gravedad e historial.
- Tableros kanban por estado, por proyecto o de todos los proyectos; al arrastrar una tarjeta se edita el `.md`.
- Al cambiar el estado desde la app se actualizan la celda de estado, la fecha «Actualizada», la tabla de historial y el registro de la carpeta.
- Casillas clicables: al marcar una se edita el `.md`.
- **Copiar tarea** (⧉ junto a cada casilla): copia la tarea con su descripción, estado y contexto de la spec, lista para pegar en el chat de cualquier IA y que siga trabajando.
- **Copiar instrucción de una spec**: adapta el mensaje al estado. En planificación, pide completar el documento y pasarlo a Esperando aprobación; en desarrollo, pide implementar y pasar a Esperando revisión con tareas, criterios y pruebas completos. Copiar una tarea respeta el mismo flujo.
- «Nuevo documento» con selector de tipo: se crea en la carpeta del tipo con el siguiente ID libre, a partir de la plantilla del proyecto o de la skill.
- Creación y regeneración del registro de cada tipo (`README.md` de cada carpeta).

**Archivos Markdown**
- «Cambios en .md»: todos los Markdown, del más reciente al más antiguo, con un punto azul en los que han cambiado desde la última vez que los abriste.
- Árbol de documentos por proyecto, agrupado por carpetas y etiquetado como spec, agentes, skill, doc o revisión.
- Visor con índice, tablas, avisos, imágenes y enlaces internos.
- Editor con vista previa en vivo, `Ctrl+S` para guardar y protección para no pisar cambios que la IA haya hecho en disco.
- Búsqueda de texto en todos los proyectos (`Ctrl+K`).

**Skills**
- Skills del proyecto (`.skills`, `.claude/skills`, `.agents/skills`, `.codex/skills`, `.gemini/skills`, `.cursor/skills`), con su versión y su política de instalación (`install`), comandos y subagentes.
- Skills globales de `~/.claude/skills`.
- Crear una skill (por defecto en `.skills/<nombre>/`, como índice con archivos cortos), copiarla de otro proyecto o de la carpeta global.

**Trabajo con la IA**
- Instrucciones SDD neutras en `.skills/sdd/`, **por partes**: un índice corto y un archivo por tema, para que la IA lea solo lo que necesita. Enlazadas desde `AGENTS.md`, `CLAUDE.md` y `GEMINI.md` (se crean si no existen), para que Codex, Claude Code, Gemini, Cursor y otros escriban los documentos igual. No te ata a un solo agente.
- **Decisiones rápidas** en `.sdd/decisiones.md`: las normas que fijas al hablar con la IA («di X en vez de Y», «nunca…»), una por línea y por área, con su pestaña para buscarlas y añadirlas.
- **Sistema de diseño por partes** en `docs/design/sistema/`: la IA escribe cada decisión de diseño (colores, tipografía, espaciado, bordes, botones, formularios…) en su archivo, con un `index.md` que dice dónde está cada cosa, y lo va armando de a poco. Si el proyecto ya tiene diseño, pregunta una vez por sesión si lo arma ahora. La pestaña Diseño lo muestra agrupado.
- **Estado de la sesión** (`.sdd/estado.md`): dónde quedó el trabajo, siguientes pasos y bloqueos, visible en el proyecto. **Ficha del proyecto** (`.sdd/proyecto.md`) con onboarding la primera vez, para que la IA no vuelva a preguntar.
- **Protección web**: `.htaccess` en las carpetas con documentos para que Apache (XAMPP, hosting) no los sirva.
- **Sin secretos en los `.md`**: la app se niega a guardar contraseñas, claves o tokens y avisa (🔑) de los que ya estén escritos; las instrucciones prohíben a la IA escribirlos.
- **Onboarding por pasos** (ficha, Git, diseño y decisiones existentes), también para proyectos ya empezados: la IA deduce del código y solo te pide confirmar.
- **Git del proyecto** (`.sdd/git.md`): con qué nombre y email se commitea y cuándo se sube a `origin`, `dev` y `pro` (producción solo con tu autorización expresa).
- Kit en español o en inglés (según el idioma del navegador): contenido, nombres de archivo e idioma en el que la IA responde, escribe y habla.
- Actualización con un clic de los proyectos con un kit antiguo.
- Avisos de revisión con diff en `.sdd/review/` por cada edición que hagas, y un hook opcional de Claude Code que se los recuerda a la IA.
- Pestaña «Revisiones IA» con los avisos pendientes y la respuesta de la IA a los revisados.

**Aplicación**
- Interfaz en español e inglés, detectada del navegador.
- Tema claro, oscuro o automático.
- «Abrir en editor» (VS Code, Cursor, Windsurf, Zed, PhpStorm… detectados automáticamente) y «Mostrar en el explorador».
- Acceso directo en el escritorio de Windows que arranca la app sin ventana.
- Refresco automático cada pocos segundos.

## Requisitos

- [Node.js](https://nodejs.org) 18 o superior. Nada más: ni `npm install` ni base de datos.
- Un navegador actual (Chrome, Edge, Firefox, Safari).
- Windows, macOS o Linux. El acceso directo e `iniciar.bat` son solo para Windows; todo lo demás funciona en cualquier sistema.

## Instalación

```bash
git clone https://github.com/dicapriomarcos/sdd-hub.git
```

O descarga el ZIP desde GitHub y descomprímelo donde quieras. No hay nada que compilar ni instalar.

Para actualizar más adelante:

```bash
git pull
```

Tu configuración (`data/`) no está en git, así que se conserva al actualizar.

## Arrancar y parar

| Cómo | Qué hace |
|---|---|
| Acceso directo del escritorio (Windows) | Arranca el servidor en segundo plano (sin ventana) y abre el navegador. Si ya está en marcha, solo abre el navegador. Se crea desde **Ajustes → Crear acceso directo en el escritorio**. |
| `iniciar.bat` (Windows) | Arranca el servidor en una ventana de consola y abre el navegador. Al cerrar la ventana se para. |
| `node server.js --open` | Cualquier sistema. Arranca el servidor y abre el navegador. |
| `npm start` | Igual que el anterior. |

La app funciona en `http://localhost:4780`. Para usar otro puerto, define la variable `PORT` (por ejemplo `set PORT=5000` en Windows o `PORT=5000 node server.js` en macOS/Linux).

Para pararla: **Ajustes → Apagar MD SDD Hub**, o cierra la ventana de consola si usaste `iniciar.bat`.

## Primeros pasos

1. **Agrega un proyecto.** Pulsa **+ Agregar proyecto**, navega hasta un proyecto (o pega su ruta) y confirma. Para agregar varios a la vez, usa **Buscar proyectos dentro…** sobre una carpeta padre como `C:\xampp\htdocs`: se preseleccionan los proyectos con specs, `CLAUDE.md` o `.claude`.
2. **Prepara el proyecto.** La opción «Preparar el proyecto para MD SDD Hub» (marcada por defecto) instala las instrucciones SDD en `.sdd/` y las enlaza desde `AGENTS.md` (y desde `CLAUDE.md` / `GEMINI.md` si existen). Al lado eliges el idioma; por defecto, el de tu navegador. Desmárcala si no quieres que la app escriba nada en ese proyecto.
3. **Instala el resto del kit (opcional).** En **Proyecto → Configurar SDD → Instalar** puedes añadir el acceso y el hook de revisión para Claude Code, la plantilla, el manifiesto y el registro.
4. **Trabaja con tu IA como siempre** (Codex, Claude Code, Gemini…). Prueba: «crea una spec para …», «implementa la SPEC-004» o «revisa los cambios pendientes».
5. **Controla desde la app.** Mira el panel y «Cambios en .md» para ver qué ha escrito la IA; edita, cambia estados y marca casillas, y la IA recibirá el aviso.

## Uso de la aplicación

### Panel
Indicadores (specs activas, en curso, `.md` sin leer, revisiones pendientes de la IA, alertas SDD), una tarjeta por proyecto, los últimos cambios en `.md`, las specs en curso y las que requieren atención.

### Cambios en .md
Todos los Markdown de tus proyectos, del más reciente al más antiguo. Un punto azul indica que el archivo ha cambiado desde la última vez que lo abriste en la app. Filtra por proyecto, por categoría (spec, agentes, skill, doc, revisión) o solo los no leídos, y marca todo como leído.

### Tableros
Un tablero por tipo de documento, con una columna por cada estado de ese tipo. Elige el tipo arriba (Features, Diseño, Arquitectura, Fixes). Arrastra una tarjeta para cambiar su estado: se edita el `.md` (estado, fecha, historial y registro) y un aviso te permite deshacerlo. Filtra por proyecto o texto, y muestra u oculta los estados cerrados.

### Proyecto
| Pestaña | Contenido |
|---|---|
| **Features** | Características de la aplicación. Vista de lista (ordenable y filtrable: ID, título, estado, progreso, último cambio, alertas) o de tablero. |
| **Diseño** | Decisiones de diseño UX/UI, en lista o tablero, y encima el **sistema de diseño**: sus partes agrupadas en fundamentos, componentes y patrones, con enlace al índice. Si aún no existe, dice dónde se creará y copia una instrucción para que la IA lo arme a partir del código. |
| **Arquitectura** | Decisiones de arquitectura (ADR), en lista o tablero. |
| **Fixes** | Correcciones importantes, en lista o tablero. |
| **Decisiones** | Las reglas vigentes de `.sdd/decisiones.md` por área, con buscador y formulario para añadir una, y los DES y ADR aceptados. |
| **Documentos** | Todos los `.md` del proyecto agrupados por carpeta. Crear un `.md` nuevo, filtrar y marcar como leído. |
| **Skills** | Skills, comandos y subagentes del proyecto, además de tus skills globales. Crear, copiar o instalar skills. |
| **Revisiones IA** | Avisos pendientes de revisión por la IA y los resultados de los ya revisados. |
| **Configurar SDD** | Estado del kit en este proyecto (instrucciones, enlaces, ficha del proyecto, protección web, hook…), instalación del kit y regeneración del registro. |

Si la IA ha dejado `.sdd/estado.md`, encima de las pestañas aparece **Dónde quedó**: lo último que se hizo, los siguientes pasos y los bloqueos. La tarjeta del proyecto en el panel muestra la primera línea (o el bloqueo, si lo hay).

### Vista de un documento
Cabecera con ID, título, tipo y selector de estado (con los estados de ese tipo) (pide una nota opcional para el historial). Panel lateral con el progreso (tareas y criterios por separado, en features y fixes), datos (incluida la gravedad de los fixes), dependencias y documentos relacionados con su estado, specs que dependen de esta, requisitos e historial. Las specs de varios archivos (Spec Kit, Kiro, OpenSpec) muestran una pestaña por archivo.

### Editor
Pulsa **Editar** en cualquier documento. Código a la izquierda y vista previa en vivo a la derecha (se oculta con **Vista previa**). `Ctrl+S` guarda; `Tab` indenta. Si la IA ha cambiado el archivo en disco mientras editabas, se te avisa antes de sobrescribir.

### Búsqueda
Escribe en la barra superior y pulsa `Enter` (o `Ctrl+K` para ir a ella). Primero salen las specs que coinciden y después cada documento con sus coincidencias.

### Ajustes
Idioma de la interfaz, editor para «Abrir en editor», tu nombre para las specs nuevas, días para marcar una spec en curso como estancada, avisos a la IA, protección web de los documentos, filas de historial, tema, estados del ciclo de vida de cada tipo de documento (etiqueta, color, cerrado o no), proyectos agregados, acceso directo y apagado.

## El kit MD SDD Hub

El kit hace que **cualquier agente de IA** siga las mismas reglas: las instrucciones viven en un sitio neutro del proyecto (`.skills/sdd/`) y los archivos que cada agente ya lee (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) las enlazan. Puedes alternar Codex, Claude Code, Gemini o Cursor en el mismo proyecto.

Las instrucciones son una **skill por carpetas**: `SKILL.md` es un índice corto con las reglas que valen siempre y una tabla que dice qué archivo leer para cada tarea; el detalle va en archivos cortos que la IA abre solo cuando los necesita. Así cada sesión gasta menos contexto que leyendo todas las reglas de golpe.

Se instala al agregar un proyecto («Preparar el proyecto») o desde **Proyecto → Configurar SDD → Instalar**. No se borra nada; eliges qué partes instalar.

| Archivo | Para qué |
|---|---|
| `.skills/sdd/SKILL.md` | Índice de la skill (frontmatter `name`, `version`, `install`, `description`): idioma, las reglas que valen siempre, qué hacer al empezar cada sesión y la tabla de archivos. |
| `.skills/sdd/tipos.md` · `formato.md` · `estados.md` · `implementacion.md` · `registro.md` · `registrar-decisiones.md` · `sistema-diseno.md` · `onboarding.md` · `sesion.md` · `git.md` · `seguridad.md` · `revision.md` | Un tema por archivo: tipos de documento, ubicación y formato, ciclos de estados, implementación, registro, decisiones rápidas, sistema de diseño, onboarding por pasos, ficha y estado de la sesión, Git (solo al hacer commit, push o desplegar), seguridad y procedimiento de revisión. En inglés: `types.md`, `format.md`, `statuses.md`, `implementation.md`, `registry.md`, `recording-decisions.md`, `design-system.md`, `onboarding.md`, `session.md`, `git.md`, `security.md`, `review.md`. |
| `.skills/sdd/plantillas/` (es) · `.skills/sdd/templates/` (en) | Una plantilla por tipo de documento (feature, diseño, arquitectura, fix) y las de la ficha, el estado, las decisiones, Git y el sistema de diseño (índice y parte). |
| Bloque en `AGENTS.md`, `CLAUDE.md` y `GEMINI.md` | Enlaza la skill, indica a la IA en qué idioma trabajar y qué leer al empezar cada sesión. Los tres se crean si no existen, porque cada agente lee el suyo; el bloque va entre marcas `<!-- sdd-hub:start -->` y el resto del archivo no se toca. |
| `.htaccess` en `.sdd/`, `.skills/`, `.claude/` y `docs/` | Bloquea el acceso web (Apache 2.4 y 2.2): las carpetas ocultas enteras y `docs/` solo para los Markdown. No se pisa un `.htaccess` que ya exista. |
| `.claude/skills/sdd-spec/SKILL.md` | Opcional, para Claude Code: una skill corta que remite a `.skills/sdd/` para que Claude la cargue en el momento adecuado. |
| `.claude/hooks/sdd-review.js` + `.claude/settings.local.json` | Opcional, para Claude Code: hook `UserPromptSubmit` / `SessionStart` que le avisa de tus cambios pendientes de revisión. Ajustes locales, no se suben a git. |
| `.sdd.json` | Manifiesto: carpeta de cada tipo de documento (`dirs`), idioma, documento SDD y prefijo de ID de las features. |
| `<specs>/000-TEMPLATE.md` | Plantilla canónica de spec. |
| `<specs>/README.md` | Registro con todas las specs y su estado (solo si no existe). |

### Onboarding

La primera vez que una IA trabaja en un proyecto con el kit, hace un onboarding **por pasos**: ficha, Git, diseño (si hay interfaz) y decisiones que ya existen. En cada paso primero **detecta** lo que puede (en un proyecto ya empezado, casi todo: stack y comandos, remotes y estilo de los commits, variables CSS, Tailwind o `theme.json`, fuentes, cómo son los botones y el tono de los textos, librerías y convenciones), te **propone** lo que ha encontrado y solo pregunta lo que falta, de una en una. Las reglas van a `.sdd/decisiones.md`, el diseño que confirmes al **sistema de diseño** y, si hay una decisión técnica con contexto, propone un ADR en `proposed` para que lo aceptes. El progreso queda en la ficha: cuando todo está hecho, la IA no vuelve a preguntar. Los pasos que dejas para más tarde (por ejemplo, armar el sistema de diseño) quedan `Pendiente` y la IA vuelve a preguntar una vez en la siguiente sesión.

### Sistema de diseño

Las decisiones de diseño terminan en un sistema de diseño repartido en archivos cortos, en `<carpeta de diseño>/sistema/` (`system/` en inglés), para que la IA lea solo la parte que va a tocar:

```
docs/design/sistema/
├── index.md          índice: qué partes hay y dónde está cada cosa
├── fundamentos/      colores, tipografia, espaciado, maquetacion, bordes, sombras, iconos, movimiento
├── componentes/      botones, formularios, tarjetas, avisos, navegacion, modales, tablas…
└── patrones/         estados-vacios, carga-y-errores…
```

- **Se arma de a poco**: cada vez que decides algo (un color, una fuente, el radio de los bordes, cómo es un botón) la IA lo escribe en su parte, crea la parte si no existe y actualiza el índice. Solo entra lo decidido o confirmado; nada de valores inventados.
- Los valores se definen una vez en `fundamentos/` con un token (`--color-primario`, `--radio-md`) y los componentes los citan; cada parte dice dónde viven en el código.
- Los DES siguen guardando el porqué y las alternativas; al aceptarse, sus reglas pasan al sistema. En `.sdd/decisiones.md` queda una sola línea que enlaza el índice.
- Antes de construir o cambiar una pantalla, la IA lee el índice y solo las partes que toca.
- Si el proyecto ya tiene diseño y el sistema no está escrito, la IA pregunta una vez por sesión si lo arma ahora a partir del código; si dices que no, vuelve a preguntar en la siguiente sesión, y si pides que no insista, deja de hacerlo. Para empezarlo o terminarlo, pídeselo: «haz el onboarding».

### Archivos del proyecto

Además, en `.sdd/` viven los archivos **del proyecto**, que la app nunca sobrescribe:

| Archivo | Quién lo escribe | Para qué |
|---|---|---|
| `.sdd/proyecto.md` (es) · `.sdd/project.md` (en) | La IA, en el onboarding | Ficha del proyecto: qué es, stack, comandos, estructura, convenciones y la tabla «Onboarding» con los pasos hechos y pendientes. Si todo está hecho, la IA no vuelve a preguntar por el proyecto. |
| `.sdd/git.md` | La IA, en el onboarding (paso Git) | Nombre y email para los commits, remotes `origin` / `dev` / `pro` con su rama y cuándo se sube a cada uno, idioma y formato de los commits. Producción, por defecto, solo con autorización expresa. La IA solo lo lee al hacer commit, push o desplegar. |
| `.sdd/estado.md` (es) · `.sdd/status.md` (en) | La IA, al terminar cada tarea o sesión | Dónde quedó el trabajo, siguientes pasos y bloqueos. La IA lo lee al empezar; la app lo muestra en el proyecto. |
| `.sdd/decisiones.md` (es) · `.sdd/decisions.md` (en) | La IA y tú (pestaña **Decisiones**) | Reglas vigentes, una por línea y agrupadas por área: `- AAAA-MM-DD · Regla → DES-004`. Las que necesitan contexto tienen además su DES o ADR. |
| `.sdd/review/` | La app | Avisos de revisión de tus cambios (ver [Bucle de revisión](#bucle-de-revisión-con-la-ia)). |

### Idioma del kit

El kit se instala en **español** o en **inglés**. Por defecto sigue el idioma de tu navegador (puedes cambiarlo en el diálogo). El idioma decide:

- el contenido de las instrucciones, las plantillas, el bloque de `AGENTS.md`, los avisos de revisión y las filas de historial;
- los nombres de archivo: `tipos.md` / `plantillas/` / `estado.md` / `decisiones.md` / `review/hecho/` en español, `types.md` / `templates/` / `status.md` / `decisions.md` / `review/done/` en inglés, y los slugs de los documentos;
- el idioma en el que la IA debe **responder, escribir y hablar siempre** (chat, documentos, comentarios de código y commits). La regla está en las instrucciones y en el bloque de `AGENTS.md`, que los agentes leen al empezar cada sesión.

Las carpetas de documentos (`docs/specs`, `docs/design`, `docs/architecture`, `docs/fixes`) son las mismas en los dos idiomas.

### Actualizar kits antiguos

Los proyectos con un kit de una versión anterior (por ejemplo, la skill `.claude/skills/sdd-spec` de la 1.x) muestran un aviso con un botón **Actualizar**. Al actualizar se conserva el idioma del kit, se instala la skill en `.skills/sdd/` y se retiran las instrucciones de un solo archivo de la versión anterior (`.sdd/instrucciones.md` y `.sdd/plantillas/`), se sustituye el bloque antiguo de `AGENTS.md` (sin duplicarlo) y se escribe también en `CLAUDE.md` y `GEMINI.md`, se protegen las carpetas con `.htaccess` y la skill antigua de Claude Code pasa a ser el acceso corto.

## Tipos de documento y formato

| Tipo | Para qué | Prefijo | Carpeta por defecto |
|---|---|---|---|
| **Feature** | Una característica de la aplicación: qué hace, requisitos, criterios y tareas | `SPEC` | `docs/specs/` |
| **Diseño** | Una decisión de diseño UX/UI: pantallas, flujos, componentes, estilos, textos, accesibilidad | `DES` | `docs/design/` |
| **Arquitectura** | Una decisión técnica (ADR): tecnologías, librerías, patrones, estructura de carpetas y clases, convenciones de código | `ADR` | `docs/architecture/` (también `docs/adr/`, `docs/decisions/`) |
| **Fix** | Una corrección importante: síntoma, causa raíz, solución y prevención | `FIX` | `docs/fixes/` |

Un documento por archivo: `<carpeta>/<PREFIJO>-NNN-nombre-corto.md`. Las carpetas se pueden cambiar por proyecto en `.sdd.json` (`dirs`). En las carpetas de diseño, arquitectura y fixes solo se consideran documentos los archivos con un ID en el nombre, así que una introducción o un resumen en la misma carpeta no se toca; tampoco las subcarpetas, como el sistema de diseño (`sistema/`).

Una feature tiene este aspecto:

```markdown
# SPEC-012 · Alertas de caída de sitios

| Campo | Valor |
|---|---|
| Estado | `in-progress` |
| Autor | … |
| Propietario | … |
| Creada | 2026-09-01 |
| Actualizada | 2026-09-12 |
| Objetivo de release | … |
| Dependencias | SPEC-007, ADR-003 |

## 6. Requisitos
| ID | Requisito |
|---|---|
| FR-01 | … |

## 7. Criterios de aceptación
- [ ] AC-01 · …

## 9. Plan de tareas
- [x] T-01 · …

## Historial
| Fecha | Estado | Nota |
|---|---|---|
| 2026-09-12 | `in-progress` | … |
```

Las decisiones de diseño y de arquitectura tienen Contexto, Decisión, Alternativas consideradas, Consecuencias y Reglas (para la interfaz o para el código), con una fila `Relacionadas` que enlaza otros documentos. Los fixes tienen Síntoma, Causa raíz, Solución, Prevención, criterios de verificación (`AC-NN`), tareas (`T-NN`) y una fila `Gravedad`.

### Ciclos de estados

**Features**

| Estado | Significado | Quién lo decide |
|---|---|---|
| `backlog` | Por hacer: idea o spec incompleta, sin empezar | IA o persona |
| `planning` | En planificación: requisitos, criterios y tareas | IA o persona |
| `awaiting-approval` | Completa, lista para que la persona la apruebe | IA |
| `in-progress` | En desarrollo (pasar aquí es la aprobación) | La persona (la IA solo si ya estaba aprobada) |
| `awaiting-review` | Todas las tareas y criterios marcados, pruebas en verde | IA, con evidencia |
| `done` | Finalizado: revisado y dado por bueno | Solo la persona |
| `superseded` | Sustituida por otra spec | IA o persona |
| `cancelled` | Descartada, no se hará | Solo la persona |

**Diseño y arquitectura**

| Estado | Significado | Quién lo decide |
|---|---|---|
| `proposed` | Pendiente de decidir | IA o persona |
| `accepted` | Vigente: hay que respetarla al programar | Solo la persona |
| `rejected` | Descartada; se conserva para no volver a discutirla | Solo la persona |
| `deprecated` | Ya no aplica, sin sustituta | IA o persona |
| `superseded` | Sustituida por otra decisión | IA o persona |

**Fixes**

| Estado | Significado | Quién lo decide |
|---|---|---|
| `reported` | Documentado, sin investigar | IA o persona |
| `investigating` | Buscando la causa raíz | IA |
| `in-progress` | Causa conocida, corrigiendo | IA |
| `verified` | Corregido, criterios marcados, tests en verde | IA, con evidencia |
| `released` | Corrección desplegada y comprobada | Solo la persona |

Los estados de cada tipo se pueden personalizar en **Ajustes**. Al leer se reconocen alias en español e inglés (`draft`, `borrador`, `en curso`, `done`, `aceptada`, `fixed`…).

### Otros formatos

Se leen en modo «mejor esfuerzo»:

- **Spec Kit**: `.specify/specs/NNN-nombre/` (`spec.md`, `plan.md`, `tasks.md`…), `**Status**: Draft`.
- **Kiro**: `.kiro/specs/nombre/` (`requirements.md`, `design.md`, `tasks.md`).
- **OpenSpec**: `openspec/changes/nombre/` (`proposal.md`, `tasks.md`…); `archive/` cuenta como publicada.
- **ADR clásicos** (adr-tools): archivos `0001-titulo.md` con una sección `## Status` seguida del estado (`Accepted`). Al cambiar el estado se mantiene ese formato y los ADR nuevos siguen la numeración simple.
- **Libre**: cualquier `.md` con estado en el frontmatter YAML (`status:`), una fila `| Estado | … |` o una línea `**Estado:** …`.

Si una spec no declara estado, se deduce de sus archivos y casillas y se muestra como «deducido».

## Bucle de revisión con la IA

1. Editas un `.md` desde la app (texto, estado o casillas).
2. La app crea o amplía `.sdd/review/<archivo>.md` con qué ha cambiado y el diff.
3. El bloque de `AGENTS.md` indica a todos los agentes que revisen `.sdd/review/` al empezar a trabajar. Con el hook instalado, Claude Code recibe además un recordatorio en tu siguiente mensaje. Si no, pídeselo a tu IA: «revisa los cambios pendientes de .sdd/review».
4. La IA sigue `.skills/sdd/revision.md`: lee el diff y el archivo actual, comprueba la coherencia con el código y otros documentos, ajusta el documento o las tareas, escribe una sección «Resultado de la revisión» («Review result» en inglés) y mueve el aviso a `.sdd/review/hecho/` (`done/` en inglés).
5. Lees su respuesta en **Proyecto → Revisiones IA**.

Se desactiva en **Ajustes → Avisar a la IA de mis cambios**.

## Alertas SDD

| Alerta | Cuándo |
|---|---|
| Sin estado | La spec no declara estado. |
| Estado no reconocido | El estado no es ninguno de los configurados. |
| Estancada | Feature `in-progress`, o fix `investigating` / `in-progress`, sin cambios desde hace N días (14 por defecto). |
| Sin decidir | Decisión de diseño o arquitectura `proposed` sin cambios desde hace N días. |
| Lista para verificar | Feature o fix con todas las casillas marcadas pero con el estado todavía antes de `verified`. |
| Empezada | Hay casillas marcadas y la feature sigue en `backlog`, `planning`, `awaiting-approval` o `in-progress` (o el fix en `reported` / `investigating`). |
| Casillas pendientes | `verified` o `released` con casillas sin marcar. |
| Registro desincronizado | El estado del `README.md` de specs no coincide con la spec. |
| Dependencia inexistente | Depende de, o se relaciona con, un ID (`SPEC-`, `DES-`, `ADR-`, `FIX-`…) que no existe. |
| Sin registrar / sin criterios | Informativas. |
| Revisión pendiente | La has cambiado y la IA aún no la ha revisado. |

## Idioma de la interfaz

La interfaz está en **español** e **inglés**. Por defecto sigue el idioma del navegador. Si eliges uno a mano (selector ES/EN de la barra lateral o **Ajustes → Idioma**), se guarda; elige «Automático» para volver a seguir al navegador. Solo se traduce la interfaz: el idioma nunca cambia los `.md` de los proyectos.

## Configuración y datos

Todo vive en la carpeta de la app; no hay base de datos.

| Archivo | Contenido |
|---|---|
| `data/config.json` | Carpetas agregadas y ajustes. |
| `data/seen.json` | Cuándo abriste por última vez cada `.md` (para los puntos azules de «sin leer»). |

Ambos se crean al primer arranque y git los ignora. Quitar una carpeta de la app nunca borra nada del disco.

Para usar otra carpeta de datos (por ejemplo, para probar sin tocar tu configuración real), define `SDD_HUB_DATA` antes de arrancar: `SDD_HUB_DATA=/tmp/sdd-prueba node server.js`.

## Arquitectura

Servidor HTTP de Node.js sin dependencias y una interfaz de una sola página sin frameworks.

```
server.js          servidor HTTP y API JSON
lib/md-parse.js    análisis de Markdown: metadatos, estado, casillas, requisitos, historial
lib/scan.js        escaneo de proyectos, specs, documentos, skills, revisiones y alertas
lib/write.js       escrituras: estado, casillas, nuevas specs, registro, kit, avisos de revisión
lib/diff.js        diff de líneas para los avisos de revisión
lib/secrets.js     detección de secretos (contraseñas, claves, tokens) en Markdown
lib/i18n.js        textos del servidor (errores y alertas en es/en; textos de los .md en español)
public/index.html  estructura de la página
public/app.js      interfaz (rutas, vistas, diálogos, refresco automático)
public/i18n.js     traducción de la interfaz al inglés (la clave es el texto en español)
public/md.js       renderizador de Markdown (conserva los números de línea para editar casillas)
public/styles.css  estilos con tema claro y oscuro
kit/es/, kit/en/   kit que se instala en los proyectos, por idioma: skill/ (se copia a .skills/sdd/: índice, archivos por tema y plantillas) y el acceso para Claude Code
kit/hook/          hook de revisión para Claude Code (bilingüe)
tools/             make-icon.js (genera el icono), i18n-check.js (comprueba las traducciones)
lanzar.vbs         lanzador sin ventana que usa el acceso directo
iniciar.bat        lanzador con consola para Windows
```

Principales rutas de la API (todas bajo `/api`, en JSON):

| Ruta | Para qué |
|---|---|
| `GET /state` | Ajustes y resumen de todos los proyectos. |
| `GET /project?id=` | Escaneo completo de un proyecto (specs, documentos, skills, revisiones). |
| `GET /file?id=&rel=` | Contenido y datos analizados de un `.md` (lo marca como leído). |
| `GET /activity`, `GET /search?q=` | Cambios en `.md` y búsqueda de texto. |
| `POST /file/save`, `POST /file/new` | Editar o crear un `.md`. |
| `POST /spec/status`, `POST /spec/check`, `POST /spec/new` | Cambiar estado, marcar una casilla, crear un documento (`type`: `feature`, `design`, `architecture`, `fix`). |
| `POST /install`, `POST /registry`, `POST /protect` | Instalar el kit, crear o regenerar el registro de un tipo (`type`), crear los `.htaccess` que falten. |
| `POST /decisions/add` | Añadir una decisión a `.sdd/decisiones.md` (`area`, `text`, `ref`). |
| `POST /projects/add`, `/remove`, `/update`, `POST /discover` | Gestionar carpetas y buscar proyectos. |
| `POST /settings`, `POST /shortcut`, `POST /shutdown` | Ajustes, acceso directo, parar el servidor. |

## Seguridad y privacidad

- Solo escucha en `127.0.0.1`; nada es accesible desde otros equipos.
- Rechaza las peticiones cuyo `Host` no es local (protección frente a DNS rebinding).
- Las peticiones de escritura exigen una cabecera propia (protección CSRF).
- Solo se pueden editar archivos Markdown dentro de los proyectos agregados; cualquier ruta fuera de ellas se rechaza. Los únicos archivos que no son Markdown que escribe la app son los del kit (hook, `.sdd.json`) y los `.htaccess`.
- Las carpetas con documentos de los proyectos llevan un `.htaccess` que bloquea el acceso web, para que Apache (XAMPP, hosting compartido) no sirva specs, decisiones ni avisos de revisión. En Nginx hay que bloquear esas rutas en la configuración del servidor.
- **Nunca secretos en los `.md`.** La app se niega a guardar un texto con algo que parezca una contraseña, clave de API, token, clave privada o cadena de conexión con credenciales, e indica la línea; los marcadores de ejemplo (`<tu-clave>`, `${DB_PASSWORD}`) y los nombres de variable sí se permiten. También revisa los `.md` ya escritos (por ejemplo, por una IA) y avisa con 🔑. El kit le prohíbe a la IA escribirlos y le dice qué hacer si encuentra uno: quitarlo y avisar de que hay que rotarlo, porque sigue en el historial de git.
- Producción, por defecto, **solo con autorización expresa**: el kit le indica a la IA que no suba a `pro` sin tu «sí» para ese push concreto ni use `--force`.
- Sin telemetría ni peticiones externas: la app funciona sin conexión.

## Solución de problemas

| Problema | Solución |
|---|---|
| «El puerto 4780 ya está en uso» | Seguramente la app ya está en marcha: abre `http://localhost:4780`. O arráncala con otro `PORT`. |
| El acceso directo no hace nada | Comprueba que Node.js está instalado y en el `PATH` (`node -v` en una terminal). Ejecuta `iniciar.bat` para ver los errores. |
| «Abrir en editor» no hace nada | Elige tu editor en **Ajustes** o escribe su comando (por ejemplo `cursor` o `code`). |
| Una spec no tiene estado o tiene uno incorrecto | Revisa que la celda de estado use uno de los ID configurados entre comillas invertidas, por ejemplo `` `in-progress` ``. |
| La IA no revisa mis cambios | Comprueba en **Configurar SDD** que el enlace de `AGENTS.md` está instalado; en Claude Code también puedes instalar el hook. O pídele explícitamente que revise `.sdd/review/`. |
| La IA responde en otro idioma | La regla de idioma está en `.skills/sdd/SKILL.md` y en el bloque de `AGENTS.md`. Reinstala el kit con el idioma correcto desde **Configurar SDD**. |
| Un proyecto muestra «SDD ↑» | Su kit es de una versión anterior: abre el proyecto y pulsa **Actualizar**. |
| Los `.md` se ven desde el navegador | Pulsa **Proteger** en **Configurar SDD**. Si sigue devolviendo 200, Apache ignora los `.htaccess` (`AllowOverride None`) o el servidor es Nginx: bloquea las rutas en su configuración. |
| La IA vuelve a preguntar por el proyecto en cada sesión | Falta `.sdd/proyecto.md` o su tabla «Onboarding» tiene pasos pendientes (**Configurar SDD** los muestra): pídele que termine el onboarding. |
| «No se ha guardado: parece que hay una contraseña, clave o token» | El texto tiene algo con pinta de secreto en la línea indicada. Escribe solo el nombre de la variable (`DB_PASSWORD` en `.env`) o un marcador (`<tu-clave>`). |
| Aparece 🔑 en un proyecto | Un `.md` contiene un posible secreto: quítalo y, si ya se subió a git, rota esa clave. |
| Un archivo de `docs/architecture` no aparece como ADR | Solo se consideran decisiones los archivos con ID en el nombre (`ADR-001-…`, `0001-…`); renómbralo o créalo desde la app. |
| Un plugin de terceros aparece como proyecto | La búsqueda deja sin marcar las carpetas que solo tienen `AGENTS.md` o `.git`; desmarca cualquier otra que no quieras. |

## Versiones y changelog

MD SDD Hub usa [versionado semántico](https://semver.org/lang/es/): `MAYOR.MENOR.PARCHE`.

**Cada versión debe documentar sus nuevas funcionalidades.** En cada versión:

1. Sube `version` en `package.json`.
2. Añade la versión, la fecha y los cambios a [`CHANGELOG.md`](CHANGELOG.md) y [`CHANGELOG.es.md`](CHANGELOG.es.md).
3. Actualiza este README y [`README.md`](README.md) con cada funcionalidad nueva o modificada, y la línea «Versión actual» del principio.
4. Si cambia el kit (`kit/`), sube `KIT_VERSION` en `lib/scan.js` y la versión (`version:` y la marca `sdd-hub vN`) de `kit/es/skill/SKILL.md`, `kit/en/skill/SKILL.md` y los dos `claude-skill.md`, y mantén sincronizados el kit en español y en inglés.
5. Haz el commit y etiqueta la versión como `vX.Y.Z`.

La misma lista está en [`AGENTS.md`](AGENTS.md), para que los agentes de IA que trabajen en este repositorio también la sigan. La versión actual se muestra en la barra lateral de la app y en **Ajustes**.

## Contribuir

- Sin dependencias: biblioteca estándar de Node.js en el servidor y HTML/CSS/JS sin frameworks en el navegador.
- Envuelve cada texto de la interfaz en `t('Texto en español')` y añade su traducción al inglés en `public/i18n.js`. Después ejecuta:

  ```bash
  node tools/i18n-check.js
  ```

  Lista las traducciones que faltan y las que sobran.
- Los textos definidos en tablas de datos (como los nombres de los tipos de documento) se marcan con `tx('…')` para que el comprobador los encuentre, y se traducen después con `t()`.
- Los mensajes del servidor que se muestran en la interfaz van en `lib/i18n.js` (español e inglés).
- Sigue la lista de versión anterior en cada cambio que añada o modifique funcionalidades.
