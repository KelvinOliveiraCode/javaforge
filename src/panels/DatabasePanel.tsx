import { useState } from "react";
import { api } from "../api";
import { applyDb, patchModel } from "../actions";
import { useStore } from "../store";
import type { DbQueryResult } from "../types";

const EXEMPLOS = [
  { label: "Ver as tabelas", sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" },
  { label: "Ver dados de uma tabela", sql: "SELECT * FROM usuarios LIMIT 50" },
  { label: "Criar tabela", sql: "CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT)" },
  { label: "Inserir", sql: "INSERT INTO usuarios (usuario, senha, nome) VALUES ('novo', '1234', 'Novo Usuário')" },
  { label: "Atualizar", sql: "UPDATE usuarios SET nome = 'Nome Novo' WHERE usuario = 'novo'" },
  { label: "Excluir", sql: "DELETE FROM usuarios WHERE usuario = 'novo'" },
];

/** Palavras que apagam ou reescrevem o banco: exigem confirmação. */
const DESTRUTIVO = /\b(drop|delete|truncate|alter|update|replace)\b/i;

export default function DatabasePanel() {
  const model = useStore((s) => s.model);
  const project = useStore((s) => s.project);
  const [sql, setSql] = useState("SELECT * FROM usuarios LIMIT 50");
  const [result, setResult] = useState<DbQueryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [ddl, setDdl] = useState<string[]>([]);
  const [verEstrutura, setVerEstrutura] = useState(false);

  const run = async () => {
    if (!project) return;
    if (DESTRUTIVO.test(sql)) {
      const ok = window.confirm(
        `Este SQL altera ou apaga dados:\n\n${sql.trim()}\n\nExecutar mesmo assim?`,
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const r = await api.dbSql(project.path, sql);
      setResult(r);
    } catch (e) {
      setResult({ columns: [], rows: [], affected: null, error: String(e) });
    } finally {
      setBusy(false);
    }
  };

  const showDdl = async () => {
    if (!project) return;
    setVerEstrutura(!verEstrutura);
    if (verEstrutura) return;
    try {
      const list = await api.dbDdl(project.path);
      setDdl(list);
    } catch (e) {
      setDdl([String(e)]);
    }
  };

  return (
    <div className="panel-pad" style={{ gap: 10 }}>
      <p className="panel-hint">
        Escreva e rode SQL no banco do app (<strong>{model.database.file}</strong>). As tabelas do
        modelo estão na aba <strong>Dados</strong>. Aqui você consulta, insere e corrige à mão.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          className="btn sm"
          onClick={() => void showDdl()}
          title="Mostra as tabelas, colunas e relações do modelo"
        >
          Ver estrutura
        </button>
        <button className="btn sm" onClick={() => applyDb(false)} disabled={!project}>
          Aplicar modelo ao banco
        </button>
      </div>

      {verEstrutura ? (
        <div className="db-schema">
          {model.database.tables.length === 0 ? (
            <p className="panel-hint">Nenhuma tabela no modelo. Crie tabelas na aba Dados.</p>
          ) : (
            model.database.tables.map((t) => (
              <div className="db-schema-table" key={t.name}>
                <div className="db-schema-head">
                  <strong>{t.name}</strong>
                  <span className="count">{t.columns.length} colunas</span>
                </div>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Coluna</th>
                      <th>Tipo</th>
                      <th>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.columns.map((c) => (
                      <tr key={c.name}>
                        <td className="mono">{c.name}</td>
                        <td>{c.type}</td>
                        <td>
                          {[c.pk ? "PK" : null, c.autoIncrement ? "auto" : null, c.notNull ? "not null" : null]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {t.columns.some((c) => c.refsTable) ? (
                  <div className="db-schema-refs">
                    {t.columns
                      .filter((c) => c.refsTable)
                      .map((c) => (
                        <div key={c.name}>
                          <span className="mono">{c.name}</span> →{" "}
                          <span className="mono">
                            {c.refsTable}
                            {c.refsColumn ? `.${c.refsColumn}` : ""}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {ddl.length > 0 ? (
        <pre className="sql-block">
          {ddl.join(";\n\n")};
        </pre>
      ) : null}

      <div className="field">
        <label>SQL</label>
        <textarea
          className="input"
          rows={7}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="btn sm primary" onClick={() => void run()} disabled={busy || !project}>
          {busy ? "Executando..." : "Executar SQL"}
        </button>
        {EXEMPLOS.map((ex) => (
          <button key={ex.label} className="btn sm" onClick={() => setSql(ex.sql)}>
            {ex.label}
          </button>
        ))}
      </div>

      {result ? (
        <div className="db-result">
          {result.error ? (
            <div className="problem-row error">
              <span className="sev">erro</span>
              <span className="msg">{result.error}</span>
            </div>
          ) : result.affected !== null ? (
            <div className="problem-row">
              <span className="sev">ok</span>
              <span className="msg">{result.affected} linha(s) afetada(s).</span>
            </div>
          ) : result.columns.length > 0 ? (
            <>
              <div className="db-meta">{result.rows.length} linha(s)</div>
              <div className="db-table-wrap">
                <table className="db-table">
                  <thead>
                    <tr>
                      {result.columns.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="panel-hint">Sem resultados.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
