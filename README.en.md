# javaforge

<div align="center">

**English** · [Português (Brasil)](README.md)

</div>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/) [![MIT License](https://img.shields.io/badge/License-MIT-f4c430?style=flat-square)](LICENSE)

### JavaForge: Visual Java Swing app builder with SQLite. Drag-and-drop UI, no-code event connections, generates complete Maven projects.

---

## What it is

JavaForge: Visual Java Swing app builder with SQLite. Drag-and-drop UI, no-code event connections, generates complete Maven projects.

---

## Quick Start

```bash
# Clone and enter
git clone https://github.com/KelvinOliveiraCode/<repo>.git
cd <repo>

# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Run tests
npm test
```

## How it works

Arquitetura de componente em arquivo único (`App.tsx`): toda a UI, estado e lógica vivem em um arquivo para simplicidade de deploy e build zero-config.

Decisões arquiteturais principais:
- **Estado global** via `useState` + `useMemo` (evita overhead do Context API)
- **Agregações memoizadas** para gráficos e insights
- **Dados mock in-line** como constantes TypeScript para prototipagem sem backend
- **IA baseada em regras** (`getAIResponse`) ,  determinística, offline, custo zero

---

## Capabilities

| Capacidade | Descrição |
|------------|-------------|
| Dashboard | 6 cards de métricas (Saldo, Receitas, Despesas, Economia, Investimentos, Patrimônio) |
| Fluxo de Caixa | Gráfico de barras (7d/30d) com Recharts ,  Receitas, Despesas, Saldo por período |
| Orçamentos | Orçamentos por categoria com barras de progresso, alertas de estouro |
| Metas | Anéis de progresso com cálculo de economia mensal e contagem regressiva |
| Assistente IA | Chat baseado em regras (getAIResponse) ,  análise de gastos, dicas, projeções |
| Insights | Alertas automáticos: picos de delivery, crescimento patrimonial, breakdown por categoria |
| Transações | Adicionar/editar receitas/despesas com categorias, tags, seletor de data |
| Persistência | localStorage ,  estado sobrevive a reload, zero backend |


---



---

## FAQ

<details>
<summary><strong>What is this project?</strong></summary>

A React/TypeScript study/project demonstrating core concepts.

</details>

<details>
<summary><strong>How do I run it?</strong></summary>

See [Quick Start](#quick-start) for copy-paste commands.

</details>

<details>
<summary><strong>Are there tests?</strong></summary>

No automated tests in this repository.

</details>

<details>
<summary><strong>Can I use this in production?</strong></summary>

This is a **study/portfolio project**. Review and harden (auth, persistence, monitoring, etc.) before production use.

</details>



---

## Documentation

- **Source Code** ,  Browse the `src/` directory for implementation details
- **API Reference** ,  TypeScript types in source
- **Architecture Diagram** ,  See [architecture.mermaid](docs/architecture.mermaid) (if present)
- **Changelog** ,  [CHANGELOG.md](CHANGELOG.md) (if present)
- **Contributing** ,  [CONTRIBUTING.md](CONTRIBUTING.md) (if present)

## License

[MIT](LICENSE) ,  Kelvin Oliveira

---

<div align="center">

**Built with** · TypeScript + React + Vite + Tailwind

**Author** · [Kelvin Oliveira](https://github.com/KelvinOliveiraCode) · [Portfolio](https://kelvinoliveiracode.github.io/portfolio/)

</div>