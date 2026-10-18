# javaforge

<div align="center">

[English](README.en.md) · **Português (Brasil)**

</div>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/) [![MIT License](https://img.shields.io/badge/License-MIT-f4c430?style=flat-square)](LICENSE)

### JavaForge: Visual Java Swing app builder with SQLite. Drag-and-drop UI, no-code event connections, generates complete Maven projects.

---

## O que é

JavaForge: Visual Java Swing app builder with SQLite. Drag-and-drop UI, no-code event connections, generates complete Maven projects.

---

## Início Rápido

```bash
# Clone e entre
git clone https://github.com/KelvinOliveiraCode/<repo>.git
cd <repo>

# Instale dependências
npm install

# Servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Execute os testes
npm test
```

## Como funciona

Arquitetura de componente em arquivo único (`App.tsx`): toda a UI, estado e lógica vivem em um arquivo para simplicidade de deploy e build zero-config.

Decisões arquiteturais principais:
- **Estado global** via `useState` + `useMemo` (evita overhead do Context API)
- **Agregações memoizadas** para gráficos e insights
- **Dados mock in-line** como constantes TypeScript para prototipagem sem backend
- **IA baseada em regras** (`getAIResponse`) ,  determinística, offline, custo zero

---

## Capacidades

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

## Perguntas Frequentes

<details>
<summary><strong>O que é este projeto?</strong></summary>

Um estudo/projeto em React/TypeScript demonstrando conceitos fundamentais.

</details>

<details>
<summary><strong>Como executar?</strong></summary>

Veja [Início Rápido](#início-rápido) para comandos copiáveis.

</details>

<details>
<summary><strong>Há testes?</strong></summary>

Nenhum teste automatizado neste repositório.

</details>

<details>
<summary><strong>Posso usar em produção?</strong></summary>

Este é um **projeto de estudo/portfólio**. Revise e endureça (auth, persistência, monitoramento, etc.) antes de usar em produção.

</details>



---

## Documentação

- **Código-Fonte** ,  Navegue pelo diretório `src/` para detalhes de implementação
- **Referência da API** ,  Tipos TypeScript no fonte
- **Diagrama de Arquitetura** ,  Veja [architecture.mermaid](docs/architecture.mermaid) (se presente)
- **Changelog** ,  [CHANGELOG.md](CHANGELOG.md) (se presente)
- **Contribuindo** ,  [CONTRIBUTING.md](CONTRIBUTING.md) (se presente)

## Licença

[MIT](LICENSE) ,  Kelvin Oliveira

---

<div align="center">

**Construído com** · TypeScript + React + Vite + Tailwind

**Autor** · [Kelvin Oliveira](https://github.com/KelvinOliveiraCode) · [Portfolio](https://kelvinoliveiracode.github.io/portfolio/)

</div>