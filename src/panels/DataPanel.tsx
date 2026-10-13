import { useState } from "react";
import { applyDb, patchModel } from "../actions";
import { useStore, showToast } from "../store";
import type { ColumnSpec, SqlType, TableSpec } from "../types";

const SQL_TYPES: SqlType[] = ["INTEGER", "TEXT", "REAL", "BLOB"];

export default function DataPanel() {
  const model = useStore((s) => s.model);
  const project = useStore((s) => s.project);
  const [openTable, setOpenTable] = useState<string | null>(null);

  const addTable = () => {
    const name = `tabela${model.database.tables.length + 1}`;
    patchModel((m) => {
      m.database.tables.push({
        name,
        columns: [
          { name: "id", type: "INTEGER", pk: true, notNull: false, autoIncrement: true },
        ],
        seedRows: [],
      });
    });
    setOpenTable(name);
  };

  return (
    <div className="panel-pad" style={{ gap: 8 }}>
      <p className="panel-hint">
        As tabelas aqui viram o banco SQLite do aplicativo. As conexões usam essas colunas para
        gravar e consultar. O arquivo <strong>{model.database.file}</strong> fica na pasta{" "}
        <strong>data/</strong> do projeto. Em <strong>Relaciona com</strong> você liga uma coluna a
        outra tabela (chave estrangeira) — o modelo "Lista de tarefas" usa isso.
      </p>

      <div className="field">
        <label>Arquivo do banco</label>
        <input
          className="input mono"
          value={model.database.file}
          onChange={(e) => patchModel((m) => { m.database.file = e.target.value; })}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn sm" onClick={addTable}>
          + Tabela
        </button>
        <button className="btn sm" onClick={() => applyDb(false)} disabled={!project}>
          Aplicar ao banco
        </button>
        <button
          className="btn sm danger"
          disabled={!project}
          onClick={() => {
            if (window.confirm("Recriar o banco apaga todos os dados atuais. Continuar?")) {
              applyDb(true);
            }
          }}
        >
          Recriar banco
        </button>
      </div>

      <div className="data-tables">
        {model.database.tables.map((t) => (
          <TableCard
            key={t.name}
            table={t}
            open={openTable === t.name}
            onToggle={() => setOpenTable(openTable === t.name ? null : t.name)}
            otherTables={model.database.tables.filter((x) => x.name !== t.name)}
          />
        ))}
        {model.database.tables.length === 0 ? (
          <p className="panel-hint">Nenhuma tabela ainda. Clique em "+ Tabela".</p>
        ) : null}
      </div>
    </div>
  );
}

function TableCard({
  table,
  open,
  onToggle,
  otherTables,
}: {
  table: TableSpec;
  open: boolean;
  onToggle: () => void;
  /** Demais tabelas, para o seletor de chave estrangeira. */
  otherTables: TableSpec[];
}) {
  const setColumn = (i: number, key: keyof ColumnSpec, value: string | boolean) =>
    patchModel((m) => {
      const t = m.database.tables.find((x) => x.name === table.name);
      if (t) (t.columns[i][key] as string | boolean) = value;
    });
  return (
    <div className="data-table-card">
      <button className="data-table-head" onClick={onToggle}>
        <span aria-hidden>{open ? "▼" : "▶"}</span>
        {table.name}
        <span className="count">{table.columns.length} colunas</span>
      </button>
      {open ? (
        <div className="cols">
          {table.columns.map((col, i) => (
            <div key={i} className="col-row">
              <input
                className="input mono"
                value={col.name}
                onChange={(e) =>
                  patchModel((m) => {
                    const t = m.database.tables.find((x) => x.name === table.name);
                    if (t) t.columns[i].name = e.target.value;
                  })
                }
              />
              <select
                className="select"
                value={col.type}
                onChange={(e) =>
                  patchModel((m) => {
                    const t = m.database.tables.find((x) => x.name === table.name);
                    if (t) t.columns[i].type = e.target.value as SqlType;
                  })
                }
              >
                {SQL_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {ty}
                  </option>
                ))}
              </select>
              <div className="col-flags">
                <label className="checkline" title="Chave primária">
                  <input
                    type="checkbox"
                    checked={col.pk}
                    onChange={(e) =>
                      patchModel((m) => {
                        const t = m.database.tables.find((x) => x.name === table.name);
                        if (t) t.columns[i].pk = e.target.checked;
                      })
                    }
                  />
                  PK
                </label>
                <label className="checkline" title="Obrigatório">
                  <input
                    type="checkbox"
                    checked={col.notNull}
                    onChange={(e) =>
                      patchModel((m) => {
                        const t = m.database.tables.find((x) => x.name === table.name);
                        if (t) t.columns[i].notNull = e.target.checked;
                      })
                    }
                  />
                  NOT NULL
                </label>
                {col.pk && col.type === "INTEGER" ? (
                  <label className="checkline" title="Auto incremento">
                    <input
                      type="checkbox"
                      checked={col.autoIncrement}
                      onChange={(e) =>
                        patchModel((m) => {
                          const t = m.database.tables.find((x) => x.name === table.name);
                          if (t) t.columns[i].autoIncrement = e.target.checked;
                        })
                      }
                    />
                    AUTO
                  </label>
                ) : null}
                <button
                  className="btn ghost icon sm"
                  aria-label="Remover coluna"
                  onClick={() =>
                    patchModel((m) => {                      const t = m.database.tables.find((x) => x.name === table.name);
                      if (t && t.columns.length > 1) t.columns.splice(i, 1);
                      else showToast("error", "A tabela precisa de ao menos uma coluna.");
                    })
                  }
                >
                  ×
                </button>
              </div>
              {col.pk ? null : (
                <div className="col-refs">
                  <span className="col-refs-label">Relaciona com</span>
                  <select
                    className="select sm"
                    value={col.refsTable ?? ""}
                    onChange={(e) => setColumn(i, "refsTable", e.target.value)}
                  >
                    <option value="">nada (coluna comum)</option>
                    {otherTables.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {col.refsTable ? (
                    <select
                      className="select sm"
                      value={col.refsColumn ?? ""}
                      onChange={(e) => setColumn(i, "refsColumn", e.target.value)}
                    >
                      <option value="">(coluna que quiser)</option>
                      {(otherTables.find((t) => t.name === col.refsTable)?.columns ?? []).map(
                        (c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ),
                      )}
                    </select>
                  ) : null}
                </div>
              )}
            </div>
          ))}

          <button
            className="btn sm"
            onClick={() =>
              patchModel((m) => {
                const t = m.database.tables.find((x) => x.name === table.name);
                if (t) {
                  t.columns.push({
                    name: `coluna${t.columns.length + 1}`,
                    type: "TEXT",
                    pk: false,
                    notNull: false,
                    autoIncrement: false,
                  });
                }
              })
            }
          >
            + Coluna
          </button>

          <div className="props-title" style={{ padding: "8px 0 0" }}>
            Dados iniciais (gravados na primeira execução)
          </div>
          <SeedEditor table={table} />

          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button
              className="btn sm danger"
              onClick={() =>
                patchModel((m) => {
                  m.database.tables = m.database.tables.filter((x) => x.name !== table.name);
                  m.connections = m.connections.filter((c) => c.table !== table.name);
                })
              }
            >
              Excluir tabela
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SeedEditor({ table }: { table: TableSpec }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {table.seedRows.map((row, r) => (
        <div key={r} style={{ display: "grid", gap: 4 }}>
          {table.columns.map((col, ci) => (
            <div key={col.name} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="badge" style={{ minWidth: 86, textAlign: "center" }}>
                {col.name}
              </span>
              <input
                className="input"
                value={row[col.name] ?? ""}
                onChange={(e) =>
                  patchModel((m) => {
                    const t = m.database.tables.find((x) => x.name === table.name);
                    if (t) t.seedRows[r][col.name] = e.target.value;
                  })
                }
              />
              {ci === 0 ? (
                <button
                  className="btn ghost icon sm"
                  aria-label="Remover linha"
                  onClick={() =>
                    patchModel((m) => {
                      const t = m.database.tables.find((x) => x.name === table.name);
                      if (t) t.seedRows.splice(r, 1);
                    })
                  }
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ))}
      <button
        className="btn sm"
        onClick={() =>
          patchModel((m) => {
            const t = m.database.tables.find((x) => x.name === table.name);
            if (!t) return;
            const row: Record<string, string> = {};
            for (const c of t.columns) {
              if (c.autoIncrement) continue;
              row[c.name] = "";
            }
            t.seedRows.push(row);
          })
        }
      >
        + Linha
      </button>
    </div>
  );
}
