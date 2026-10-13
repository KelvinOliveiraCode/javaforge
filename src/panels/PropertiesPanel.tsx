import { catalogOf } from "../catalog";
import { findWindow } from "../model-ops";
import {
  deleteComponent,
  duplicateComponent,
  renameComponent,
  updateComponent,
  updateComponentProps,
  updateWindow,
} from "../actions";
import { useStore } from "../store";
import type { PropFieldSpec } from "../catalog";

export default function PropertiesPanel() {
  const model = useStore((s) => s.model);
  const windowId = useStore((s) => s.designerWindowId);
  const selectedId = useStore((s) => s.selectedComponentId);
  const win = findWindow(model, windowId);
  const comp = win?.components.find((c) => c.id === selectedId) ?? null;

  if (!win) return <div className="panel-pad"><p className="panel-hint">Nenhuma janela selecionada.</p></div>;

  if (!comp) {
    return (
      <div className="panel-pad">
        <div className="props-title">Janela</div>
        <div className="prop-grid">
          <div className="field full">
            <label>Título</label>
            <input
              className="input"
              value={win.title}
              onChange={(e) => updateWindow(win.id, { title: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Largura</label>
            <input
              className="input"
              type="number"
              value={win.width}
              onChange={(e) => updateWindow(win.id, { width: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label>Altura</label>
            <input
              className="input"
              type="number"
              value={win.height}
              onChange={(e) => updateWindow(win.id, { height: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="props-title">Dica</div>
        <p className="panel-hint" style={{ padding: "0 10px 10px" }}>
          Clique em um componente na tela para editar suas propriedades aqui. Arraste da paleta para
          adicionar novos.
        </p>
      </div>
    );
  }

  const entry = catalogOf(comp.type);
  const conns = model.connections.filter((c) => c.componentId === comp.id);

  return (
    <div className="panel-pad">
      <div className="props-title">Componente</div>
      <div className="prop-grid">
        <div className="field">
          <label>Identificador (variável Java)</label>
          <input
            className="input mono"
            defaultValue={comp.id}
            key={comp.id}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== comp.id) renameComponent(comp.id, v);
            }}
          />
        </div>
        <div className="field">
          <label>Tipo</label>
          <input className="input" value={entry.label} disabled />
        </div>
        <div className="field">
          <label>X</label>
          <input
            className="input"
            type="number"
            value={comp.x}
            onChange={(e) => updateComponent(comp.id, { x: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Y</label>
          <input
            className="input"
            type="number"
            value={comp.y}
            onChange={(e) => updateComponent(comp.id, { y: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Largura</label>
          <input
            className="input"
            type="number"
            value={comp.width}
            onChange={(e) => updateComponent(comp.id, { width: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Altura</label>
          <input
            className="input"
            type="number"
            value={comp.height}
            onChange={(e) => updateComponent(comp.id, { height: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="props-title">Propriedades Swing</div>
      <div className="prop-grid">
        {entry.propFields.map((f) => (
          <PropField
            key={f.key}
            spec={f}
            value={comp.props[f.key]}
            onChange={(v) => updateComponentProps(comp.id, f.key, v)}
          />
        ))}
      </div>

      {conns.length > 0 ? (
        <>
          <div className="props-title">Conexões neste componente</div>
          <div className="conn-list">
            {conns.map((c) => (
              <div className="conn-card" key={c.id}>
                <div className="conn-name">{c.name}</div>
                <div className="conn-summary">
                  {c.event} · {c.kind}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div style={{ display: "flex", gap: 8, padding: "6px 10px 14px" }}>
        <button className="btn sm" onClick={() => duplicateComponent(comp.id)}>
          Duplicar
        </button>
        <button className="btn sm danger" onClick={() => deleteComponent(comp.id)}>
          Excluir
        </button>
      </div>
    </div>
  );
}

function PropField({
  spec,
  value,
  onChange,
}: {
  spec: PropFieldSpec;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  if (spec.kind === "boolean") {
    return (
      <div className="field full">
        <label className="checkline">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {spec.label}
        </label>
      </div>
    );
  }
  return (
    <div className={`field ${spec.kind === "text" ? "full" : ""}`}>
      <label>{spec.label}</label>
      <input
        className="input"
        type={spec.kind === "number" ? "number" : "text"}
        value={value === undefined ? "" : String(value)}
        onChange={(e) =>
          onChange(spec.kind === "number" ? Number(e.target.value) || 0 : e.target.value)
        }
      />
    </div>
  );
}
