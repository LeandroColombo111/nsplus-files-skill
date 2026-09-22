---
name: nsplus-files
description: "Use when creating or reading .nsplus files for the NS+ Nassi-Shneiderman diagram tool (nsplusowner.github.io) used in ORT's Programación I course, instead of hand-guessing the format or reverse-engineering it again."
---

# NS+ (.nsplus) file format — read & write

This was fully reverse-engineered from the real tool's own JavaScript source
(`https://nsplusowner.github.io/NSPlus-0/js/...`, fetched via the browser's
network log) and then corrected against a real professor-produced reference
file. The working generator lives in this repo at `nsplus_lib/` — don't
re-derive the format from scratch, just use it.

**Caution**: avoid unnecessary visits to the live nsplusowner.github.io tool —
it belongs to an institution and excessive/repeated use could draw attention.
The whole point of this generator is that it's self-sufficient: it runs the
tool's own extracted source locally (via Node + jsdom), so there's no need to
open the live site for normal read/write work.

## The file format

A `.nsplus` file is JSON: `{"ver": 0.5, "data": "<encoded string>"}`.

`data` is: `reverse( base64( utf8-encode( JSON.stringify(innerProject) ) ) )`.

Decoding is the exact mirror: reverse the string, base64-decode, UTF-8 decode,
`JSON.parse`. This is literally the tool's own `DataConversor.fromJS(obj, true)`
/ `DataConversor.toJS(str, true)` (source in `nsplus_lib/js/XNS-editor/NSPUtils.js`).

`innerProject` looks like:
```json
{
  "name": "nombre_del_proyecto",
  "autor": "Anonimo",
  "comission": "Sin Curso",
  "diagrams": [
    { "id": "NSPDiagram-1", "theClass": "NombreClase", "name": "nombreMetodo", "code": "<raw HTML string>" }
  ],
  "meta": "W10="
}
```
Real professor/tool-produced files always include `autor` and `comission`
fields alongside `name`/`diagrams`/`meta` — the generator defaults them to
`"Anonimo"`/`"Sin Curso"` but accepts overrides in the spec.

`code` is the **raw innerHTML** of the editor's diagram container — literally
the same nested `<div>`/`<input>` structure the live web app builds with
`document.createElement`. There is no simpler intermediate JSON for the NS
body itself; the only reliable way to produce byte-for-byte compatible HTML
is to run the tool's own rendering code. That's what `nsplus_lib/nsplus.js`
does (via a small Node + jsdom sandbox), rather than hand-templating the HTML.

IMPORTANT — three things the pure declarative render does NOT give you by
itself (all handled by `nsplus.js`, see its comments for the "why"):

1. **"Real block" tagging**: statements need `type="..."`/`draggable="true"`
   set afterward, or they open in the live editor as flat/plain text instead
   of real colored, draggable blocks. The live editor only sets these
   interactively at drag-drop time.
2. **Nested statements wrapper**: any NESTED statement list (an `if`'s
   then/else, a loop body, a switch case, a try/catch/finally body) is wrapped
   in an extra inner `droppable="true"` `.statements` div (itself
   empty-padded, see next point) — discovered by diffing against a real
   reference file, not obvious from the declarative source alone.
3. **Empty-padding**: every statements list — the wrapped nested ones above,
   AND the top-level method body — gets a leading and trailing `empty`
   placeholder div (drop-target markers). A single-statement method body is
   `[empty, statement, empty]`; an empty else-branch is `[empty, empty]`.

Also: real local variable declarations are always added via the editor's
palette buttons (never via the declarative `localVars` field, which the live
UI never actually exercises), so they are always `draggable="true"` and are
often pre-initialized with a literal value (`int x ← 0`) instead of being
followed by a separate redundant assignment statement. Match that style: put
initial values in `localVars` (as `value`), not as a first `assignment`
statement.

## Repo layout

```
nsplus_lib/
  package.json          (needs "jsdom" as a dependency)
  nsplus.js              driver script — run this
  js/XNS-core/Enumeration.js       )
  js/XNS-core/ClassConstructor.js  )  verbatim copies of the real tool's
  js/XNS-core/DiagramObject.js     )  own source files — never edit these,
  js/XNS-core/BaseDiagram.js       )  they're what makes the generated HTML
  js/XNS-editor/XNSDiagramMaker.js )  byte-for-byte identical to what the
  js/XNS-editor/NSPUtils.js        )  live editor itself would produce
```

One-time setup: `cd nsplus_lib && npm install`.

## Usage

**Reading** any `.nsplus` file (your own, or a professor's reference file):
```bash
node nsplus_lib/nsplus.js read path/to/file.nsplus
```
This prints `{name, autor, comission, diagrams:[{id, theClass, name, code}], meta}`
— `code` is raw HTML; the readable text is inside `value="..."` attributes of
the `<input class="input-for-statement">` elements, in document order.
Grep/parse those to reconstruct the diagram's statements without ever opening
a browser.

**Writing** a new `.nsplus` from an NS design you already built (translate
your statement plan into this JSON, one entry per diagram/method). Top-level
spec fields: `name`, `autor` (optional, defaults `"Anonimo"`), `comission`
(optional, defaults `"Sin Curso"`), `diagrams`. Each diagram entry supports
`theClass`, `name`, `modifiers` (default `"public"`), `type` (return type,
default `"void"`), `parameters` (array of `{"type":..,"name":..}`, optional —
rendered into the method signature's parentheses, comma-separated),
`localVars` (array of `{"type":..,"name":..,"value":..,"isConstant":..}`,
optional — see below), and `statements`:

`localVars` entries: omit `value` for a bare declaration (`newVariable`/
`newConstant` builder), include `value` for a pre-initialized one
(`newInitializedVariable`/`newInitializedConstant` builder, e.g.
`{"type":"int","name":"indice","value":"0"}` → renders `int indice ← 0` as one
draggable block). Set `"isConstant": true` to use the constant builder
variant instead of the variable one. All local vars are marked
`draggable="true"` automatically, matching how the real editor's palette
buttons behave.

```bash
node nsplus_lib/nsplus.js write out.nsplus '{
  "name": "estadisticas_examenes_conducir",
  "autor": "Leandro",
  "comission": "Programacion 1",
  "diagrams": [
    {
      "theClass": "SedeDeLicencias",
      "name": "obtenerInforme",
      "modifiers": "public",
      "type": "Informe",
      "localVars": [ {"type":"double","name":"porcReprobados","value":"0"} ],
      "statements": [
        {"type":"assignment","data":{"variable":"porcReprobados","value":"porcentajeDeReprobados()"}},
        {"type":"return","data":{"value":"new Informe(porcReprobados, prom)"}}
      ]
    },
    {
      "theClass": "PuntoDeAtraque",
      "name": "engancharNave",
      "modifiers": "public",
      "type": "void",
      "parameters": [{"type":"Nave","name":"nave"}],
      "statements": [
        {"type":"assignment","data":{"variable":"this.nave","value":"nave"}}
      ]
    }
  ]
}'
```
Open the resulting `.nsplus` file directly at the course's NS+ URL (File →
Abrir/Importar) — it will load like any file the tool itself saved.

For multiple diagrams (multiple methods) in one project file, just add more
entries to the `diagrams` array — each becomes its own tab in the editor.

## Statement type reference (the `"type"`/`"data"` pairs)

These are exactly the tool's own internal statement vocabulary. Use them to
translate an already-designed NS diagram into the JSON `statements` array:

- `assignment`: `{"variable": "x", "value": "expr"}` → `x ← expr`
- `return`: `{"value": "expr"}` → `return expr`
- `if`: `{"condition": "cond", "then": [...statements], "else": [...statements]}` (omit `else`/leave `[]` for no-else)
- `while`: `{"condition": "cond", "statements": [...statements]}` (pre-test loop, "Mientras")
- `dowhile`: `{"condition": "cond", "statements": [...statements]}` (post-test loop, "Hacer...mientras")
- `for`: `{"control": {"variable": "i", "start": "0", "stop": "n", "step": "1"}, "statements": [...]}`
- `foreach`: `{"control": {"class": "Tipo", "variable": "x", "collection": "coleccion"}, "statements": [...]}`
- `switch`: `{"expression": "var", "options": [{"case": "valor", "statements": [...]}, ..., {"case": "default", "statements": [...]}]}`
- `call`: `{"statement": "metodo(params)"}` (statement with no assigned result — also handy for pseudocode lines like `"imprimir x"`)
- `comment`: `{"content": "texto del comentario"}`
- `block`: `{"content": "instrucción libre"}` (freeform statement line, e.g. `"indice++"`)
- `input`: `{"variable": "x"}` (read/scanner-style input)
- `output`: `{"message": "expr"}` (print/console-style output)
- `break`: `{}`
- `throw`: `{"value": "expr"}`, `try`/`catch`/`finally`: `{"statements": [...]}` (`catch` also takes `"exception"` and `"variable"`)

## Verifying a generated file (recommended before opening it in NS+)

```bash
node nsplus_lib/nsplus.js read out.nsplus | python3 -c "
import json,sys,re
d = json.load(sys.stdin)
for diag in d['diagrams']:
    matches = list(re.finditer(r'class=\"([a-zA-Z0-9_ -]+)\"[^>]*type=\"([a-zA-Z]+)\"[^>]*draggable=\"true\"', diag['code']))
    print(diag['theClass'], diag['name'], '->', len(matches), 'tagged statements')
"
```
If a diagram shows 0 tagged statements, something in `tagStatements` (inside
`nsplus.js`) failed to find its container — check the `:scope > ...` selector
against that statement type's actual nesting (documented in the comments of
`js/XNS-editor/XNSDiagramMaker.js`'s builder functions).

Also worth spot-checking against a real reference file when in doubt: any
nested statement list should be wrapped as `<parent> > .statements[droppable] >
[.empty, ...tagged items, .empty]`, and the top-level method body should be
`.statements[droppable] > [.empty, ...tagged items, .empty]` (no extra wrapper
at the top level — only nested lists get the double wrapping).

## History / known-fixed issues

- Statements without `draggable="true"`/`type="..."` (opened as flat static
  text instead of real "bloques") — fixed by `tagStatements` in `nsplus.js`.
- Local variable declarations that were bare/non-draggable/non-initialized —
  real files always add locals via palette buttons (always `draggable="true"`,
  often pre-initialized) — fixed in `buildDiagramCode`.
- Nested statement lists rendered flat instead of wrapped in an inner
  `droppable="true"` `.statements` div — fixed by `wrapAsNestedStatements`.
- Missing leading/trailing `empty` drop-target placeholders — fixed by
  `padWithEmpties`.
- Missing `autor`/`comission` fields in the outer project object — fixed in
  `buildNsplusFile`.

All of the above were found and fixed by diffing generated output against a
real professor-authored `.nsplus` file. If future generated files still look
subtly "off" compared to a real one, get another real reference file and diff
structurally (`nsplus.js read` both, compare the `code` HTML) rather than
guessing from the source alone — some behaviors (like the nested wrapper) are
apparently artifacts of interactive editor use that aren't obvious from the
declarative renderer's source.
