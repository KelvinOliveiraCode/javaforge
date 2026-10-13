import { Component, type ReactNode } from "react";
import { store } from "./store";

interface Props {
  children: ReactNode;
  where: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown): void {
    console.error(`[JavaForge] falha em ${this.props.where}:`, error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          background: "var(--bg-0)",
          color: "var(--text-1)",
          padding: 32,
        }}
        role="alert"
      >
        <div style={{ maxWidth: 720 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Algo deu errado em {this.props.where}</h2>
          <p style={{ color: "var(--text-2)", fontSize: 13 }}>
            A interface encontrou um erro inesperado. O restante do app continua funcionando.
          </p>
          <pre
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--line-2)",
              borderRadius: 6,
              padding: 12,
              fontSize: 12,
              overflow: "auto",
              maxHeight: 260,
              whiteSpace: "pre-wrap",
            }}
          >
            {error.message}
            {"\n"}
            {error.stack}
          </pre>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="btn primary"
              onClick={() => this.setState({ error: null })}
            >
              Tentar de novo
            </button>
            <button
              className="btn"
              onClick={() => {
                this.setState({ error: null });
                store.setState({ screen: "start" });
              }}
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
