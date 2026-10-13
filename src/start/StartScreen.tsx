import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { createProject, openProjectByPath, refreshRecent } from "../actions";
import { useStore } from "../store";
import NewProjectModal from "./NewProjectModal";

const TEMPLATES = [
  {
    kind: "login",
    name: "Login + painel principal",
    desc: "Tela de login que consulta a tabela de usuários no SQLite e abre o painel principal. Pronta para testar.",
  },
  {
    kind: "crud",
    name: "Cadastro (CRUD) com tabela",
    desc: "Pesquisar, salvar, atualizar e excluir registros de uma tabela, com dados de exemplo já carregados.",
  },
];

export default function StartScreen() {
  const recent = useStore((s) => s.recent);
  const [modalKind, setModalKind] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void refreshRecent();
  }, []);

  const newBlank = () => {
    setModalKind("blank");
    setModalOpen(true);
  };

  const newFromTemplate = () => {
    setModalKind("login");
    setModalOpen(true);
  };

  const openExisting = async () => {
    const picked = await open({ directory: true, multiple: false, title: "Selecione a pasta do projeto" });
    if (typeof picked === "string") {
      await openProjectByPath(picked);
    }
  };

  return (
    <div className="start">
      <header className="start-top">
        <div className="brand-mark" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 32 32">
            <path d="M10 6 L10 26" stroke="#f5a524" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M22 6 L22 26" stroke="#f5a524" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M13 11 L19 16 L13 21" stroke="#e8ebf0" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div className="brand-name">JavaForge</div>
          <div className="brand-sub">Construtor de aplicativos Java (Swing) com banco SQLite</div>
        </div>
        <div className="start-env">
          <span className="env-chip">Interface Swing</span>
          <span className="env-chip">SQLite</span>
          <span className="env-chip">Maven e javac</span>
        </div>
      </header>

      <main className="start-body">
        <h1 className="start-title">Monte seu aplicativo sem sair do controle</h1>
        <p className="start-desc">
          Arraste componentes, ligue eventos ao banco e gere código Java que você pode abrir e editar
          em qualquer editor, inclusive no VS Code.
        </p>

        <div className="actions-grid">
          <button className="action-card" onClick={newBlank}>
            <span className="glyph" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 2v12M2 8h12" strokeLinecap="round" />
              </svg>
            </span>
            <h3>Criar aplicativo em branco</h3>
            <p>Uma janela vazia e o projeto Maven completo para montar do zero.</p>
          </button>

          <button className="action-card" onClick={newFromTemplate}>
            <span className="glyph" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
            </span>
            <h3>Usar um modelo</h3>
            <p>
              {TEMPLATES.length} modelos prontos: login com consulta ao banco e cadastro completo
              com tabela. Servem de base e podem ser editados por inteiro.
            </p>
          </button>

          <button className="action-card" onClick={openExisting}>
            <span className="glyph" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M1.5 4.5A1.5 1.5 0 0 1 3 3h3l1.5 2H13a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5v-7Z" />
              </svg>
            </span>
            <h3>Abrir projeto existente</h3>
            <p>Selecione a pasta de um projeto criado aqui e continue de onde parou.</p>
          </button>
        </div>

        <section>
          <h2 className="section-title">Projetos recentes</h2>
          {recent.length === 0 ? (
            <div className="recent-list">
              <div className="empty-note">Nenhum projeto ainda. Crie o primeiro ou abra uma pasta existente.</div>
            </div>
          ) : (
            <div className="recent-list">
              {recent.map((p) => (
                <button
                  key={p.id}
                  className="recent-row"
                  onClick={() => void openProjectByPath(p.path)}
                >
                  <span aria-hidden className="tree-ico">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1.5 4.5A1.5 1.5 0 0 1 3 3h3l1.5 2H13a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5v-7Z" />
                    </svg>
                  </span>
                  <span>
                    <div className="recent-name">{p.name}</div>
                    <div className="recent-path">{p.path}</div>
                  </span>
                  <span className="recent-tag">{p.templateName}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {modalOpen && modalKind ? (
        <NewProjectModal
          kind={modalKind}
          onKindChange={setModalKind}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
