import { useRef, useState } from "react";
import { catalogOf } from "../catalog";
import { findWindow } from "../model-ops";
import {
  addComponentAt,
  addComponentToPanel,
  addWindow,
  deleteWindow,
  setMainWindow,
  updateComponent,
  updateWindow,
} from "../actions";
import { store, useStore } from "../store";
import type { ComponentSpec } from "../types";

const GRID = 10;

export default function Designer() {
  const model = useStore((s) => s.model);
  const windowId = useStore((s) => s.designerWindowId);
  const selectedId = useStore((s) => s.selectedComponentId);
  const snapGrid = useStore((s) => s.snapGrid);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [dropHint, setDropHint] = useState(false);
  const win = findWindow(model, windowId);

  if (!win) {
    return (
      <div className="designer">
        <div className="designer-bar">
          <span className="lbl">Janela não encontrada</span>
        </div>
        <div className="designer-canvas-wrap checker" />
      </div>
    );
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropHint(false);
    const type = e.dataTransfer.getData("application/x-javaconponent");
    if (!type) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // painel sob o cursor?
    const panel = win.components.find(
      (c) =>
        (c.type === "JPanel" || c.type === "JScrollPane") &&
        px >= c.x && px <= c.x + c.width && py >= c.y && py <= c.y + c.height,
    );
    if (panel) {
      addComponentToPanel(type as ComponentSpec["type"], panel.id, snap(px - panel.x), snap(py - panel.y));
    } else {
      addComponentAt(type as ComponentSpec["type"], snap(px), snap(py));
    }
  };

  const connCount = (compId: string) =>
    model.connections.filter((c) => c.componentId === compId).length;

  const renderComp = (comp: ComponentSpec, parent?: ComponentSpec) => {
    const abs = parent ? { x: comp.x - parent.x, y: comp.y - parent.y } : { x: comp.x, y: comp.y };
    const style: React.CSSProperties = {
      left: abs.x,
      top: abs.y,
      width: comp.width,
      height: comp.height,
    };
    const selected = comp.id === selectedId;
    const badge = connCount(comp.id);

    const move = (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).classList.contains("dc-resize")) return;
      e.stopPropagation();
      store.setState({ selectedComponentId: comp.id });
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = comp.x;
      const origY = comp.y;
      const onMove = (ev: PointerEvent) => {
        const nx = origX + (ev.clientX - startX);
        const ny = origY + (ev.clientY - startY);
        updateComponent(comp.id, { x: Math.max(0, snap(nx)), y: Math.max(0, snap(ny)) });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    const resize = (e: React.PointerEvent) => {
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const w0 = comp.width;
      const h0 = comp.height;
      const onMove = (ev: PointerEvent) => {
        updateComponent(comp.id, {
          width: Math.max(24, snap(w0 + (ev.clientX - startX))),
          height: Math.max(16, snap(h0 + (ev.clientY - startY))),
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    const kids = win.components.filter((c) => c.parentId === comp.id);

    const body = renderBody(comp, kids, renderComp);

    return (
      <div
        key={comp.id}
        className={`dc ${cssClassOf(comp)} ${selected ? "selected" : ""} ${
          comp.type === "JPanel" && comp.props.title ? "titled" : ""
        }`}
        style={style}
        onPointerDown={move}
        title={`${comp.id} · ${catalogOf(comp.type).label}`}
        {...(comp.type === "JPanel" && comp.props.title
          ? { "data-title": String(comp.props.title) }
          : {})}
      >
        {body}
        {badge > 0 ? <span className="dc-badge-conn">{badge}</span> : null}
        {selected ? <span className="dc-resize" onPointerDown={resize} /> : null}
      </div>
    );
  };

  const tops = win.components.filter((c) => !c.parentId || c.parentId === "");

  return (
    <div className="designer">
      <div className="designer-bar">
        <span className="lbl">Janela</span>
        {model.windows.map((w) => (
          <button
            key={w.id}
            className={`win-tab ${w.id === windowId ? "active" : ""}`}
            onClick={() => {
              store.setState({ designerWindowId: w.id, selectedComponentId: null });
            }}
          >
            {w.title}
          </button>
        ))}
        <button className="btn sm" onClick={addWindow}>
          + Janela
        </button>
        <span className="grow" />
        <label className="checkline">
          <input
            type="checkbox"
            checked={snapGrid}
            onChange={(e) => store.setState({ snapGrid: e.target.checked })}
          />
          Grade {GRID}px
        </label>
        <button
          className="btn sm"
          onClick={() => setMainWindow(win.id)}
          disabled={model.mainWindowId === win.id}
          title="Janela que abre ao iniciar o aplicativo"
        >
          {model.mainWindowId === win.id ? "Janela inicial" : "Definir como inicial"}
        </button>
        <button className="btn sm" onClick={() => updateWindow(win.id, { width: 640, height: 480 })}>
          640×480
        </button>
        <button
          className="btn sm danger"
          onClick={() => deleteWindow(win.id)}
          disabled={model.windows.length <= 1}
        >
          Excluir janela
        </button>
      </div>
      <div className="designer-canvas-wrap checker">
        <div
          className="win-frame"
          style={{ width: win.width, height: win.height }}
          onDragOver={(e) => {
            e.preventDefault();
            setDropHint(true);
          }}
          onDragLeave={() => setDropHint(false)}
          onDrop={onDrop}
        >
          <div className="win-title">
            <span>{win.title || "(sem título)"}</span>
          </div>
          <div
            ref={surfaceRef}
            className={`win-surface ${dropHint ? "drop-hint" : ""}`}
            style={{ height: win.height - 26 }}
            onPointerDown={() => store.setState({ selectedComponentId: null })}
          >
            {snapGrid ? <div className="grid-layer" /> : null}
            {tops.length === 0 ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  color: "#5b6470",
                  fontSize: 12,
                  pointerEvents: "none",
                }}
              >
                Arraste componentes da paleta ou clique neles para adicionar aqui.
              </div>
            ) : null}
            {tops.map((c) => renderComp(c))}
          </div>
        </div>
      </div>
    </div>
  );
}

function snap(v: number): number {
  const on = store.getState().snapGrid;
  return on ? Math.round(v / GRID) * GRID : Math.round(v);
}

function cssClassOf(comp: ComponentSpec): string {
  switch (comp.type) {
    case "JButton":
      return "dc-btn";
    case "JTextField":
      return "dc-input";
    case "JPasswordField":
      return "dc-pwd";
    case "JTextArea":
      return "dc-textarea";
    case "JCheckBox":
      return "dc-check";
    case "JRadioButton":
      return "dc-radio";
    case "JComboBox":
      return "dc-combo";
    case "JTable":
      return "dc-table";
    case "JPanel":
      return "dc-panel";
    case "JScrollPane":
      return "dc-scroll";
    case "JProgressBar":
      return "dc-progress";
    case "JSpinner":
      return "dc-spinner";
    default:
      return "";
  }
}

function renderBody(
  comp: ComponentSpec,
  kids: ComponentSpec[],
  renderComp: (c: ComponentSpec, parent?: ComponentSpec) => React.ReactNode,
): React.ReactNode {
  const text = String(comp.props.text ?? "");
  switch (comp.type) {
    case "JLabel":
      return <span className="dc-label">{text}</span>;
    case "JButton":
      return <span className="dc-label">{text || "Botão"}</span>;
    case "JTextField":
      return <span className="dc-label" style={{ color: "#5b6470" }}>{text || ""}</span>;
    case "JPasswordField":
      return (
        <span className="dc-label" style={{ color: "#5b6470", letterSpacing: "0.2em" }}>
          ••••••••
        </span>
      );
    case "JTextArea":
      return <span className="dc-label" style={{ color: "#3c434d", whiteSpace: "pre-wrap" }}>{text}</span>;
    case "JCheckBox":
      return (
        <>
          <span className="dc-box">{comp.props.selected ? "✓" : ""}</span>
          <span className="dc-label">{text}</span>
        </>
      );
    case "JRadioButton":
      return (
        <>
          <span className="dc-box">{comp.props.selected ? "●" : ""}</span>
          <span className="dc-label">{text}</span>
        </>
      );
    case "JComboBox":
      return (
        <>
          <span className="dc-label">{text || String(comp.props.items ?? "").split(",")[0]}</span>
          <span className="caret">▼</span>
        </>
      );
    case "JList": {
      const items = String(comp.props.items ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      return (
        <div style={{ width: "100%", padding: "2px 4px", display: "grid", gap: 1 }}>
          {items.slice(0, 6).map((it, i) => (
            <div key={i} style={{ fontSize: 11, color: "#2c333d" }}>
              {it}
            </div>
          ))}
        </div>
      );
    }
    case "JTable": {
      const model = store.getState().model;
      const headers =
        model.connections.find((c) => c.targetTableComponentId === comp.id)?.queryColumns.map(
          (q: { column: string; header: string }) => q.header,
        ) ?? ["Coluna 1", "Coluna 2", "Coluna 3"];
      return (
        <div className="dc-table">
          <div className="dt-head">
            {headers.map((h: string, i: number) => (
              <div key={i}>{h}</div>
            ))}
          </div>
          {[0, 1, 2].map((r) => (
            <div className="dt-row" key={r}>
              {headers.map((_: string, i: number) => (
                <div key={i}>&nbsp;</div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    case "JPanel":
      return (
        <div style={{ position: "absolute", inset: 0 }}>
          {comp.props.title ? (
            <span className="dc-label" style={{ position: "absolute", top: 2, left: 6, fontSize: 11 }}>
              {String(comp.props.title)}
            </span>
          ) : null}
          {kids.map((k) => renderComp(k, comp))}
        </div>
      );
    case "JScrollPane":
      return (
        <div style={{ position: "absolute", inset: 2 }}>
          {kids.map((k) => renderComp(k, comp))}
        </div>
      );
    case "JProgressBar": {
      const min = Number(comp.props.min ?? 0);
      const max = Number(comp.props.max ?? 100);
      const value = Number(comp.props.value ?? 0);
      const pct = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));
      return (
        <div className="dc-progress">
          <div className="fill" style={{ width: `${pct}%` }} />
        </div>
      );
    }
    case "JSpinner":
      return (
        <>
          <span className="dc-label">{String(comp.props.value ?? 1)}</span>
          <span className="arrows">
            <span>▲</span>
            <span>▼</span>
          </span>
        </>
      );
    default:
      return null;
  }
}
