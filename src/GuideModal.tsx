import { useState } from "react";
import { COMPONENT_DOCS, CONNECTION_DOCS } from "./guide";
import { catalogOf } from "./catalog";

interface Props {
  onClose: () => void;
}

export default function GuideModal({ onClose }: Props) {
  const [tab, setTab] = useState<"componentes" | "conexoes" | "passos">("componentes");

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Como usar o JavaForge">
        <div className="modal-head">
          <h2>Como usar o JavaForge</h2>
          <button className="btn ghost icon" onClick={onClose} aria-label="Fechar">
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="side-tabs" role="tablist">
            <button
              className={`side-tab ${tab === "componentes" ? "active" : ""}`}
              onClick={() => setTab("componentes")}
            >
              Componentes
            </button>
            <button
              className={`side-tab ${tab === "conexoes" ? "active" : ""}`}
              onClick={() => setTab("conexoes")}
            >
              Conexões
            </button>
            <button
              className={`side-tab ${tab === "passos" ? "active" : ""}`}
              onClick={() => setTab("passos")}
            >
              Primeiros passos
            </button>
          </div>

          {tab === "componentes" ? (
            <div className="guide-section">
              {COMPONENT_DOCS.map((doc) => (
                <div className="guide-item" key={doc.type}>
                  <h4>
                    {doc.type} · {catalogOf(doc.type).label}
                  </h4>
                  <p>
                    <b>O que é:</b> {doc.what}
                  </p>
                  <p>
                    <b>Quando usar:</b> {doc.when}
                  </p>
                  <p>
                    <b>Eventos:</b> {doc.events}
                  </p>
                  <p>
                    <b>Conexões:</b> {doc.connections}
                  </p>
                  <p>
                    <b>Propriedades:</b> {doc.props}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "conexoes" ? (
            <div className="guide-section">
              {CONNECTION_DOCS.map((doc) => (
                <div className="guide-item" key={doc.kind}>
                  <h4>{doc.name}</h4>
                  <p>
                    <b>O que faz:</b> {doc.what}
                  </p>
                  <p>
                    <b>Precisa de:</b> {doc.needs}
                  </p>
                  <p>
                    <b>Exemplo:</b> {doc.example}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "passos" ? (
            <div className="guide-section">
              <div className="guide-item">
                <h4>1. Crie o projeto</h4>
                <p>
                  Na tela inicial, escolha <b>Criar aplicativo em branco</b>, <b>Usar um modelo</b> ou{" "}
                  <b>Abrir projeto existente</b>. O projeto já vem com estrutura Maven e banco SQLite.
                </p>
              </div>
              <div className="guide-item">
                <h4>2. Monte a tela</h4>
                <p>
                  Arraste componentes da paleta (aba <b>Componentes</b>) para a tela. Ajuste tamanho
                  e posição, edite as propriedades na direita.
                </p>
              </div>
              <div className="guide-item">
                <h4>3. Crie as tabelas</h4>
                <p>
                  Na aba <b>Dados</b>, crie tabelas e colunas, com dados iniciais se quiser. Clique em{" "}
                  <b>Aplicar ao banco</b>.
                </p>
              </div>
              <div className="guide-item">
                <h4>4. Ligue os eventos ao banco</h4>
                <p>
                  Clique em um componente na tela e use as <b>ações rápidas</b> na aba <b>Conexões</b>,
                  ou monte a conexão inteira à mão. Para ver as conexões de todo o app, clique em
                  qualquer área vazia da tela.
                </p>
              </div>
              <div className="guide-item">
                <h4>5. Rode e aproveite</h4>
                <p>
                  Clique em <b>Rodar</b> (ou F5). O código Java é gerado e o app abre. Você pode editar
                  o código no editor do app ou no VS Code, por fora.
                </p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="modal-foot">
          <button className="btn primary" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
