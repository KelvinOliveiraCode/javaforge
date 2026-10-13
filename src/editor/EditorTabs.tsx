import { closeTab } from "../actions";
import { store, useStore } from "../store";

export default function EditorTabs() {
  const tabs = useStore((s) => s.openTabs);
  const centerTab = useStore((s) => s.centerTab);

  if (tabs.length === 0) return null;

  return (
    <div className="editor-tabs" role="tablist">
      {tabs.map((t) => {
        const active = centerTab === `file:${t.path}`;
        return (
          <div
            key={t.path}
            className={`tab ${active ? "active" : ""}`}
            role="tab"
            aria-selected={active}
            onClick={() => store.setState({ centerTab: `file:${t.path}` })}
          >
            <span>{t.name}</span>
            {t.dirty ? <span className="dot" title="Não salvo" /> : null}
            <button
              className="close"
              aria-label={`Fechar ${t.name}`}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.path);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
