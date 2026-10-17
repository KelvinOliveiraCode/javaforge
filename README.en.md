# JavaForge

[![Rust](https://img.shields.io/badge/language-Rust-orange?logo=rust)](https://www.rust-lang.org/)
[![SQLite](https://img.shields.io/badge/database-SQLite-blue?logo=sqlite)](https://www.sqlite.org/)

Visual builder for Java Swing applications with a SQLite database, built with Tauri (Rust + React). Assemble screens by dragging components, connect events to database actions without writing code, and generate a complete Java project (Maven or Gradle) that compiles and runs outside the tool.

## Problem / Why it exists

Creating a Java Swing application with SQLite requires writing the database schema by hand, JDBC data access, screens, each window's layout, and event binding to database commands. Before anything works, you already have to write a lot of repetitive code. JavaForge exists to remove that step: design the interface visually, connect events to database actions (insert, query, update, delete, open window, show message) and generate a Java project ready to open in any editor and compile with Maven, Gradle or plain javac.

## What it does

- Start screen: create a blank project, from a ready-made template, or open an existing project, with a recent list. Deleting a project erases the entire folder and generated code from disk, always with confirmation. When creating, you can replace a folder that already exists, with an explicit warning that old files will be lost.
- Ready templates: "Login + main panel" (queries the users table in SQLite and opens the panel), "Registration (CRUD)" (search, save, update and delete with sample data), "Task list" (add, rename, delete and list; foreign key between tasks and projects tables), "Contact agenda" (name, phone and email) and "Calculator" (no database: runs Java code written by you).
- Safe editing: undo/redo (Ctrl+Z, Ctrl+Y) on any model change, with consecutive edits grouped into a single step. Import/export the model in .json to take an application from one computer to another.
- Light or dark theme, chosen with the sun/moon button in the title bar and remembered between sessions.
- Designer: 22 Swing components (button, label, text field, password field, text area, checkbox, radio button, combo box, list, table, panel, scroll pane, progress bar, spinner, toggle button, separator, slider, scroll bar, text pane, editor pane, toolbar and tree). Drag to move, handle to resize, 10 px grid, multiple windows per project and menu bar per window.
- Connections (the no-code glue): connect an event (click, Enter, focus lost) to an action: verify login, insert, update, delete, query and fill table, open window, show message or run manual code. Menu items also accept connections.
- Data: table and column editor (primary key, auto increment, required) and initial data. The app.db database is created in the project folder with one click.
- Database tab: run SQL by hand (query, insert, fix), view structure (tables, columns and relations) and reapply the model to the database. SQL that deletes or rewrites data asks for confirmation. Clicking app.db in the file tree opens this tab; the database is binary and does not open in the code editor.
- Code: the generated project is a complete Maven project (with Maven Wrapper) or Gradle, editable in the app editor (VS Code Dark+ theme) or in any external editor. Changes made from outside generate a backup before a new generation.
- Run: compiles and executes the generated app (Maven if available; otherwise javac with the embedded SQLite driver). F5 shortcut. The build tool (Maven, Gradle or none) is saved in app.model.json.

## Stack

- Frontend: React 18, TypeScript, Vite, CodeMirror 6 with Java support (@codemirror/lang-java, @uiw/react-codemirror) and VS Code Dark+ theme, @tauri-apps/api
- Backend: Rust (edition 2021), Tauri 2, tauri-plugin-dialog, tauri-plugin-opener, serde, serde_json, sha2
- Generated code: Java (JDK 17+), SQLite (jdbc driver embedded in vendor/sqlite-jdbc.jar), optional Maven Wrapper or Gradle Wrapper; plain javac as fallback when neither is installed
- Tests: vitest (frontend), cargo test (backend, end_to_end) and UI smoke script (tools/fumaca-ui.ps1)

## How it works

The app.model.json file at the root of each project is the source of truth: screens, components, connections, database and build tool. Saving the model regenerates the Java code (Main.java, Database.java, Schema.java and one class per window). Typical flow: create or open project, assemble screens in the designer, connect events to actions in the Connections panel, define tables and initial data, generate code, compile and run with F5. The generated code can be edited inside the app or in any external editor; JavaForge does not require you to keep using the tool.

## How to run

Requirements: Node 18+, Rust (stable) and JDK 17+ with JAVA_HOME defined (the app uses javac/java to compile and run generated projects). Maven or Gradle are optional: if they are in PATH, they are used; without either, compilation uses javac with the embedded SQLite driver.

```
npm install
npm run tauri dev
```

Installers are produced by running `npm run tauri build`.

```
npm run tauri build
```

Output in src-tauri/target/release/bundle (NSIS and MSI). You can also run directly: src-tauri/target/release/javaforge.exe (or JavaForge.exe at the repository root).

## Project structure

Repository

- src/ — React frontend — start/ (start screen and project creation), ide/ (workbench, title bar, status, shortcuts), designer/ (WYSIWYG canvas with drag, resize and selection), panels/ (files, palette, properties, connections, data, database, output, migration), editor/ (tabs and CodeMirror editor), components/, actions.ts, store.ts, model-ops.ts, catalog.ts, types.ts, styles.css, theme-vscode.ts
- src-tauri/ — Rust backend — src/lib.rs, model.rs, codegen.rs, templates.rs, commands.rs, runner.rs, registry.rs, util.rs; tests/end_to_end.rs; tauri.conf.json; build.rs
- vendor/ — sqlite-jdbc.jar and mvnw (Maven Wrapper)
- tools/ — PowerShell scripts (fumaca-ui, teste-completo and others) and icon generators
- verify/ — screenshots and verification reports
- dist/ — frontend build; public/, index.html, vite.config.ts, tsconfig.json, package.json

Generated project (example MeuApp/)

- pom.xml (Maven) or build.gradle with gradlew, settings.gradle and gradle.properties (Gradle)
- app.model.json — visual model, source of truth
- src/main/java/Main.java, Database.java, Schema.java and *Window.java (one class per window)
- data/app.db — SQLite database, created on first use
- build/ — JavaForge work (lib/sqlite-jdbc.jar, tools/, out/)
- README.md, .gitignore

build/, data/, target/ and .gradle/ are in the generated .gitignore. Projects from previous versions (.javaforge, lib/ and app.db at root) keep opening and working the same way.

## Trade-offs and decisions

- Flattened generated project structure: Main.java, Database.java, Schema.java and the *Window.java windows go straight into src/main/java/, without packages (no com/example/app, no db/ or ui/) and without package declaration. The goal is to be easy to navigate and edit by hand in any editor, with Maven, Gradle or plain javac. The downside is not serving those who need Java packages organized by layer.
- Single high-contrast dark theme for the tool (background #0a0c10, surfaces up to #1a2029, main text contrast around 16:1), amber accent #f5a524, no gradients, glows or glass. Code typography in Cascadia/Consolas and interface in Segoe UI Variable, so code does not "change house" when entering the app. Small radius (3 to 8 px) and crisp borders: dense tool, not showcase.
- Screen preview in Swing style (light gray, low relief) visually separates "your app" from "the studio"; 10 px grid and resize handle keep positioning predictable.
- Simplified workbench layout (NetBeans style): files and components on the left, screen in the center, properties/connections/data on the right, console at the bottom; everything visible at once, no hidden menus.
- No decorative element without function; every button has an action; shortcuts (F5 runs, Ctrl+S saves, Delete removes) and empty states explain the next step.
- Generated files receive a warning and backup before being overwritten.

## Known limitations

- Installers produced are NSIS and MSI (Windows); the executable is .exe. There is no declared support for macOS or Linux in this repository.
- Without Maven or Gradle, compilation uses javac with the embedded SQLite driver; features that depend on Maven/Gradle builds (for example, generated JUnit tests) do not apply in this mode.
- The app.db database is binary: it does not open in the code editor; clicking the file in the tree opens the Database tab. There is no undo for SQL executed in the Database tab — destructive commands ask for confirmation before executing.
- Generated projects use a package-free structure, which may not suit Java package-based organization conventions.
- Models (.json) are transferred from computer to computer by hand; there is no cloud sync.

## License

There is no LICENSE file at the repository root; the license is not specified.

## Author

Kelvin.
