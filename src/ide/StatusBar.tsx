import { findWindow, javaClassName } from "../model-ops";
import { store, useStore } from "../store";
import { baseName } from "../api";

export default function StatusBar() {
  const project = useStore((s) => s.project);
  const model = useStore((s) => s.model);
  const designerWindowId = useStore((s) => s.designerWindowId);
  const selected = useStore((s) => s.selectedComponentId);
  const running = useStore((s) => s.running);
  const problems = useStore((s) => s.problems);

  const win = findWindow(model, designerWindowId);
  const errors = problems.filter((p) => p.severity === "error").length;
  const warnings = problems.length - errors;

  return (
    <footer className="statusbar">
      <span className="cell">
        <span className={`status-dot ${running ? "run" : ""} ${errors > 0 ? "err" : ""}`} />
        {running ? "Executando" : errors > 0 ? `${errors} problema(s)` : "Pronto"}
      </span>
      {win ? (
        <button
          className="cell dim"
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          onClick={() => store.setState({ centerTab: "design" })}
          title="Ir para o designer"
        >
          {win.title} · {win.components.length} componentes
        </button>
      ) : null}
      {selected && win ? (
        <span className="cell dim">
          {selected} selecionado
        </span>
      ) : null}
      <span className="grow" />
      {warnings > 0 ? <span className="cell dim">{warnings} aviso(s)</span> : null}
      <button
        className="cell dim"
        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
        onClick={() => store.setState({ rightTab: "connections" })}
      >
        {model.connections.length} {model.connections.length === 1 ? "conexão" : "conexões"} ·{" "}
        {model.database.tables.length} {model.database.tables.length === 1 ? "tabela" : "tabelas"}
      </button>
      <span className="cell dim">{model.packageName} · {javaClassName(designerWindowId || "janela")}.java</span>
      <span className="cell dim">{project?.path.replace(/^(.{0,42}).*/, "$1...") ?? ""}</span>
      <button
        className="cell dim"
        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
        onClick={() => store.setState({ leftTab: "files" })}
      >
        {baseName(project?.path ?? "")}
      </button>
    </footer>
  );
}
