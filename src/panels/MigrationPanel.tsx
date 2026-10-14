import { useState } from "react";
import { api } from "../api";
import { useStore, showToast, appendOutput } from "../store";
import type { SchemaDiffResult, TableDiff, ColumnDiff } from "../types";

export default function MigrationPanel() {
  const project = useStore((s) => s.project);
  const [diff, setDiff] = useState<SchemaDiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedStatements, setSelectedStatements] = useState<Set<number>>(new Set());

  const runDiff = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const result = await api.dbSchemaDiff(project.path);
      setDiff(result);
      appendOutput([`> Comparação concluída: ${result.tables.length} tabelas analisadas`]);
      showToast("ok", "Comparação concluída.");
    } catch (e) {
      showToast("error", String(e));
    } finally {
      setLoading(false);
    }
  };

  const applySelected = async () => {
    if (!project || !diff) return;
    const stmts = diff.alterStatements.filter((_, i) => selectedStatements.has(i));
    if (stmts.length === 0) {
      showToast("info", "Nenhuma instrução selecionada.");
      return;
    }
    if (!window.confirm(`Aplicar ${stmts.length} instrução(ões) ALTER TABLE? Esta ação não pode ser desfeita facilmente.`)) {
      return;
    }
    setApplying(true);
    try {
      const results = await api.dbApplyMigration(project.path, stmts);
      appendOutput(results.map((r: string) => `> ${r}`));
      showToast("ok", "Migração aplicada com sucesso.");
      setSelectedStatements(new Set());
      runDiff();
    } catch (e) {
      showToast("error", String(e));
    } finally {
      setApplying(false);
    }
  };

  const toggleStatement = (idx: number) => {
    const next = new Set(selectedStatements);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedStatements(next);
  };

  const toggleAllSafe = () => {
    const next = new Set(selectedStatements);
    diff?.alterStatements.forEach((_, i) => next.add(i));
    setSelectedStatements(next);
  };

  const clearSelection = () => setSelectedStatements(new Set());

  if (!project) {
    return (
      <div className="panel-pad">
        <p className="panel-hint">Abra um projeto para usar a migração de schema.</p>
      </div>
    );
  }

  return (
    <div className="panel-pad" style={{ gap: 12 }}>
      <p className="panel-hint">
        Compara o schema do modelo (aba Dados) com o banco <strong>app.db</strong> real.
        Gera instruções <code>ALTER TABLE</code> para colunas adicionadas, removidas ou alteradas.
        Operações destrutivas (DROP COLUMN, mudança de tipo) são listadas separadamente e exigem confirmação extra.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={runDiff} disabled={loading}>
          {loading ? "Comparando..." : "Comparar modelo ↔ banco"}
        </button>
        <button className="btn" onClick={toggleAllSafe} disabled={!diff?.alterStatements.length}>
          Selecionar todas seguras
        </button>
        <button className="btn ghost" onClick={clearSelection} disabled={selectedStatements.size === 0}>
          Limpar seleção
        </button>
        <button
          className="btn primary"
          onClick={applySelected}
          disabled={applying || selectedStatements.size === 0}
        >
          {applying ? "Aplicando..." : `Aplicar ${selectedStatements.size} selecionada(s)`}
        </button>
      </div>

      {diff && (
        <div style={{ display: "grid", gap: 12 }}>
          {diff.tables.length > 0 && (
            <div className="card" style={{ padding: 12 }}>
              <h3 style={{ margin: "0 0 8px" }}>Diferenças por tabela</h3>
              {diff.tables.map((table: TableDiff) => (
                <TableDiffCard
                  key={table.name}
                  table={table}
                  selected={selectedStatements}
                  onToggle={toggleStatement}
                />
              ))}
            </div>
          )}

          {diff.alterStatements.length > 0 && (
            <div className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Instruções ALTER TABLE seguras ({diff.alterStatements.length})</h3>
                <span className="badge">{selectedStatements.size} selecionadas</span>
              </div>
              <div style={{ maxHeight: 300, overflow: "auto" }}>
                {diff.alterStatements.map((stmt: string, i: number) => (
                  <label key={i} className="checkline" style={{ display: "block", padding: "6px 8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedStatements.has(i)}
                      onChange={() => toggleStatement(i)}
                    />
                    <code style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{stmt}</code>
                  </label>
                ))}
              </div>
            </div>
          )}

          {diff.destructive.length > 0 && (
            <div className="card danger" style={{ padding: 12, border: "1px solid var(--danger)" }}>
              <h3 style={{ margin: "0 0 8px", color: "var(--danger)" }}>⚠ Operações destrutivas (requerem recriação de tabela)</h3>
              <p className="panel-hint" style={{ margin: "0 0 8px" }}>
                SQLite não suporta ALTER COLUMN TYPE ou DROP COLUMN diretamente. Estas operações
                exigem recriar a tabela (CREATE TABLE nova, copiar dados, DROP antiga, RENAME).
                <strong>Podem causar perda de dados.</strong> Revise com cuidado antes de aplicar manualmente.
              </p>
              <div style={{ maxHeight: 200, overflow: "auto" }}>
                {diff.destructive.map((stmt: string, i: number) => (
                  <div key={i} className="code-line" style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 12, borderBottom: "1px solid var(--border)" }}>
                    {stmt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {diff.tables.length === 0 && diff.alterStatements.length === 0 && diff.destructive.length === 0 && (
            <p className="panel-hint">Nenhuma diferença encontrada. Modelo e banco estão sincronizados.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TableDiffCard({ table, selected, onToggle }: { table: TableDiff; selected: Set<number>; onToggle: (i: number) => void }) {
  const hasChanges = table.columns.length > 0 || table.missingInDb || table.missingInModel;
  if (!hasChanges) return null;

  return (
    <details className="data-table-card" open>
      <summary className="data-table-head" style={{ cursor: "pointer" }}>
        <span aria-hidden>▼</span>
        {table.name}
        {table.missingInDb && <span className="badge warn" style={{ marginLeft: 8 }}>Ausente no banco</span>}
        {table.missingInModel && <span className="badge danger" style={{ marginLeft: 8 }}>Ausente no modelo</span>}
        <span className="count">{table.columns.filter(c => c.action !== "removed").length} colunas no modelo, {table.columns.filter(c => c.action === "removed").length} só no banco</span>
      </summary>
      {table.columns.map((col: ColumnDiff, i: number) => (
        <div key={`${table.name}-${col.name}-${i}`} className="col-row" style={{ padding: "8px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <code style={{ fontSize: 12 }}>{col.name}</code>
            <span className={`badge ${actionColor(col.action)}`}>{actionLabel(col.action)}</span>
            {col.action === "type_changed" && (
              <span className="badge" style={{ fontSize: 11 }}>
                {col.dbType} → {col.modelType}
              </span>
            )}
            {col.action === "not_null_changed" && (
              <span className="badge" style={{ fontSize: 11 }}>
                NOT NULL: {String(col.dbNotNull)} → {String(col.modelNotNull)}
              </span>
            )}
            {col.action === "pk_changed" && (
              <span className="badge danger" style={{ fontSize: 11 }}>
                PK: {String(col.dbPk)} → {String(col.modelPk)}
              </span>
            )}
            {col.action === "added" && (
              <span className="badge ok" style={{ fontSize: 11 }}>
                {col.modelType}{col.modelNotNull ? " NOT NULL" : ""}{col.modelPk ? " PK" : ""}
              </span>
            )}
            {col.action === "removed" && (
              <span className="badge danger" style={{ fontSize: 11 }}>
                {col.dbType}{col.dbNotNull ? " NOT NULL" : ""}{col.dbPk ? " PK" : ""}
              </span>
            )}
          </div>
        </div>
      ))}
    </details>
  );
}

function actionColor(action: string) {
  switch (action) {
    case "added": return "ok";
    case "removed": return "danger";
    case "type_changed": return "warn";
    case "not_null_changed": return "warn";
    case "pk_changed": return "danger";
    default: return "";
  }
}

function actionLabel(action: string) {
  switch (action) {
    case "added": return "Adicionada no modelo";
    case "removed": return "Removida do modelo";
    case "type_changed": return "Tipo alterado";
    case "not_null_changed": return "NOT NULL alterado";
    case "pk_changed": return "PK alterada";
    default: return action;
  }
}