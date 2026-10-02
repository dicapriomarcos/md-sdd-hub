# SDD Hub

[English](README.md) · **Español**

Panel local para controlar las **specs SDD** y todos los **.md** de tus proyectos: los que escribes tú y los que crea o modifica la IA (Claude Code, Codex, Gemini…).

- **Sin dependencias ni base de datos.** Node.js ≥ 18 y nada más: no hay `npm install`.
- **Solo local.** El servidor escucha en `127.0.0.1:4780`; tus proyectos no salen del ordenador.
- **Lee y escribe directamente los `.md`** de cada proyecto. La configuración de SDD Hub (carpetas agregadas y ajustes) está en `data/config.json`.
- **Interfaz en español e inglés.** Se detecta el idioma del navegador; si eliges uno a mano (selector ES/EN o Ajustes), se guarda. Los `.md` de los proyectos no se traducen.

## Arrancar

Haz doble clic en `iniciar.bat`, o ejecuta:

```bash
node server.js --open
```

Se abre `http://localhost:4780`. Para usar otro puerto: `set PORT=5000` antes de arrancar.

En Windows, **Ajustes → Crear acceso directo en el escritorio** crea un icono que arranca SDD Hub sin ventana (`lanzar.vbs`) y abre el navegador; si ya está en marcha, solo abre el navegador. Para pararlo: **Ajustes → Apagar SDD Hub**.

Al **agregar una carpeta**, la opción «Preparar el proyecto para SDD Hub» (marcada por defecto) añade a `AGENTS.md` un enlace a las instrucciones de cómo deben escribirse las specs e instala esas instrucciones (`.claude/skills/sdd-spec`).

## Qué hace

| Vista | Para qué |
|---|---|
| **Panel** | Specs activas, en curso, alertas SDD, `.md` sin leer y revisiones pendientes de la IA en todos tus proyectos. |
| **Cambios en .md** | Todos los Markdown ordenados por fecha. Un punto azul indica que han cambiado desde la última vez que los abriste: así ves qué ha escrito la IA. |
| **Tablero** | Kanban por estado. Si arrastras una tarjeta, se edita el `.md` (estado, fecha, historial y registro). |
| **Proyecto → Specs** | Lista filtrable con estado, progreso de tareas y criterios, y alertas. |
| **Proyecto → Documentos** | Árbol con todos los `.md`: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.codex/`, `.claude/`, `docs/`… Puedes verlos y editarlos. |
| **Proyecto → Skills** | Skills del proyecto (`.claude/skills`, `.agents`, `.gemini`, `.codex`), comandos y subagentes. Permite crear skills nuevas, copiarlas de otro proyecto o desde `~/.claude/skills` e instalar `sdd-spec`. |
| **Proyecto → Revisiones IA** | Cambios que has hecho desde SDD Hub pendientes de revisar por la IA y la respuesta de la IA a los ya revisados. |
| **Proyecto → Configurar SDD** | Instala el kit SDD Hub y regenera el registro de specs. |

### Alertas SDD

- Spec sin estado o con un estado no reconocido.
- Spec `in-progress` sin cambios desde hace N días (configurable).
- Todas las casillas marcadas pero sin pasar a `verified`.
- Casillas marcadas con la spec aún en `draft`, `review` o `approved`.
- Spec `verified` o `released` con casillas pendientes.
- Estado distinto al del registro (`README.md` de la carpeta de specs).
- Dependencia hacia una spec que no existe.

## El kit SDD Hub (por proyecto)

En **Proyecto → Configurar SDD → Instalar**:

| Archivo | Para qué |
|---|---|
| `.claude/skills/sdd-spec/SKILL.md` | Define el formato exacto de las specs y su ciclo de vida. Claude Code la carga sola. |
| Bloque en `AGENTS.md` | Hace que Codex, Gemini y otros agentes sigan la misma skill. |
| `.claude/hooks/sdd-review.js` + `.claude/settings.local.json` | Hook `UserPromptSubmit`/`SessionStart`: avisa a Claude de tus cambios pendientes de revisión. |
| `.sdd.json` | Manifiesto: carpeta de specs, documento SDD y prefijo de ID. |
| `docs/specs/000-TEMPLATE.md` | Plantilla canónica. |

### Formato canónico (resumen)

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
| Dependencias | SPEC-007 |

## 7. Criterios de aceptación
- [ ] AC-01 · …

## 9. Plan de tareas
- [x] T-01 · …

## Historial
| Fecha | Estado | Nota |
|---|---|---|
```

Estados: `draft` → `review` → `approved` → `in-progress` → `verified` → `released`, más `superseded`.

También se leen, en modo «mejor esfuerzo», specs de **Spec Kit** (`.specify/specs/NNN-*/`), **Kiro** (`.kiro/specs/*/`) y **OpenSpec** (`openspec/changes/*/`). Si no declaran estado, se deduce de los archivos y las casillas.

## Bucle de revisión con la IA

1. Editas un `.md` desde SDD Hub (texto, estado o casillas).
2. SDD Hub crea o amplía `.sdd/review/<archivo>.md` con el diff.
3. Si el hook está instalado, en tu siguiente mensaje Claude Code recibe el aviso. Si no lo está, dile «revisa los cambios pendientes».
4. La IA revisa el cambio (sección 7 de la skill), ajusta la spec o el código, escribe «## Resultado de la revisión» y mueve el aviso a `.sdd/review/hecho/`.
5. Ves su respuesta en **Revisiones IA**.

Puedes desactivarlo en **Ajustes → Avisar a la IA de mis cambios**.

## Estructura

```
server.js          servidor HTTP y API
lib/md-parse.js    análisis de Markdown: metadatos, estado, casillas, requisitos, historial
lib/scan.js        escaneo de proyectos, specs, documentos, skills y alertas
lib/write.js       escrituras: estado, casillas, nuevas specs, registro, kit, avisos de revisión
lib/diff.js        diff de líneas para los avisos
lib/i18n.js        textos del servidor (errores y alertas en es/en)
public/            interfaz (HTML, CSS y JS sin frameworks; md.js es el renderizador de Markdown)
public/i18n.js     traducción de la interfaz al inglés (la clave es el texto en español)
skill/             skill sdd-spec, plantilla y hook que se instalan en los proyectos
tools/             make-icon.js (genera el icono) e i18n-check.js (comprueba que no falten traducciones)
lanzar.vbs         lanzador sin ventana para el acceso directo de Windows
data/              configuración local (se crea al arrancar; no se sube a git)
```

## Seguridad

- Solo escucha en `127.0.0.1` y rechaza peticiones con otro `Host` (protección frente a DNS rebinding).
- Las peticiones de escritura exigen una cabecera propia (protección CSRF).
- Solo edita archivos Markdown dentro de las carpetas que has agregado.
