import { useState } from "react";
import { store, useStore } from "../store";
import { runProject, stopProject } from "../actions";

export default function OutputPanel() {
  const output = useStore((s) => s.output);
  const problems = useStore((s) => s.problems);
  const running = useStore((s) => s.running);
  const [tab, setTab] = useState<"console" | "problems">("console");

  return (
    <div className="output-panel">
      <div className="output-head">
        <button
          className={`side-tab ${tab === "console" ? "active" : ""}`}
          style={{ height: 28, borderBottom: "none" }}
          onClick={() => setTab("console")}
        >
          Console
        </button>
        <button
          className={`side-tab ${tab === "problems" ? "active" : ""}`}
          style={{ height: 28, borderBottom: "none" }}
          onClick={() => setTab("problems")}
        >
          Problemas {problems.length > 0 ? `(${problems.length})` : ""}
        </button>
        <span className="grow" />
        {running ? (
          <button className="btn sm danger" onClick={() => void stopProject()}>
            Parar
          </button>
        ) : (
          <button className="btn sm ok" onClick={() => void runProject()}>
            Rodar
          </button>
        )}
        <button className="btn sm" onClick={() => store.setState({ output: [] })}>
          Limpar
        </button>
      </div>
      {tab === "console" ? (
        <div className="output-body">
          {output.length === 0 ? (
            <div className="output-line sys">
              Aguardando. Clique em "Rodar" (ou F5) para compilar e executar o aplicativo.
            </div>
          ) : (
            output.map((l, i) => (
              <div key={i} className={`output-line ${l.stream === "err" ? "err" : l.stream === "sys" ? "sys" : ""}`}>
                {l.line}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="problems-list">
          {problems.length === 0 ? (
            <div className="problem-row">
              <span className="msg" style={{ color: "var(--text-3)" }}>
                Nenhum problema encontrado no modelo.
              </span>
            </div>
          ) : (
            problems.map((p, i) => (
              <div
                className={`problem-row ${p.severity}`}
                key={i}
                style={{ cursor: p.componentId ? "pointer" : "default" }}
                onClick={() => {
                  if (p.componentId) {
                    store.setState({
                      selectedComponentId: p.componentId,
                      rightTab: "props",
                      centerTab: "design",
                      designerWindowId: p.windowId ?? store.getState().designerWindowId,
                    });
                  }
                }}
              >
                <span className="sev">{p.severity === "error" ? "erro" : "aviso"}</span>
                <span className="msg">{p.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
