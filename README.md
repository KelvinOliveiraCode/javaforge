# javaforge

![JavaScript/TypeScript](https://img.shields.io/badge/JS-TS-yellow?logo=javascript)   ![status: concluido](https://img.shields.io/badge/status-concluido-green)   ![licenca: MIT](https://img.shields.io/badge/licenca-MIT-blue)

## Resumo

Aplicacao web em JavaScript/TypeScript. JavaForge: Visual Java Swing app builder with SQLite. Drag-and-drop UI, no-code event connections, generates complete Maven projects.

## Problema / por que existe

O projeto entrega uma interface ou utilitario web para um recorte especifico, com foco em navegador como ambiente de execucao e sem dependencia de servidor proprio.

## Arquitetura

- Camada de apresentacao: componentes e paginas que renderizam a interface.
- Camada de logica: funcoes e hooks que processam dados e estado.
- Comunicacao: requisicoes HTTP a APIs externas ou dados locais, quando aplicavel.

O build e feito com Vite (ou ferramenta equivalente), gerando arquivos estaticos prontos para hospedagem.

## Tecnologias

- JavaScript / TypeScript
- @codemirror/lang-java
- @codemirror/state
- @codemirror/view
- @tauri-apps/api
- @tauri-apps/plugin-dialog
- @tauri-apps/plugin-opener
- @uiw/codemirror-themes
- @uiw/react-codemirror
- codemirror
- react
- react-dom
- @tauri-apps/cli
- @testing-library/dom
- @testing-library/jest-dom

- Sem CI configurado neste repositorio.

O repositorio contem testes automatizados.

## O que faz

JavaForge: Visual Java Swing app builder with SQLite. Drag-and-drop UI, no-code event connections, generates complete Maven projects.

## Como rodar

Requisitos: Node.js e npm (ou yarn/pnpm).

```
# instalar dependencias
npm install

# rodar em desenvolvimento
vite

# build para producao
tsc --noEmit && vite build

# rodar testes
vitest run
```

## Estrutura do projeto

- src/ (39 arquivo(s))
- src-tauri/ (33 arquivo(s))
- vendor/ (8 arquivo(s))
- tools/ (7 arquivo(s))
- public/ (1 arquivo(s))
- .gitignore, DESIGN.md, index.html, JavaForge.exe, package-lock.json, package.json, README.en.md, README.md, tsconfig.json, vite.config.ts e mais 1


## Trade-offs e decisões

- Build estatico: facil de hospedar (GitHub Pages, Vercel, Netlify) sem servidor.
- Dependencias minimas para reduzir superficie de manutencao.
- Navegador como unico ambiente de execucao necessario.

## Limitações conhecidas

- Funciona no navegador; depende de conexao a internet para recursos externos.


## Testes

```
vitest run
```

## Licença

Distribuído sob a licenca MIT. Consulte o arquivo `LICENSE` do repositorio.

## Autor

Kelvin Oliveira, https://github.com/KelvinOliveiraCode
Portfolio: https://kelvinoliveiracode.github.io/portfolio/
