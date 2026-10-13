import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { api } from "./api";
import "./styles.css";

// Erros não tratados vão para o log do app (ajudam o suporte e a depuração).
window.addEventListener("error", (e) => {
  void api.clientLog(`window.onerror: ${e.message} @ ${e.filename}:${e.lineno}`).catch(() => {});
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = (e as PromiseRejectionEvent).reason;
  void api
    .clientLog(`unhandledrejection: ${reason instanceof Error ? reason.stack || reason.message : String(reason)}`)
    .catch(() => {});
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
