import { getCurrentWindow } from "@tauri-apps/api/window";
import { exportModel, goToStartScreen, importModel, regenerate, runProject, stopProject } from "../actions";
import ThemeToggle from "../components/ThemeToggle";
import { store, useStore } from "../store";

export default function TitleBar() {
  const project = useStore((s) => s.project);
  const running = useStore((s) => s.running);
  const appWindow = getCurrentWindow();


  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="brand-mark" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 32 32">
          <path d="M10 6 L10 26" stroke="#f5a524" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M22 6 L22 26" stroke="#f5a524" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M13 11 L19 16 L13 21" stroke="#e8ebf0" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="project-name">{project?.name ?? "JavaForge"}</span>
      {project ? (
        <>
          <span className="project-package">{project.path}</span>
          <div className="titlebar-actions">
            <button
              className="btn sm"
              onClick={() => void goToStartScreen()}
              title="Voltar para a tela inicial (trocar de projeto)"
            >
              Início
            </button>
            <button
              className="btn sm"
              onClick={() => void importModel()}
              title="Carregar um modelo exportado (.json), substituindo o atual"
            >
              Importar
            </button>
            <button
              className="btn sm"
              onClick={() => void exportModel()}
              title="Salvar o modelo em um arquivo .json"
            >
              Exportar
            </button>
            <button className="btn sm" onClick={() => void regenerate()} title="Gerar o código Java a partir do modelo">
              Gerar código
            </button>
            {running ? (
              <button className="btn sm danger" onClick={() => void stopProject()}>
                Parar
              </button>
            ) : (
              <button className="btn sm ok" onClick={() => void runProject()} title="Compilar e executar (F5)">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
                  <path d="M1 0l8 5-8 5z" />
                </svg>
                Rodar
              </button>
            )}
          </div>
        </>
      ) : null}
      <div className="titlebar-actions">
        <ThemeToggle />
        <button
          className="btn ghost icon"
          aria-label="Minimizar"
          onClick={() => void appWindow.minimize()}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" stroke="currentColor" strokeWidth="1.2">
            <path d="M1 5.5h9" />
          </svg>
        </button>
        <button
          className="btn ghost icon"
          aria-label="Maximizar"
          onClick={() => void appWindow.toggleMaximize()}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1" y="1" width="9" height="9" />
          </svg>
        </button>
        <button
          className="btn ghost icon"
          aria-label="Fechar"
          onClick={() => void appWindow.close()}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" stroke="currentColor" strokeWidth="1.2">
            <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" />
          </svg>
        </button>
      </div>
    </header>
  );
}
