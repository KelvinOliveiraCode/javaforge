import { useEffect, useState } from "react";
import { catalogOf } from "../catalog";
import { menuItems } from "../model-ops";
import { createConnection, deleteConnection, patchConnection, patchModel } from "../actions";
import { store, useStore } from "../store";
import { quickActionsFor, type QuickContext } from "../guide";
import type {
  AppModel,
  ConnectionKind,
  ConnectionSpec,
  ComponentSpec,
  ParamRole,
  QueryOperator,
} from "../types";

const KIND_LABEL: Record<ConnectionKind, string> = {
  message: "Mostrar mensagem",
  openWindow: "Abrir janela",
  authenticate: "Verificar login (usuário e senha)",
  insert: "Inserir registro",
  update: "Atualizar registro",
  delete: "Excluir registro",
  query: "Consultar e preencher",
  custom: "Código manual",
};

function summary(c: ConnectionSpec, model: AppModel): string {
  const comp = model.windows.flatMap((w) => w.components).find((x) => x.id === c.componentId);
  const src = comp ? comp.id : "?";
  switch (c.kind) {
    case "authenticate":
      return `${src} · consulta "${c.table}" e abre ${c.authSuccessWindowId || "nada"}`;
    case "insert":
    case "update":
    case "delete":
      return `${src} · ${c.kind} em "${c.table}"`;
    case "query":
      return `${src} · preenche ${c.targetTableComponentId || "?"} de "${c.table}"`;
    case "openWindow":
      return `${src} · abre ${c.openWindowId || "?"}`;
    case "custom":
      return `${src} · código manual`;
    default:
      return `${src} · mensagem`;
  }
}

export default function ConnectionsPanel() {
  const model = useStore((s) => s.model);
  const problems = useStore((s) => s.problems);
  const selectedId = useStore((s) => s.selectedComponentId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const allConns = model.connections;
  // com um componente selecionado, mostra só as conexões dele
  const scoped = !showAll && selectedId ? allConns.filter((c) => c.componentId === selectedId) : allConns;
  const conns = scoped;
  const active = conns.find((c) => c.id === activeId) ?? conns[0] ?? null;

  useEffect(() => {
    if (!activeId && conns.length > 0) setActiveId(conns[0].id);
  }, [conns, activeId]);

  const allComponents: { comp: ComponentSpec; windowId: string }[] = model.windows.flatMap((w) =>
    w.components.map((c) => ({ comp: c, windowId: w.id })),
  );
  const menus = menuItems(model);
  const paramCapable = (c: ComponentSpec) =>
    ["JTextField", "JPasswordField", "JTextArea", "JCheckBox", "JRadioButton", "JComboBox", "JList", "JSpinner", "JToggleButton", "JSlider"].includes(
      c.type,
    );
  const table = model.database.tables.find((t) => t.name === active?.table);
  const columns = table?.columns ?? [];

  const compOf = (id: string) => allComponents.find((x) => x.comp.id === id)?.comp;
  const compEvents = (id: string) => {
    const c = compOf(id);
    if (!c) return [{ event: "actionPerformed", label: "Clique (actionPerformed)" }];
    return catalogOf(c.type).events.length > 0
      ? catalogOf(c.type).events
      : [{ event: "actionPerformed", label: "Clique (actionPerformed)" }];
  };

  const selectedComp = selectedId ? compOf(selectedId) : undefined;
  const quickContext: QuickContext | null = selectedComp
    ? {
        componentId: selectedComp.id,
        event: (catalogOf(selectedComp.type).events[0]?.event ?? "actionPerformed") as string,
        table: model.database.tables[0]?.name ?? "",
        tables: model.database.tables.map((t) => t.name),
        columns: (model.database.tables[0]?.columns ?? []).map((c) => c.name),
        windows: model.windows.map((w) => ({ id: w.id, title: w.title })),
        mainWindowId: model.mainWindowId,
      }
    : null;
  const quickActions = selectedComp ? quickActionsFor(selectedComp.type) : [];

  if (conns.length === 0) {
    return (
      <div className="panel-pad">
        <p className="panel-hint">
          Conexões ligam um evento de um componente (clique, Enter, perda de foco) a uma ação:
          consultar o banco, gravar um registro, abrir outra janela ou mostrar uma mensagem.
        </p>
        {selectedComp ? (
          <>
            <div className="props-title">O que dá para fazer com {selectedComp.id}</div>
            <div className="quick-actions">
              {quickActions.length === 0 ? (
                <p className="panel-hint">
                  Este componente não dispara eventos. Use campos e botões para criar conexões.
                </p>
              ) : (
                quickActions.map((qa) => (
                  <button
                    key={qa.label}
                    className="quick-action"
                    onClick={() => {
                      patchModel((m) => {
                        m.connections.push({
                          id: `conexao${m.connections.length + 1}`,
                          name: qa.label,
                          componentId: selectedComp.id,
                          event: (catalogOf(selectedComp.type).events[0]?.event ?? "actionPerformed"),
                          kind: "message",
                          table: m.database.tables[0]?.name ?? "",
                          params: [],
                          queryColumns: [],
                          targetTableComponentId: "",
                          openWindowId: "",
                          closeCurrent: false,
                          message: "",
                          messageTitle: "",
                          messageKind: "info",
                          authSuccessWindowId: "",
                          customCode: "",
                          ...qa.build({
                            componentId: selectedComp.id,
                            event: (catalogOf(selectedComp.type).events[0]?.event ?? "actionPerformed"),
                            table: m.database.tables[0]?.name ?? "",
                            tables: m.database.tables.map((t) => t.name),
                            columns: (m.database.tables[0]?.columns ?? []).map((c) => c.name),
                            windows: m.windows.map((w) => ({ id: w.id, title: w.title })),
                            mainWindowId: m.mainWindowId,
                          }),
                        });
                      });
                    }}
                  >
                    <strong>{qa.label}</strong>
                    <small>{qa.hint}</small>
                  </button>
                ))
              )}
            </div>
          </>
        ) : null}
        <button className="btn primary" onClick={createConnection}>
          Criar primeira conexão
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
      <div className="conn-list" style={{ overflowY: "auto", flex: "none", maxHeight: 168 }}>
        {showAll || !selectedId ? (
          <button className="btn sm" onClick={createConnection}>
            + Nova conexão
          </button>
        ) : (
          <div className="scope-note">
            Conexões de <b>{selectedId}</b>.{" "}
            <button
              className="btn sm ghost"
              onClick={() => setShowAll(true)}
            >
              Ver todas do app ({allConns.length})
            </button>{" "}
            ou clique em qualquer área vazia da tela.
          </div>
        )}
        {showAll && (
          <div className="scope-note">
            Todas as conexões do app.{" "}
            <button className="btn sm ghost" onClick={() => setShowAll(false)}>
              Ver só as do componente selecionado
            </button>
          </div>
        )}
        {conns.map((c) => (
          <div
            key={c.id}
            className={`conn-card ${c.id === active?.id ? "active" : ""}`}
            onClick={() => setActiveId(c.id)}
          >
            <div className="conn-name">{c.name}</div>
            <div className="conn-summary">{summary(c, model)}</div>
          </div>
        ))}
      </div>

      {selectedComp && quickActions.length > 0 ? (
        <div style={{ padding: "8px 10px 0" }}>
          <div className="props-title" style={{ padding: 0 }}>
            O que dá para fazer com {selectedComp.id}
          </div>
          <div className="quick-actions" style={{ marginTop: 6 }}>
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                className="quick-action"
                onClick={() => {
                  if (!quickContext) return;
                  patchModel((m) => {
                    m.connections.push({
                      id: `conexao${m.connections.length + 1}`,
                      name: qa.label,
                      componentId: quickContext.componentId,
                      event: quickContext.event,
                      kind: "message",
                      table: m.database.tables[0]?.name ?? "",
                      params: [],
                      queryColumns: [],
                      targetTableComponentId: "",
                      openWindowId: "",
                      closeCurrent: false,
                      message: "",
                      messageTitle: "",
                      messageKind: "info",
                      authSuccessWindowId: "",
                      customCode: "",
                      ...qa.build({
                        componentId: quickContext.componentId,
                        event: quickContext.event,
                        table: m.database.tables[0]?.name ?? "",
                        tables: m.database.tables.map((t) => t.name),
                        columns: (m.database.tables[0]?.columns ?? []).map((c) => c.name),
                        windows: m.windows.map((w) => ({ id: w.id, title: w.title })),
                        mainWindowId: m.mainWindowId,
                      }),
                    });
                  });
                }}
              >
                <strong>{qa.label}</strong>
                <small>{qa.hint}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {active ? (
        <div className="conn-form" style={{ overflowY: "auto", flex: 1 }}>
          <div className="field">
            <label>Nome</label>
            <input
              className="input"
              value={active.name}
              onChange={(e) => patchConnection(active.id, { name: e.target.value })}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Componente</label>
              <select
                className="select"
                value={active.componentId}
                onChange={(e) => {
                  const comp = compOf(e.target.value);
                  const events = comp ? catalogOf(comp.type).events : [];
                  patchConnection(active.id, {
                    componentId: e.target.value,
                    event: events[0]?.event ?? "actionPerformed",
                  });
                }}
              >
                <option value="">Selecione...</option>
                {allComponents.map(({ comp, windowId }) => (
                  <option key={`${windowId}.${comp.id}`} value={comp.id}>
                    {comp.id} ({catalogOf(comp.type).label})
                  </option>
                ))}
                {menus.map(({ item, menuId }) => (
                  <option key={`${menuId}.${item.id}`} value={item.id}>
                    {item.id} (menu: {item.label})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Evento</label>
              <select
                className="select"
                value={active.event}
                onChange={(e) => patchConnection(active.id, { event: e.target.value })}
              >
                {compEvents(active.componentId).map((ev) => (
                  <option key={ev.event} value={ev.event}>
                    {ev.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Ação</label>
            <select
              className="select"
              value={active.kind}
              onChange={(e) => patchConnection(active.id, { kind: e.target.value as ConnectionKind })}
            >
              {(Object.keys(KIND_LABEL) as ConnectionKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="conn-flow">
            <b>{active.componentId || "componente"}</b>
            <span className="arrow">--{active.event}--&gt;</span>
            <b>{KIND_LABEL[active.kind]}</b>
          </div>

          {active.kind === "message" && (
            <>
              <div className="field">
                <label>Mensagem</label>
                <textarea
                  className="input"
                  rows={2}
                  value={active.message}
                  onChange={(e) => patchConnection(active.id, { message: e.target.value })}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Título</label>
                  <input
                    className="input"
                    value={active.messageTitle}
                    onChange={(e) => patchConnection(active.id, { messageTitle: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Tipo</label>
                  <select
                    className="select"
                    value={active.messageKind}
                    onChange={(e) =>
                      patchConnection(active.id, {
                        messageKind: e.target.value as "info" | "error" | "warning",
                      })
                    }
                  >
                    <option value="info">Informação</option>
                    <option value="warning">Aviso</option>
                    <option value="error">Erro</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {active.kind === "openWindow" && (
            <>
              <div className="field">
                <label>Janela de destino</label>
                <select
                  className="select"
                  value={active.openWindowId}
                  onChange={(e) => patchConnection(active.id, { openWindowId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {model.windows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title} ({w.id})
                    </option>
                  ))}
                </select>
              </div>
              <label className="checkline">
                <input
                  type="checkbox"
                  checked={active.closeCurrent}
                  onChange={(e) => patchConnection(active.id, { closeCurrent: e.target.checked })}
                />
                Fechar a janela atual
              </label>
            </>
          )}

          {(active.kind === "authenticate" ||
            active.kind === "insert" ||
            active.kind === "update" ||
            active.kind === "delete" ||
            active.kind === "query") && (
            <>
              <div className="field">
                <label>Tabela</label>
                <select
                  className="select"
                  value={active.table}
                  onChange={(e) => patchConnection(active.id, { table: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {model.database.tables.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <ParamEditor
                conn={active}
                columns={columns}
                paramCapable={paramCapable}
                allComponents={allComponents}
                showRole={active.kind === "update"}
                allowOperator={active.kind === "query" || active.kind === "update" || active.kind === "delete"}
              />

              {active.kind === "authenticate" && (
                <>
                  <div className="field">
                    <label>Mensagem quando o acesso é válido</label>
                    <input
                      className="input"
                      value={active.message}
                      onChange={(e) => patchConnection(active.id, { message: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Janela ao autenticar</label>
                    <select
                      className="select"
                      value={active.authSuccessWindowId}
                      onChange={(e) =>
                        patchConnection(active.id, { authSuccessWindowId: e.target.value })
                      }
                    >
                      <option value="">Nenhuma (apenas mensagem)</option>
                      {model.windows.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.title} ({w.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="checkline">
                    <input
                      type="checkbox"
                      checked={active.closeCurrent}
                      onChange={(e) => patchConnection(active.id, { closeCurrent: e.target.checked })}
                    />
                    Fechar a tela de login
                  </label>
                </>
              )}

              {(active.kind === "insert" || active.kind === "update") && (
                <div className="field">
                  <label>Mensagem de sucesso</label>
                  <input
                    className="input"
                    value={active.message}
                    onChange={(e) => patchConnection(active.id, { message: e.target.value })}
                  />
                </div>
              )}

              {active.kind === "query" && (
                <>
                  <div className="field">
                    <label>Colunas exibidas</label>
                    <div style={{ display: "grid", gap: 6 }}>
                      {columns.map((col) => {
                        const qc = active.queryColumns.find((q) => q.column === col.name);
                        return (
                          <div key={col.name} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <label className="checkline" style={{ minWidth: 120 }}>
                              <input
                                type="checkbox"
                                checked={Boolean(qc)}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...active.queryColumns, { column: col.name, header: col.name }]
                                    : active.queryColumns.filter((q) => q.column !== col.name);
                                  patchConnection(active.id, { queryColumns: next });
                                }}
                              />
                              {col.name}
                            </label>
                            {qc ? (
                              <input
                                className="input"
                                placeholder="Cabeçalho"
                                value={qc.header}
                                onChange={(e) =>
                                  patchConnection(active.id, {
                                    queryColumns: active.queryColumns.map((q) =>
                                      q.column === col.name ? { ...q, header: e.target.value } : q,
                                    ),
                                  })
                                }
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="field">
                    <label>Componente que recebe os dados</label>
                    <select
                      className="select"
                      value={active.targetTableComponentId}
                      onChange={(e) =>
                        patchConnection(active.id, { targetTableComponentId: e.target.value })
                      }
                    >
                      <option value="">Selecione...</option>
                      {allComponents
                        .filter(
                          ({ comp }) =>
                            comp.type === "JTable" ||
                            comp.type === "JTextField" ||
                            comp.type === "JTextArea" ||
                            comp.type === "JLabel",
                        )
                        .map(({ comp }) => (
                          <option key={comp.id} value={comp.id}>
                            {comp.id} ({catalogOf(comp.type).label})
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          {active.kind === "custom" && (
            <div className="field">
              <label>Código Java (corpo do método)</label>
              <textarea
                className="input"
                rows={6}
                value={active.customCode}
                onChange={(e) => patchConnection(active.id, { customCode: e.target.value })}
                placeholder={'JOptionPane.showMessageDialog(this, "Olá!");\nSystem.exit(0);'}
              />
              <small style={{ color: "var(--text-3)" }}>
                Você pode chamar Database.connect() e usar os campos da janela diretamente.
              </small>
            </div>
          )}

          <button
            className="btn sm danger"
            onClick={() => {
              deleteConnection(active.id);
              setActiveId(null);
            }}
          >
            Excluir conexão
          </button>

          {problems.filter((p) => p.componentId === active.componentId).length > 0 ? (
            <div className="problems-list">
              {problems
                .filter((p) => p.componentId === active.componentId)
                .map((p, i) => (
                  <div className={`problem-row ${p.severity}`} key={i}>
                    <span className="sev">{p.severity === "error" ? "erro" : "aviso"}</span>
                    <span className="msg">{p.message}</span>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ParamEditor({
  conn,
  columns,
  paramCapable,
  allComponents,
  showRole,
  allowOperator,
}: {
  conn: ConnectionSpec;
  columns: { name: string; type: string }[];
  paramCapable: (c: ComponentSpec) => boolean;
  allComponents: { comp: ComponentSpec; windowId: string }[];
  showRole: boolean;
  allowOperator: boolean;
}) {
  const setParams = (params: ConnectionSpec["params"]) => patchConnection(conn.id, { params });

  return (
    <div className="field">
      <label>
        {conn.kind === "insert"
          ? "Valores gravados no banco"
          : conn.kind === "query"
            ? "Filtros da consulta"
            : conn.kind === "authenticate"
              ? "Usuário e senha"
              : "Campos (alterar e localizar)"}
      </label>
      {conn.params.length === 0 ? (
        <p className="panel-hint">Nenhum campo ligado ainda.</p>
      ) : (
        <table className="params-table">
          <thead>
            <tr>
              <th>Coluna</th>
              <th>Campo na tela</th>
              {showRole ? <th>Ação</th> : null}
              {allowOperator ? <th>Operador</th> : null}
              <th />
            </tr>
          </thead>
          <tbody>
            {conn.params.map((p, i) => (
              <tr key={i}>
                <td>
                  <select
                    className="select"
                    value={p.column}
                    onChange={(e) => {
                      const next = [...conn.params];
                      next[i] = { ...p, column: e.target.value };
                      setParams(next);
                    }}
                  >
                    <option value="">...</option>
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="select"
                    value={p.fromComponentId}
                    onChange={(e) => {
                      const next = [...conn.params];
                      next[i] = { ...p, fromComponentId: e.target.value };
                      setParams(next);
                    }}
                  >
                    <option value="">...</option>
                    {allComponents
                      .filter(({ comp }) => paramCapable(comp))
                      .map(({ comp }) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.id}
                        </option>
                      ))}
                  </select>
                </td>
                {showRole ? (
                  <td>
                    <select
                      className="select"
                      value={p.role}
                      onChange={(e) => {
                        const next = [...conn.params];
                        next[i] = { ...p, role: e.target.value as ParamRole };
                        setParams(next);
                      }}
                    >
                      <option value="set">Alterar</option>
                      <option value="where">Localizar</option>
                    </select>
                  </td>
                ) : null}
                {allowOperator ? (
                  <td>
                    <select
                      className="select"
                      value={p.operator}
                      onChange={(e) => {
                        const next = [...conn.params];
                        next[i] = { ...p, operator: e.target.value as QueryOperator };
                        setParams(next);
                      }}
                    >
                      <option value="=">=</option>
                      <option value=">">{">"}</option>
                      <option value="<">{"<"}</option>
                      <option value=">=">{">="}</option>
                      <option value="<=">{"<="}</option>
                      <option value="LIKE">contém</option>
                    </select>
                  </td>
                ) : null}
                <td>
                  <button
                    className="btn ghost icon sm"
                    aria-label="Remover campo"
                    onClick={() => setParams(conn.params.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        className="btn sm"
        onClick={() =>
          setParams([
            ...conn.params,
            {
              column: columns[0]?.name ?? "",
              fromComponentId: "",
              role: conn.kind === "insert" ? "set" : "where",
              operator: conn.kind === "query" ? "LIKE" : "=",
            },
          ])
        }
      >
        + Campo
      </button>
    </div>
  );
}
