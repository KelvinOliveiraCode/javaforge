import { CATALOG, COMPONENT_GROUPS } from "../catalog";
import { addComponentAt } from "../actions";
import { store, useStore } from "../store";
import type { ComponentType } from "../types";

export default function PalettePanel() {
  const designerWindowId = useStore((s) => s.designerWindowId);

  const onDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData("application/x-javaconponent", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const clickPos = () => {
    const s = store.getState();
    const win = s.model.windows.find((w) => w.id === s.designerWindowId);
    const n = win ? win.components.length : 0;
    return { x: 30 + (n % 8) * 24, y: 40 + (n % 8) * 24 };
  };

  return (
    <div className="panel-pad" style={{ gap: 0 }}>
      <p className="panel-hint" style={{ padding: "8px 10px 0" }}>
        Arraste um componente para a tela ou clique para adicionar. Cada item gera o código Swing
        correspondente.
      </p>
      {COMPONENT_GROUPS.map((group) => (
        <div className="palette-group" key={group}>
          <div className="palette-group-title">{group}</div>
          {CATALOG.filter((c) => c.group === group).map((c) => (
            <button
              key={c.type}
              className="palette-item"
              draggable
              onDragStart={(e) => onDragStart(e, c.type)}
              onClick={() => {
                const p = clickPos();
                addComponentAt(c.type, p.x, p.y);
              }}
              title={c.description}
            >
              <span className="swatch" aria-hidden>
                <Glyph type={c.type} />
              </span>
              <span>
                {c.label}
                <small>{c.description}</small>
              </span>
            </button>
          ))}
        </div>
      ))}
      <p className="panel-hint" style={{ padding: "4px 10px 14px" }}>
        Janela ativa: <strong>{designerWindowId}</strong>
      </p>
    </div>
  );
}

function Glyph({ type }: { type: ComponentType }) {
  const common = { width: 12, height: 12, viewBox: "0 0 12 12", fill: "none", stroke: "currentColor", strokeWidth: 1.2 } as const;
  switch (type) {
    case "JButton":
      return (
        <svg {...common}>
          <rect x="1" y="3.5" width="10" height="5" rx="1" />
        </svg>
      );
    case "JLabel":
      return (
        <svg {...common}>
          <path d="M1.5 3h9M1.5 6h6M1.5 9h4" />
        </svg>
      );
    case "JTextField":
      return (
        <svg {...common}>
          <rect x="1" y="3.5" width="10" height="5" rx="1" />
          <path d="M3 6h2" />
        </svg>
      );
    case "JPasswordField":
      return (
        <svg {...common}>
          <rect x="1" y="3.5" width="10" height="5" rx="1" />
          <circle cx="4.5" cy="6" r="0.7" />
          <circle cx="7.5" cy="6" r="0.7" />
        </svg>
      );
    case "JTextArea":
      return (
        <svg {...common}>
          <rect x="1" y="2" width="10" height="8" rx="1" />
          <path d="M3 4.5h6M3 6.5h4" />
        </svg>
      );
    case "JCheckBox":
      return (
        <svg {...common}>
          <rect x="1.5" y="2.5" width="3" height="3" rx="0.5" />
          <path d="M6 4h5" />
        </svg>
      );
    case "JRadioButton":
      return (
        <svg {...common}>
          <circle cx="3" cy="4" r="1.5" />
          <path d="M6 4h5" />
        </svg>
      );
    case "JComboBox":
      return (
        <svg {...common}>
          <rect x="1" y="3" width="10" height="5.5" rx="1" />
          <path d="M8.5 4.5l1 1.5 1-1.5" />
        </svg>
      );
    case "JTable":
      return (
        <svg {...common}>
          <rect x="1" y="2" width="10" height="8" rx="1" />
          <path d="M1 4.5h10M4.5 4.5V10" />
        </svg>
      );
    case "JList":
      return (
        <svg {...common}>
          <rect x="1" y="2" width="10" height="8" rx="1" />
          <path d="M3 4.5h6M3 6.5h6M3 8.5h3" />
        </svg>
      );
    case "JPanel":
      return (
        <svg {...common}>
          <rect x="1" y="2" width="10" height="8" rx="1" strokeDasharray="2 1.5" />
        </svg>
      );
    case "JScrollPane":
      return (
        <svg {...common}>
          <rect x="1.5" y="2" width="9" height="8" rx="1" />
          <path d="M9 3v6" />
        </svg>
      );
    case "JProgressBar":
      return (
        <svg {...common}>
          <rect x="1" y="4" width="10" height="4" rx="1" />
          <rect x="2" y="5" width="5" height="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "JSpinner":
      return (
        <svg {...common}>
          <rect x="1" y="3.5" width="7" height="5" rx="1" />
          <path d="M9 3.5l1.5 2.5L9 8.5" />
        </svg>
      );
    default:
      return null;
  }
}
