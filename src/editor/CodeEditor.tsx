import { useMemo, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import { autocompletion, CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import { vscodeDark } from "../theme-vscode";
import { setTabContent } from "../actions";
import { useStore } from "../store";
import { getModelCompletions, getJavaKeywords, type CompletionItem } from "./completions";

export default function CodeEditor() {
  const openTabs = useStore((s) => s.openTabs);
  const centerTab = useStore((s) => s.centerTab);
  const model = useStore((s) => s.model);
  const path = centerTab.startsWith("file:") ? centerTab.slice(5) : "";
  const tab = openTabs.find((t) => t.path === path) ?? null;

  const modelCompletionsRef = useRef<CompletionItem[]>([]);
  const keywordsRef = useRef<CompletionItem[]>([]);

  // Update completions when model changes
  useEffect(() => {
    modelCompletionsRef.current = getModelCompletions(model);
    keywordsRef.current = getJavaKeywords();
  }, [model]);

  const completionSource = useMemo(() => {
    return (context: CompletionContext): CompletionResult | null => {
      const word = context.matchBefore(/\w*$/);
      if (!word || (word.from === word.to && !context.explicit)) {
        return null;
      }

      const allItems = [...modelCompletionsRef.current, ...keywordsRef.current];

      const options: Completion[] = allItems.map((item) => ({
        label: item.label,
        type: item.type,
        detail: item.detail,
        boost: item.boost,
        apply: item.label,
      }));

      return {
        from: word.from,
        options,
        validFor: /^\w*$/,
      };
    };
  }, []);

  const extensions = useMemo(() => [java(), autocompletion({ override: [completionSource] })], [completionSource]);

  if (!tab) {
    return (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          color: "var(--text-3)",
          fontSize: 13,
        }}
      >
        Abra um arquivo na aba "Arquivos" para editar o código.
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {tab.generated ? (
        <div className="generated-banner">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6.2" />
            <path d="M8 5v3.5M8 11h.01" strokeLinecap="round" />
          </svg>
          Arquivo gerado pelo modelo. Edite aqui se quiser (o arquivo é seu), mas uma nova geração
          a partir do modelo substitui o conteúdo: uma cópia de segurança é guardada.
        </div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0 }}>
        <CodeMirror
          value={tab.content}
          theme={vscodeDark}
          extensions={extensions}
          height="100%"
          style={{ height: "100%", fontSize: 13 }}
          onChange={(value) => setTabContent(tab.path, value)}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
            autocompletion: true,
          }}
        />
      </div>
    </div>
  );
}