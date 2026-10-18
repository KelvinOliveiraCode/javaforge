
# javaforge

![language: JavaScript/TypeScript](https://img.shields.io/badge/language-JS-TS-yellow?logo=javascript)   ![status: done](https://img.shields.io/badge/status-done-green)   ![license: MIT](https://img.shields.io/badge/license-MIT-blue)

## Summary

Web application in JavaScript/TypeScript. JavaForge: Visual Java Swing app builder with SQLite. Drag-and-drop UI, no-code event connections, generates complete Maven projects.

## Problem / why it exists

The project delivers a web interface or utility for a specific scope, with focus on the browser as runtime and no dependency on its own server.

## Architecture

- Presentation layer: components and pages that render the interface.
- Logic layer: functions and hooks that process data and state.
- Communication: HTTP requests to external APIs or local data, when applicable.

The build is done with Vite (or equivalent tool), generating static files ready for hosting.

## Technologies

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

- No CI configured in this repository.

The repository contains automated tests.

## What it does

JavaForge: Visual Java Swing app builder with SQLite. Drag-and-drop UI, no-code event connections, generates complete Maven projects.

## How to run

Requirements: Node.js and npm (or yarn/pnpm).

```
# install dependencies
npm install

# run in development
vite

# production build
tsc --noEmit && vite build

# run tests
vitest run
```

## Project structure

- src/ (39 arquivo(s))
- src-tauri/ (33 arquivo(s))
- vendor/ (8 arquivo(s))
- tools/ (7 arquivo(s))
- public/ (1 arquivo(s))
- .gitignore, DESIGN.md, index.html, JavaForge.exe, package-lock.json, package.json, README.en.md, README.md, tsconfig.json, vite.config.ts e mais 1


## Trade-offs and decisions

- Static build: easy to host (GitHub Pages, Vercel, Netlify) without a server.
- Minimal dependencies to reduce maintenance surface.
- Browser as the only runtime required.

## Known limitations

- Runs in the browser; depends on internet connection for external resources.


## Tests

```
vitest run
```

## License

Distributed under the MIT License. See the `LICENSE` file in this repository.

## Author

Kelvin Oliveira, https://github.com/KelvinOliveiraCode
Portfolio: https://kelvinoliveiracode.github.io/portfolio/
