import { useEffect } from "react";
import { api } from "./api";
import { appendOutput, showToast, store, useStore } from "./store";
import ErrorBoundary from "./ErrorBoundary";
import IDE from "./ide/IDE";
import StartScreen from "./start/StartScreen";

export default function App() {
  const screen = useStore((s) => s.screen);
  const toast = useStore((s) => s.toast);

  useEffect(() => {
    let un1: (() => void) | undefined;
    let un2: (() => void) | undefined;
    api.onRunOutput((l) =>
      appendOutput([{ stream: l.stream as "out" | "err" | "sys", line: l.line }]),
    ).then((u) => {
      un1 = u;
    });
    api.onRunExit((code) => {
      store.setState({ running: false });
      appendOutput(`> processo encerrado (código ${code})`);
      if (code !== 0) showToast("error", `O aplicativo encerrou com código ${code}.`);
    }).then((u) => {
      un2 = u;
    });
    return () => {
      un1?.();
      un2?.();
    };
  }, []);

  return (
    <>
      {screen === "start" ? (
        <ErrorBoundary where="a tela inicial">
          <StartScreen />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary where="a bancada">
          <IDE />
        </ErrorBoundary>
      )}
      {toast ? (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.text}
        </div>
      ) : null}
    </>
  );
}
