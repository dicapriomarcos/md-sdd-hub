---
name: sdd-spec
description: Crea y mantiene las especificaciones SDD (Spec-Driven Development) de este proyecto en el formato que lee SDD Hub. Úsala siempre que el usuario pida crear, redactar, revisar, aprobar, implementar, verificar o cerrar una spec o funcionalidad ("crea una spec para…", "nueva especificación", "pasa la SPEC-012 a in-progress", "marca las tareas hechas", "actualiza el registro de specs"), y antes de empezar a programar cualquier funcionalidad de alcance medio o alto.
---

<!-- sdd-hub-skill v1 · formato sdd-hub/1 -->

# Especificaciones SDD (formato SDD Hub)

Este proyecto sigue desarrollo dirigido por especificaciones. Las specs se leen con una herramienta (SDD Hub) que analiza los archivos de forma literal, así que **el formato de este documento es obligatorio**: no inventes claves, secciones alternativas ni otros nombres de estado.

## 1. Dónde vive cada cosa

- Lee primero `.sdd.json` en la raíz del proyecto. `specsDir` indica la carpeta de specs (por defecto `docs/specs`), `sddDoc` el documento de diseño del sistema e `idPrefix` el prefijo de ID (por defecto `SPEC`).
- Una spec = un archivo: `<specsDir>/SPEC-NNN-slug-en-kebab.md`.
  - `NNN`: siguiente número libre, con tres dígitos (`SPEC-007`). Revisa la carpeta y usa el mayor existente + 1. Nunca reutilices un número.
  - `slug`: minúsculas, sin tildes ni eñes, palabras separadas por guiones, máximo ~6 palabras.
- Plantilla: `<specsDir>/000-TEMPLATE.md` si existe; si no, [template.md](template.md) de esta skill.
- Registro: `<specsDir>/README.md`, con una tabla bajo `## Registro`.

## 2. Estructura obligatoria de una spec

Primera línea: `# SPEC-NNN · Título en lenguaje natural` (con el punto medio `·`).

Inmediatamente después, la tabla de metadatos con **exactamente** estas claves y en este orden:

```markdown
| Campo | Valor |
|---|---|
| Estado | `draft` |
| Autor | Quién la redacta (persona o agente) |
| Propietario | Persona o rol responsable |
| Creada | 2026-01-31 |
| Actualizada | 2026-01-31 |
| Objetivo de release | Versión o «Por definir» |
| Dependencias | SPEC-003, SPEC-010 o «Ninguna» |
```

Reglas de los metadatos:

- `Estado` contiene **solo** el estado entre comillas invertidas. Nada más en esa celda: los matices («solo fase 1», «bloqueada por X») van en el Historial.
- Fechas siempre en ISO `AAAA-MM-DD`.
- `Dependencias`: IDs completos separados por comas, para que la herramienta pueda enlazarlos.

Secciones (encabezados `##` numerados; omite solo las que no apliquen y dilo):

1. `## 1. Resumen`
2. `## 2. Problema y evidencia`
3. `## 3. Objetivos`
4. `## 4. Fuera de alcance`
5. `## 5. Usuarios y permisos`
6. `## 6. Requisitos`: tabla `| ID | Requisito |` con IDs `FR-01`, `FR-02`… (y `NFR-01` para no funcionales).
7. `## 7. Criterios de aceptación`: **solo** casillas con este formato exacto:
   `- [ ] AC-01 · Descripción verificable`
8. `## 8. Diseño técnico`: arquitectura, datos, migraciones, API y UX.
9. `## 9. Plan de tareas`: **solo** casillas con este formato exacto:
   `- [ ] T-01 · Tarea concreta y pequeña`
10. `## 10. Riesgos y mitigaciones`
11. `## 11. Preguntas abiertas`
12. `## Historial`: tabla, la última sección del archivo:

```markdown
## Historial

| Fecha | Estado | Nota |
|---|---|---|
| 2026-01-31 | `draft` | Creación de la spec |
```

Las casillas (`- [ ]` / `- [x]`) se reservan para `AC-NN` y `T-NN`. No uses casillas para otras listas: la herramienta las cuenta como progreso.

## 3. Ciclo de vida

| Estado | Significado | Quién lo decide |
|---|---|---|
| `draft` | Propuesta incompleta, abierta a cambios | Agente o persona |
| `review` | Todas las secciones completas, lista para revisión | Agente o persona |
| `approved` | Autorizada para implementar | **Solo la persona usuaria** |
| `in-progress` | Implementación activa | Agente al empezar a programar |
| `verified` | Todas las `T-NN` y `AC-NN` marcadas y pruebas en verde | Agente, con evidencia |
| `released` | Desplegada y comprobada en producción | **Solo la persona usuaria** |
| `superseded` | Sustituida por otra spec o decisión | Agente o persona, enlazando la nueva |

Reglas:

- Nunca pases una spec a `approved` ni a `released` por tu cuenta: propónlo y espera confirmación.
- No empieces a programar una funcionalidad de alcance medio o alto sin una spec `approved`. Si no existe, créala en `draft`, complétala, pásala a `review` y pide aprobación.
- Para pasar a `verified`, todas las casillas deben estar marcadas (salvo las tachadas) y las pruebas relevantes deben pasar. Indica en el Historial qué se ejecutó.
- Si cambia el alcance, no borres casillas: táchalas (`- [ ] ~~T-04 · …~~ (descartada: motivo)`) y añade las nuevas al final con el siguiente número.

## 4. Al cambiar el estado (siempre los cuatro pasos)

1. Cambia la celda `Estado`.
2. Pon la fecha de hoy en `Actualizada`.
3. Añade una fila al final de `## Historial`: `| AAAA-MM-DD | \`nuevo-estado\` | Qué ha pasado y por qué |`.
4. Actualiza la fila de la spec en `<specsDir>/README.md` (estado y fecha).

## 5. Durante la implementación

- Marca cada `T-NN` como `[x]` en cuanto la termines, no al final.
- Marca un `AC-NN` solo cuando lo hayas comprobado (test, revisión manual descrita o captura).
- Si descubres trabajo nuevo, añádelo como `T-NN` antes de hacerlo.
- Al terminar la sesión, deja en el Historial una fila con el avance si el estado no cambió (repite el estado actual).

## 6. Registro (`README.md` de la carpeta de specs)

```markdown
## Registro

| ID | Título | Estado | Propietario | Última actualización |
|---|---|---|---|---|
| [SPEC-001](SPEC-001-slug.md) | Título | `draft` | Propietario | 2026-01-31 |
```

Una fila por spec, ordenadas por ID. Al crear una spec, añade su fila. El estado del registro debe coincidir siempre con el de la spec: SDD Hub marca las diferencias como alerta.

## 7. Cambios hechos por la persona desde SDD Hub (revisión obligatoria)

Cuando la persona edita un `.md` desde SDD Hub (texto, estado o casillas), la app deja un aviso con el diff en `.sdd/review/<archivo>.md`. Si el hook de SDD Hub está instalado, recibirás además un recordatorio automático al inicio de cada mensaje mientras queden avisos.

Procedimiento, al empezar a trabajar en el proyecto y siempre que haya avisos:

1. Lista `.sdd/review/*.md` (sin entrar en `.sdd/review/hecho/`). Si no hay, continúa normalmente.
2. Por cada aviso, lee los diffs y el archivo completo **en su estado actual**. Interpreta la intención: requisitos nuevos o cambiados, criterios modificados, tareas añadidas, cambio de estado (`approved` significa luz verde para implementar; volver a `draft` o `review` significa parar).
3. Comprueba la coherencia con el resto de la spec, con el código actual y con las specs dependientes. Si el cambio invalida trabajo hecho, desmarca las `T-NN` / `AC-NN` afectadas y añade las tareas nuevas.
4. Si algo es ambiguo o contradictorio, pregunta a la persona antes de tocar código.
5. Si el archivo es una spec, añade al Historial: `| AAAA-MM-DD | \`estado-actual\` | Revisados cambios de la persona: resumen breve |`.
6. Añade al final del aviso una sección `## Resultado de la revisión` con qué has entendido, qué has cambiado (spec o código) y qué preguntas quedan abiertas.
7. Mueve el aviso a `.sdd/review/hecho/AAAA-MM-DD-HHMM-<nombre-original>.md`. SDD Hub mostrará tu resultado a la persona.

No implementes código derivado de un cambio si la spec no está en `approved` o `in-progress`: limítate a actualizar la spec y proponer el plan.
