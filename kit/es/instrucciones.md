<!-- sdd-hub v4 · formato sdd-hub/1 · lang es -->

# Instrucciones SDD (formato MD SDD Hub)

> Instrucciones para cualquier agente de IA (Codex, Claude Code, Gemini, Cursor, Copilot…) y para las personas del equipo. Las instala y actualiza MD SDD Hub: si las cambias a mano, se sobrescribirán en la próxima actualización. Las normas propias del proyecto van en `AGENTS.md`.

Este proyecto sigue desarrollo dirigido por especificaciones. Los documentos los lee una herramienta (MD SDD Hub) que analiza los archivos de forma literal, así que **el formato de este documento es obligatorio**: no inventes claves, secciones alternativas ni otros nombres de estado.

## Idioma

- **Responde, escribe y habla siempre en español**: en el chat con la persona, en los documentos (specs, decisiones, fixes, historial, avisos de revisión), en los comentarios del código y en los mensajes de commit. Aunque te escriban en otro idioma o el código esté en otro idioma, mantén el español salvo que la persona pida expresamente otra cosa.
- **Los nombres de archivo `.md` van en español**, sin tildes ni eñes (por ejemplo `SPEC-038-exportar-informes-en-pdf.md`).
- Los identificadores técnicos no se traducen: estados (`draft`, `in-progress`…), prefijos (`SPEC`, `ADR`…), `FR-NN`, `AC-NN`, `T-NN`.

## 1. Tipos de documento

| Tipo | Para qué | Prefijo | Carpeta por defecto | Plantilla |
|---|---|---|---|---|
| **Feature** | Una característica de la aplicación: qué hace, requisitos, criterios y tareas | `SPEC` | `docs/specs/` | [plantillas/feature.md](plantillas/feature.md) |
| **Diseño** | Una decisión de diseño UX/UI: pantallas, flujos, componentes, estilos, textos, accesibilidad | `DES` | `docs/design/` | [plantillas/diseno.md](plantillas/diseno.md) |
| **Arquitectura** | Una decisión técnica (ADR): tecnologías, librerías, patrones, estructura de carpetas y clases, convenciones de código, contratos entre módulos | `ADR` | `docs/architecture/` | [plantillas/arquitectura.md](plantillas/arquitectura.md) |
| **Fix** | Una corrección importante: síntoma, causa raíz, solución y prevención | `FIX` | `docs/fixes/` | [plantillas/fix.md](plantillas/fix.md) |

Cuándo crear cada uno:

- **Feature**: funcionalidad nueva o cambio de comportamiento de alcance medio o alto.
- **Diseño**: cuando se decide algo de la interfaz que afecta a más de una pantalla o que hay que mantener en el tiempo (un patrón de componente, la navegación, el sistema visual, el tono de los textos).
- **Arquitectura**: al elegir o cambiar una tecnología o librería, un patrón, la estructura del código o una convención. Si al programar vas a contradecir un ADR `accepted`, no lo hagas en silencio: propón un ADR nuevo que lo sustituya.
- **Fix**: regresiones, incidentes en producción, errores con una causa raíz no obvia o cuando la persona lo pida. Los errores triviales no necesitan FIX.

Una feature puede citar las decisiones en las que se apoya (`ADR-003`, `DES-002`) y un fix la feature afectada (`SPEC-012`), en la fila `Dependencias` o `Relacionadas`.

## 2. Dónde vive cada cosa

- Lee primero `.sdd.json` en la raíz del proyecto, si existe. `dirs` indica la carpeta de cada tipo (`feature`, `design`, `architecture`, `fix`), `specsDir` la de las features, `sddDoc` el documento de diseño del sistema e `idPrefix` el prefijo de las features (por defecto `SPEC`). Si no existe, usa las carpetas por defecto de la tabla anterior.
- Un documento = un archivo: `<carpeta>/<PREFIJO>-NNN-slug.md`.
  - `NNN`: siguiente número libre de ese prefijo, con tres dígitos (`ADR-007`). Mira la carpeta y usa el mayor + 1. Nunca reutilices un número.
  - `slug`: en español, en minúsculas, sin tildes ni eñes, palabras separadas por guiones, unas 6 palabras como máximo (p. ej. `exportar-informes-en-pdf`).
- Plantilla: `<carpeta>/000-TEMPLATE.md` si existe; si no, la de `.sdd/plantillas/` para ese tipo.
- Registro: `<carpeta>/README.md`, con una tabla bajo `## Registro`.

## 3. Estructura obligatoria

Primera línea: `# <ID> · Título en lenguaje natural` (con el punto medio `·`).

Inmediatamente después, la tabla de metadatos de la plantilla, con sus claves exactas y en su orden. En las features:

```markdown
| Campo | Valor |
|---|---|
| Estado | `draft` |
| Autor | Quién lo redacta (persona o agente) |
| Propietario | Persona o rol responsable |
| Creada | 2026-01-31 |
| Actualizada | 2026-01-31 |
| Objetivo de release | Versión o «Por definir» |
| Dependencias | SPEC-003, ADR-002 o «Ninguna» |
```

Diseño y arquitectura usan `Relacionadas` en lugar de `Objetivo de release` y `Dependencias`; los fixes añaden `Gravedad` (Alta / Media / Baja).

Reglas de los metadatos:

- `Estado` contiene **solo** el estado entre comillas invertidas. Nada más en esa celda: los matices («solo fase 1», «bloqueada por X») van en el Historial.
- Fechas siempre en ISO `AAAA-MM-DD`.
- `Dependencias` / `Relacionadas`: IDs completos separados por comas, para que la herramienta pueda enlazarlos.

Secciones de una **feature** (encabezados `##` numerados; omite solo las que no apliquen y dilo):

1. `## 1. Resumen`
2. `## 2. Problema y evidencia`
3. `## 3. Objetivos`
4. `## 4. Fuera de alcance`
5. `## 5. Usuarios y permisos`
6. `## 6. Requisitos`: tabla `| ID | Requisito |` con IDs `FR-01`, `FR-02`… (y `NFR-01` para no funcionales).
7. `## 7. Criterios de aceptación`: **solo** casillas con este formato exacto:
   `- [ ] AC-01 · Descripción verificable`
8. `## 8. Diseño técnico`: arquitectura, datos, migraciones, API y UX (enlaza los ADR y DES aplicables).
9. `## 9. Plan de tareas`: **solo** casillas con este formato exacto:
   `- [ ] T-01 · Tarea concreta y pequeña`
10. `## 10. Riesgos y mitigaciones`
11. `## 11. Preguntas abiertas`

**Diseño y arquitectura**: Contexto, Decisión, Alternativas consideradas, Consecuencias y Reglas (para la interfaz o para el código). La sección de reglas es la más importante: normas concretas que la IA debe aplicar a partir de ahora.

**Fix**: Síntoma (con pasos para reproducir), Causa raíz, Solución, Prevención, Criterios de verificación (`AC-NN`) y Plan de tareas (`T-NN`).

Todos los tipos terminan con `## Historial`:

```markdown
## Historial

| Fecha | Estado | Nota |
|---|---|---|
| 2026-01-31 | `draft` | Creación |
```

Las casillas (`- [ ]` / `- [x]`) se reservan para `AC-NN` y `T-NN`. No uses casillas para otras listas: la herramienta las cuenta como progreso.

## 4. Ciclos de vida

**Features**

| Estado | Significado | Quién lo decide |
|---|---|---|
| `draft` | Propuesta incompleta, abierta a cambios | Agente o persona |
| `review` | Todas las secciones completas, lista para revisión | Agente o persona |
| `approved` | Autorizada para implementar | **Solo la persona usuaria** |
| `in-progress` | Implementación activa | Agente al empezar a programar |
| `verified` | Todas las `T-NN` y `AC-NN` marcadas y pruebas en verde | Agente, con evidencia |
| `released` | Desplegada y comprobada en producción | **Solo la persona usuaria** |
| `superseded` | Sustituida por otra spec o decisión | Agente o persona, enlazando la nueva |

**Diseño y arquitectura**

| Estado | Significado | Quién lo decide |
|---|---|---|
| `proposed` | Propuesta pendiente de decidir | Agente o persona |
| `accepted` | Decisión vigente: hay que respetarla al programar | **Solo la persona usuaria** |
| `rejected` | Descartada; se conserva para no volver a discutirla | **Solo la persona usuaria** |
| `deprecated` | Ya no aplica, sin sustituta | Agente o persona |
| `superseded` | Sustituida por otra decisión (enlázala) | Agente o persona |

**Fixes**

| Estado | Significado | Quién lo decide |
|---|---|---|
| `reported` | Error documentado, sin investigar | Agente o persona |
| `investigating` | Buscando la causa raíz | Agente |
| `in-progress` | Causa conocida, corrigiendo | Agente |
| `verified` | Corregido, criterios marcados y tests en verde | Agente, con evidencia |
| `released` | Corrección desplegada y comprobada | **Solo la persona usuaria** |

Reglas:

- Nunca pases nada a `approved`, `accepted`, `rejected` o `released` por tu cuenta: propónlo y espera confirmación.
- No empieces a programar una funcionalidad de alcance medio o alto sin una spec `approved`. Si no existe, créala en `draft`, complétala, pásala a `review` y pide aprobación.
- Antes de programar, lee los ADR y DES en `accepted` que afecten a lo que vas a tocar y cumple sus reglas.
- Para pasar a `verified`, todas las casillas deben estar marcadas (salvo las tachadas) y las pruebas relevantes deben pasar. Indica en el Historial qué se ejecutó.
- Si cambia el alcance, no borres casillas: táchalas (`- [ ] ~~T-04 · …~~ (descartada: motivo)`) y añade las nuevas al final con el siguiente número.

## 5. Al cambiar el estado (siempre los cuatro pasos)

1. Cambia la celda `Estado`.
2. Pon la fecha de hoy en `Actualizada`.
3. Añade una fila al final de `## Historial`: `| AAAA-MM-DD | \`nuevo-estado\` | Qué ha pasado y por qué |`.
4. Actualiza la fila del documento en el `README.md` de su carpeta (estado y fecha).

## 6. Durante la implementación

- Marca cada `T-NN` como `[x]` en cuanto la termines, no al final.
- Marca un `AC-NN` solo cuando lo hayas comprobado (test, revisión manual descrita o captura).
- Si descubres trabajo nuevo, añádelo como `T-NN` antes de hacerlo.
- Si tomas una decisión de arquitectura o de diseño por el camino, regístrala como ADR o DES en `proposed` y menciónala a la persona.
- Al terminar la sesión, deja en el Historial una fila con el avance si el estado no cambió (repite el estado actual).

## 7. Registro (`README.md` de cada carpeta)

```markdown
## Registro

| ID | Título | Estado | Propietario | Última actualización |
|---|---|---|---|---|
| [SPEC-001](SPEC-001-slug.md) | Título | `draft` | Propietario | 2026-01-31 |
```

Una fila por documento, ordenadas por ID. Al crear un documento, añade su fila. El estado del registro debe coincidir siempre con el del documento: MD SDD Hub marca las diferencias como alerta.

## 8. Cambios hechos por la persona desde MD SDD Hub (revisión obligatoria)

Cuando la persona edita un `.md` desde MD SDD Hub (texto, estado o casillas), la app deja un aviso con el diff en `.sdd/review/<archivo>.md`. Si tu herramienta tiene instalado el hook de MD SDD Hub (Claude Code), recibirás además un recordatorio automático al inicio de cada mensaje mientras queden avisos; si no, compruébalo tú al empezar.

Procedimiento, al empezar a trabajar en el proyecto y siempre que haya avisos:

1. Lista `.sdd/review/*.md` (sin entrar en `.sdd/review/hecho/`). Si no hay, continúa normalmente.
2. Por cada aviso, lee los diffs y el archivo completo **en su estado actual**. Interpreta la intención: requisitos nuevos o cambiados, criterios modificados, tareas añadidas, decisiones aceptadas o rechazadas, cambio de estado (`approved` o `accepted` significan luz verde; volver a `draft`, `review` o `proposed` significa parar).
3. Comprueba la coherencia con el resto del documento, con el código actual y con los documentos relacionados. Si el cambio invalida trabajo hecho, desmarca las `T-NN` / `AC-NN` afectadas y añade las tareas nuevas. Si se acepta un ADR o DES, revisa si el código existente lo cumple y propone las tareas necesarias.
4. Si algo es ambiguo o contradictorio, pregunta a la persona antes de tocar código.
5. Añade al Historial del documento: `| AAAA-MM-DD | \`estado-actual\` | Revisados cambios de la persona: resumen breve |`.
6. Añade al final del aviso una sección `## Resultado de la revisión` con qué has entendido, qué has cambiado (documento o código) y qué preguntas quedan abiertas.
7. Mueve el aviso a `.sdd/review/hecho/AAAA-MM-DD-HHMM-<nombre-original>.md`. MD SDD Hub mostrará tu resultado a la persona.

No implementes código derivado de un cambio si la spec no está en `approved` o `in-progress` (o la decisión en `accepted`): limítate a actualizar el documento y proponer el plan.
