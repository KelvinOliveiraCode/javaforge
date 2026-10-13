import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { createProject } from "../actions";
import { api } from "../api";

interface Props {
  kind: string;
  onKindChange: (kind: string) => void;
  onClose: () => void;
}

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
  {
    kind: "blank",
    name: "Aplicativo em branco",
    desc: "Uma janela vazia para montar a interface do zero, com o projeto Maven completo.",
  },
];

export default function NewProjectModal({ kind, onKindChange, onClose }: Props) {
  const [name, setName] = useState("MeuApp");
  const [packageName, setPackageName] = useState("com.exemplo.app");
  const [parentDir, setParentDir] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .homeDir()
      .then((h) => setParentDir(h))
      .catch(() => setParentDir(""));
  }, []);

  const pickDir = async () => {
    const picked = await open({
      directory: true,
      multiple: false,
      title: "Onde salvar o projeto",
    });
    if (typeof picked === "string") setParentDir(picked);
  };

  const create = async () => {
    if (!parentDir) {
      return;
    }
    setBusy(true);
    const ok = await createProject(kind, name, parentDir, packageName);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Novo projeto">
        <div className="modal-head">
          <h2>Novo projeto</h2>
          <button className="btn ghost icon" onClick={onClose} aria-label="Fechar">
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="np-name">Nome do aplicativo</label>
            <input
              id="np-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MeuApp"
            />
          </div>
          <div className="field">
            <label htmlFor="np-pkg">Pacote Java</label>
            <input
              id="np-pkg"
              className="input mono"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="com.exemplo.app"
            />
          </div>
          <div className="field">
            <label>Pasta do projeto</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input mono"
                value={parentDir}
                readOnly
                placeholder="Selecione uma pasta..."
              />
              <button className="btn" onClick={pickDir}>
                Escolher
              </button>
            </div>
          </div>
          <div className="field">
            <label>Modelo</label>
            <div className="template-pick">
              {TEMPLATES.map((t) => (
                <label key={t.kind} className={`template-option ${t.kind === kind ? "picked" : ""}`}>
                  <input
                    type="radio"
                    name="template"
                    checked={t.kind === kind}
                    onChange={() => onKindChange(t.kind)}
                  />
                  <span>
                    <strong>{t.name}</strong>
                    <span>{t.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary"
            disabled={busy || !parentDir || !name.trim() || !packageName.trim()}
            onClick={create}
          >
            {busy ? "Criando..." : "Criar projeto"}
          </button>
        </div>
      </div>
    </div>
  );
}
