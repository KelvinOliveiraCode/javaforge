import { useEffect, useState } from "react";

const CHAVE = "javaforge-tema";

/** Aplica o tema salvo na sessão anterior (chamado uma vez no início do app). */
export function aplicarTemaSalvo(): void {
  const salvo = window.localStorage.getItem(CHAVE);
  if (salvo === "light" || salvo === "dark") document.documentElement.dataset.theme = salvo;
}

/** Botão que alterna entre tema escuro e claro, guardando a escolha. */
export default function ThemeToggle() {
  const [claro, setClaro] = useState(
    () => document.documentElement.dataset.theme === "light",
  );

  useEffect(() => {
    aplicarTemaSalvo();
  }, []);

  const alternar = () => {
    const proximo = claro ? "dark" : "light";
    document.documentElement.dataset.theme = proximo;
    window.localStorage.setItem(CHAVE, proximo);
    setClaro(proximo === "light");
  };

  return (
    <button
      className="btn ghost icon"
      onClick={alternar}
      aria-label={claro ? "Usar tema escuro" : "Usar tema claro"}
      title={claro ? "Tema escuro" : "Tema claro"}
    >
      {claro ? "☾" : "☀"}
    </button>
  );
}
