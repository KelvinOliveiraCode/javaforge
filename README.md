# javaforge

<div align="center">

**English** · [Português (Brasil)](README.md)

</div>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/) [![MIT License](https://img.shields.io/badge/License-MIT-f4c430?style=flat-square)](LICENSE)

### JavaForge: Visual Java Swing app builder with SQLite. Drag-and-drop UI, no-code event connections, generates complete Maven projects.

---

## O que é

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

## Como funciona

Single-file component architecture (`App.tsx`): all UI, state, and logic live in one file for deploy simplicity and zero-config build.

Key architectural decisions:
- **Global state** via `useState` + `useMemo` (avoids Context API overhead)
- **Memoized aggregations** for charts and insights
- **Inline mock data** as TypeScript constants for zero-backend prototyping
- **Rule-based AI** (`getAIResponse`) ,  deterministic, offline, zero-cost

---

## Capabilities

| Capability | Description |
|------------|-------------|
| Dashboard | 6 metric cards (Balance, Income, Expense, Savings, Investments, Net Worth) |
| Cash Flow | Bar chart (7d/30d) with Recharts ,  Income, Expense, Net per period |
| Budget Tracking | Category budgets with progress bars, over/under alerts |
| Goal Management | Progress rings with monthly savings calculation & deadline countdown |
| AI Assistant | Rule-based chat (getAIResponse) ,  spending analysis, savings tips, projections |
| Insights | Auto-generated alerts: delivery spikes, net worth growth, category breakdown |
| Transactions | Add/edit income/expense with categories, tags, date picker |
| Persistence | localStorage ,  state survives reload, zero backend |


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