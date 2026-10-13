import { useEffect } from "react";
import { useState } from "react";
import { store, useStore } from "../store";
import { deleteComponent, goToStartScreen, redo, runProject, saveActiveFile, stopProject, undo } from "../actions";
import TitleBar from "./TitleBar";
import StatusBar from "./StatusBar";
import FilesPanel from "../panels/FilesPanel";
import PalettePanel from "../panels/PalettePanel";
import Designer from "../designer/Designer";
import EditorTabs from "../editor/EditorTabs";
import CodeEditor from "../editor/CodeEditor";
import PropertiesPanel from "../panels/PropertiesPanel";
import ConnectionsPanel from "../panels/ConnectionsPanel";
import DataPanel from "../panels/DataPanel";
import DatabasePanel from "../panels/DatabasePanel";
import OutputPanel from "../panels/OutputPanel";
import GuideModal from "../GuideModal";

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export default function IDE() {
  const centerTab = useStore((s) => s.centerTab);
  const leftTab = useStore((s) => s.leftTab);
  const rightTab = useStore((s) => s.rightTab);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = store.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveActiveFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "F5") {
        e.preventDefault();
        void (s.running ? stopProject() : runProject());
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        s.screen === "ide" &&
        s.centerTab === "design" &&
        s.selectedComponentId &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        deleteComponent(s.selectedComponentId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="ide">
      <TitleBar />
      <div className="ide-body">
        <aside className="ide-side">
          <div className="side-tabs" role="tablist" aria-label="Painéis laterais">
            <button
              className={`side-tab ${leftTab === "files" ? "active" : ""}`}
              onClick={() => store.setState({ leftTab: "files" })}
              role="tab"
              aria-selected={leftTab === "files"}
            >
              Arquivos
            </button>
            <button
              className={`side-tab ${leftTab === "palette" ? "active" : ""}`}
              onClick={() => store.setState({ leftTab: "palette" })}
              role="tab"
              aria-selected={leftTab === "palette"}
            >
              Componentes
            </button>
          </div>
          <div className="side-content">
            {leftTab === "files" ? <FilesPanel /> : <PalettePanel />}
          </div>
        </aside>

        <main className="ide-main">
          <div className="editor-area">
            {centerTab === "design" ? (
              <Designer />
            ) : (
              <>
                <EditorTabs />
                <div className="editor-host">
                  <CodeEditor />
                </div>
              </>
            )}
          </div>
          <OutputPanel />
        </main>

        <aside className="ide-side right">
          <div className="side-tabs" role="tablist" aria-label="Painéis de edição">
            <button
              className={`side-tab ${rightTab === "props" ? "active" : ""}`}
              onClick={() => store.setState({ rightTab: "props" })}
              role="tab"
              aria-selected={rightTab === "props"}
            >
              Propriedades
            </button>
            <button
              className={`side-tab ${rightTab === "connections" ? "active" : ""}`}
              onClick={() => store.setState({ rightTab: "connections" })}
              role="tab"
              aria-selected={rightTab === "connections"}
            >
              Conexões
            </button>
            <button
              className={`side-tab ${rightTab === "data" ? "active" : ""}`}
              onClick={() => store.setState({ rightTab: "data" })}
              role="tab"
              aria-selected={rightTab === "data"}
            >
              Dados
            </button>
            <button
              className={`side-tab ${rightTab === "sql" ? "active" : ""}`}
              onClick={() => store.setState({ rightTab: "sql" })}
              role="tab"
              aria-selected={rightTab === "sql"}
            >
              Banco
            </button>
          </div>
          <div className="side-content">
            {rightTab === "props" && <PropertiesPanel />}
            {rightTab === "connections" && <ConnectionsPanel />}
            {rightTab === "data" && <DataPanel />}
            {rightTab === "sql" && <DatabasePanel />}
          </div>
        </aside>
      </div>
      <StatusBar onGuide={() => setGuideOpen(true)} onUndo={undo} onRedo={redo} />
      {guideOpen ? <GuideModal onClose={() => setGuideOpen(false)} /> : null}
    </div>
  );
}
