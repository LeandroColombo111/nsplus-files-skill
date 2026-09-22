// nsplus.js — read/write .nsplus files (NS+ tool by nsplusowner.github.io) using the tool's OWN
// reverse-engineered source (js/XNS-core, js/XNS-editor) run inside a jsdom sandbox.
//
// Usage:
//   node nsplus.js write output.nsplus '<json project spec>'
//   node nsplus.js read input.nsplus
//
// Project spec for "write" (see SKILL.md for full statement-type reference):
// {
//   "name": "estadisticas_examenes_conducir",
//   "diagrams": [
//     {
//       "theClass": "SedeDeLicencias",
//       "name": "obtenerInforme",
//       "modifiers": "public",
//       "type": "Informe",
//       "localVars": [ {"type":"double","name":"porcReprobados"} ],
//       "statements": [
//         {"type":"assignment","data":{"variable":"double porcReprobados","value":"porcentajeDeReprobados()"}},
//         {"type":"return","data":{"value":"new Informe(porcReprobados, prom)"}}
//       ]
//     }
//   ]
// }

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function buildSandbox() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { runScripts: "dangerously" });
  const { window } = dom;
  // atob/btoa polyfill (jsdom's window has them, but let's be sure)
  if (!window.btoa) {
    window.btoa = (str) => Buffer.from(str, "binary").toString("base64");
  }
  if (!window.atob) {
    window.atob = (b64) => Buffer.from(b64, "base64").toString("binary");
  }
  window.html2canvas = () => Promise.resolve({ toDataURL: () => "" }); // unused stub

  const files = [
    "js/XNS-core/Enumeration.js",
    "js/XNS-core/ClassConstructor.js",
    "js/XNS-core/DiagramObject.js",
    "js/XNS-core/BaseDiagram.js",
    "js/XNS-editor/XNSDiagramMaker.js",
    "js/XNS-editor/NSPUtils.js",
  ];
  for (const f of files) {
    const code = fs.readFileSync(path.join(__dirname, f), "utf8");
    window.eval(code);
  }
  // One shared diagramMaker instance per file build, exactly like NSPEditor.js's
  // top-level `var diagramMaker = new XNSDiagramMaker();` — this is what gives
  // ids their incrementing xnsd-...-N suffixes.
  window.eval("var diagramMaker = new XNSDiagramMaker();");
  return window;
}

// ---- "empty" drop-target padding ----
// Real (professor/tool-produced) files pad every statements list with an
// "empty" placeholder div before the first real statement and after the
// last one (confirmed against a real professor .nsplus: a single-statement
// method body is [empty, statement, empty], and an empty then/else branch is
// [empty, empty]). These are pure drop-target markers for the live editor —
// harmless if skipped — but matching them makes generated files visually and
// structurally indistinguishable from ones built by hand in the tool.
function padWithEmpties(win, containerEl) {
  if (!containerEl) return;
  containerEl.insertBefore(win.diagramMaker.newBlock("empty", undefined, "true"), containerEl.firstChild);
  containerEl.appendChild(win.diagramMaker.newBlock("empty", undefined, "true"));
}

// ---- nested "statements" wrapper ----
// Nested statement lists (if's then/else, while/for/foreach/dowhile bodies,
// switch cases, try/catch/finally bodies) are NOT rendered flat by
// appendBlockOrEmpty() the way the pure declarative source suggests — real
// files show an extra inner droppable="true" .statements div wrapping the
// actual (possibly zero) statements, itself padded with empties. Concretely,
// for a `then` div: then > statements(droppable=true) > [empty, ...items,
// empty]. This wraps whatever is currently inside `containerEl` (which the
// plain render() already populated flat) into that inner div.
function wrapAsNestedStatements(win, containerEl) {
  if (!containerEl) return;
  // Keep only real statements — drop any pre-existing "empty" placeholder
  // (appendBlockOrEmpty's own else-branch filler); padWithEmpties below
  // supplies fresh ones around whatever real content remains.
  const realStatements = Array.from(containerEl.children).filter((c) => c.className !== "empty");
  const inner = win.diagramMaker.newBlock("statements", undefined, true);
  realStatements.forEach((node) => inner.appendChild(node)); // appendChild moves nodes, detaching them from containerEl
  padWithEmpties(win, inner);
  containerEl.innerHTML = ""; // remove anything left behind (e.g. the old "empty" filler)
  containerEl.appendChild(inner);
}

// ---- "real block" tagging ----
// diagramMaker.render() builds the pure declarative HTML but does NOT set
// `type="..."`/`draggable="true"` on each statement — those are only added by
// the live editor at drag-and-drop time (renderStatement()/makeDraggable() in
// NSPEditor.js), driven by which palette button was dragged. We know that
// "type" already (it's the JSON we built from), so tag the DOM ourselves,
// walking the same statements arrays we handed to the builder. This is what
// makes each statement look/behave like a real "bloque" once the file is
// opened (the live editor's own CSS/JS keys off draggable="true"/[type=...],
// and reAssignDragEvents() on file-load auto-wires drag handling for any
// element already marked draggable="true" in the loaded HTML).
// `nested` is true for any statements list that lives inside a then/else/
// loop-body/case (needs the extra .statements wrapper); false for the
// top-level method body (handled separately in buildDiagramCode).
function tagStatements(win, containerEl, statementsArr, nested) {
  if (!containerEl) return;
  const statements = statementsArr || [];
  const children = Array.from(containerEl.children).filter((c) => c.className !== "empty");
  statements.forEach((stmt, i) => {
    const el = children[i];
    if (!el) return;
    el.setAttribute("type", stmt.type);
    el.setAttribute("draggable", "true");
    const data = stmt.data || {};
    switch (stmt.type) {
      case "if":
      case "conditional":
        tagStatements(win, el.querySelector(":scope > .body > .then"), data.then || [], true);
        tagStatements(win, el.querySelector(":scope > .body > .else"), data.else || [], true);
        break;
      case "while":
      case "dowhile":
      case "for":
      case "foreach":
      case "try":
      case "catch":
      case "finally":
        tagStatements(win, el.querySelector(":scope > .container > .statements"), data.statements || [], true);
        break;
      case "switch": {
        const cases = el.querySelectorAll(":scope > .body > .case");
        (data.options || []).forEach((opt, ci) => {
          const caseEl = cases[ci];
          if (caseEl) tagStatements(win, caseEl.querySelector(":scope > .statements"), opt.statements || [], true);
        });
        break;
      }
      default:
        break;
    }
  });
  if (nested) wrapAsNestedStatements(win, containerEl);
}

// ---- diagram code (HTML) generation ----
// definition: { declaration: {class,modifiers,type,name}, localVars: [...], statements: [...] }
// (mirrors appendDiagram()/diagramMaker.render() in the real tool's NSPEditor.js)
function buildDiagramCode(win, definition, parameters, localVars) {
  const container = win.document.createElement("div");
  // localVars are NOT built via the declarative "localVars" field (that path
  // exists in the source but the live editor never actually uses it — real
  // files always show local declarations added via the palette buttons,
  // draggable="true", often pre-initialized). So render with localVars: []
  // and build them ourselves below, the same way the buttons do.
  // Key order matters: render() iterates definition's own keys in order to
  // append declaration / local-variable-declaration / statements as siblings
  // in that sequence, so localVars must sit between declaration and statements.
  const json = definition.statements
    ? { declaration: definition.declaration, localVars: [], statements: definition.statements }
    : { statements: [definition], localVars: [] };
  win.diagramMaker.render(container, json);

  // Method parameters: same story — only the empty .method-parameters
  // container is declarative; real parameters are appended via the
  // "newParameter" button handler. Mirror handleClickButtonDiagram() here.
  if (parameters && parameters.length) {
    const paramsContainer = container.querySelector(".method-parameters");
    parameters.forEach((p) => {
      const obj = win.diagramMaker.newParameter({ type: p.type, name: p.name });
      if (paramsContainer.hasChildNodes()) {
        obj.innerHTML = " , " + obj.innerHTML;
      }
      paramsContainer.appendChild(obj);
    });
  }

  // Local variables: build each one the way a click on its palette button
  // would (newVariable/newConstant for a bare declaration, newInitializedVariable/
  // newInitializedConstant when a "value" is given), and mark draggable="true"
  // like handleClickButtonDiagram() does unconditionally for all of these.
  if (localVars && localVars.length) {
    const localVarsContainer = container.querySelector(".local-variable-declaration");
    localVars.forEach((v) => {
      const hasValue = typeof v.value !== "undefined" && v.value !== null;
      const builderName = hasValue
        ? v.isConstant
          ? "newInitializedConstant"
          : "newInitializedVariable"
        : v.isConstant
        ? "newConstant"
        : "newVariable";
      const obj = win.diagramMaker[builderName]({ type: v.type, name: v.name, value: v.value });
      obj.setAttribute("draggable", "true");
      localVarsContainer.appendChild(obj);
    });
  }

  const topStatements = container.querySelector(":scope > .statements");
  tagStatements(win, topStatements, definition.statements || [], false);
  padWithEmpties(win, topStatements);
  return container.innerHTML;
}

// ---- full .nsplus file assembly ----
function buildNsplusFile(win, spec) {
  const diagrams = spec.diagrams.map((d, idx) => {
    const definition = {
      declaration: {
        class: d.theClass,
        modifiers: d.modifiers || "public",
        type: d.type || "void",
        name: d.name,
      },
      statements: d.statements || [],
    };
    return {
      id: "NSPDiagram-" + (idx + 1),
      theClass: d.theClass,
      name: d.name,
      code: buildDiagramCode(win, definition, d.parameters, d.localVars),
    };
  });
  const obj = {
    name: spec.name || "Proyecto sin título",
    autor: spec.autor || "Anonimo",
    comission: spec.comission || "Sin Curso",
    diagrams: diagrams,
    meta: win.btoa("[]"),
  };
  const data = win.DataConversor.fromJS(obj, true); // reversed base64(JSON)
  return JSON.stringify({ ver: 0.5, data: data });
}

// ---- reading ----
function readNsplusFile(win, fileText) {
  const outer = JSON.parse(fileText);
  const ver = outer["ver"] || 0.1;
  if (ver > 0.1) {
    return win.DataConversor.toJS(outer["data"], true);
  }
  return outer; // ver 0.1 files are plain JSON, no wrapping
}

// ---- CLI ----
function main() {
  const [, , cmd, filePath, jsonArgOrOut] = process.argv;
  const win = buildSandbox();
  if (cmd === "write") {
    const spec = JSON.parse(jsonArgOrOut);
    const out = buildNsplusFile(win, spec);
    fs.writeFileSync(filePath, out, "utf8");
    console.log("Wrote " + filePath);
  } else if (cmd === "read") {
    const text = fs.readFileSync(filePath, "utf8");
    const obj = readNsplusFile(win, text);
    console.log(JSON.stringify(obj, null, 2));
  } else {
    console.error("Usage: node nsplus.js write <out.nsplus> '<json spec>'  |  node nsplus.js read <in.nsplus>");
    process.exit(1);
  }
}

module.exports = { buildSandbox, buildDiagramCode, buildNsplusFile, readNsplusFile };

if (require.main === module) {
  main();
}
