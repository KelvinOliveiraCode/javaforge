# JavaForge — Construtor Visual de Aplicativos Java (Swing)

<<<<<<< HEAD
[![Rust](https://img.shields.io/badge/language-Rust-orange?logo=rust)](https://www.rust-lang.org/)
[![SQLite](https://img.shields.io/badge/database-SQLite-blue?logo=sqlite)](https://www.sqlite.org/)

Construtor visual de aplicativos Java Swing com banco SQLite, construído com Tauri (Rust + React). Monta telas arrastando componentes, liga eventos a ações no banco sem escrever código e gera um projeto Java completo (Maven ou Gradle) que compila e roda fora da ferramenta.

## Problema / Por que existe

Criar um aplicativo Java Swing com banco SQLite exige escrever à mão o esquema do banco, o acesso a dados com JDBC, as telas, o layout de cada janela e a ligação de eventos aos comandos do banco. Antes de ver algo funcionar, já é preciso escrever muito código repetitivo. O JavaForge existe para remover essa etapa: projete a interface visualmente, conecte eventos a ações do banco (inserir, consultar, atualizar, excluir, abrir janela, mostrar mensagem) e gere um projeto Java pronto para abrir em qualquer editor e compilar com Maven, Gradle ou javac puro.

## O que faz

- Tela inicial: criar projeto em branco, a partir de um modelo pronto ou abrir um projeto existente, com lista de recentes. Excluir projeto apaga a pasta inteira e o código gerado do disco, sempre com confirmação. Ao criar, é possível substituir uma pasta que já existe, com aviso explícito de que os arquivos antigos serão perdidos.
- Modelos prontos: "Login + painel principal" (consulta a tabela de usuários no SQLite e abre o painel), "Cadastro (CRUD)" (pesquisar, salvar, atualizar e excluir com dados de exemplo), "Lista de tarefas" (adicionar, renomear, excluir e listar; chave estrangeira entre as tabelas tarefas e projetos), "Agenda de contatos" (nome, telefone e e-mail) e "Calculadora" (sem banco: executa código Java escrito por você).
- Edição segura: desfazer/refazer (Ctrl+Z, Ctrl+Y) em qualquer alteração do modelo, com edições seguidas agrupadas em um passo só. Importar/exportar o modelo em .json para levar um aplicativo de um computador para outro.
- Tema claro ou escuro, escolhido com o botão sol/lua na barra de título e lembrado entre sessões.
- Designer: 22 componentes Swing (botão, rótulo, campo de texto, senha, área de texto, caixa de seleção, rádio, combinação, lista, tabela, painel, rolagem, progresso, girar, botão liga/desliga, separador, deslizador, barra de rolagem, painel de texto, editor de texto, barra de ferramentas e árvore). Arrastar para mover, alça para redimensionar, grade de 10 px, várias janelas por projeto e barra de menus por janela.
- Conexões (o cola no-code): ligue um evento (clique, Enter, perda de foco) a uma ação: verificar login, inserir, atualizar, excluir, consultar e preencher tabela, abrir janela, mostrar mensagem ou rodar código manual. Itens de menu também aceitam conexões.
- Dados: editor de tabelas e colunas (chave primária, auto incremento, obrigatório) e de dados iniciais. O banco app.db é criado na pasta do projeto com um clique.
- Aba Banco: rode SQL à mão (consultar, inserir, corrigir), veja a estrutura (tabelas, colunas e relações) e reaplique o modelo ao banco. SQL que apaga ou reescreve dados pede confirmação. Clicar no app.db na árvore de arquivos abre essa aba; o banco é binário e não abre no editor de código.
- Código: o projeto gerado é Maven completo (com Maven Wrapper) ou Gradle, editável no editor do app (tema VS Code Dark+) ou em qualquer editor externo. Alterações feitas por fora geram cópia de segurança antes de uma nova geração.
- Rodar: compila e executa o app gerado (Maven se disponível; senão, javac com o driver SQLite embutido). Atalho F5. A ferramenta de build (Maven, Gradle ou nenhum) é salva no app.model.json.

## Stack

- Frontend: React 18, TypeScript, Vite, CodeMirror 6 com suporte a Java (@codemirror/lang-java, @uiw/react-codemirror) e tema VS Code Dark+, @tauri-apps/api
- Backend: Rust (edição 2021), Tauri 2, tauri-plugin-dialog, tauri-plugin-opener, serde, serde_json, sha2
- Código gerado: Java (JDK 17+), SQLite (driver jdbc embutido em vendor/sqlite-jdbc.jar), Maven Wrapper ou Gradle Wrapper opcionais; javac puro como fallback quando nenhum dos dois está instalado
- Testes: vitest (frontend), cargo test (backend, end_to_end) e script de fumaça da interface (tools/fumaca-ui.ps1)

## Como funciona

O arquivo app.model.json na raiz de cada projeto é a fonte da verdade: telas, componentes, conexões, banco e ferramenta de build. Salvar o modelo regenera o código Java (Main.java, Database.java, Schema.java e uma classe por janela). Fluxo típico: criar ou abrir projeto, montar telas no designer, ligar eventos a ações no painel Conexões, definir tabelas e dados iniciais, gerar código, compilar e rodar com F5. O código gerado pode ser editado dentro do app ou em qualquer editor externo; o JavaForge não exige que você continue usando a ferramenta.

## Como rodar

Requisitos: Node 18+, Rust (stable) e JDK 17+ com JAVA_HOME definido (o app usa javac/java para compilar e rodar os projetos gerados). Maven ou Gradle são opcionais: se estiverem no PATH, são usados; sem nenhum dos dois, a compilação usa javac com o driver SQLite embutido.
=======
![linguagem: Rust](https://img.shields.io/badge/linguagem-Rust-blue)  
![status: concluido](https://img.shields.io/badge/status-concluido-green)  
![licenca: MIT](https://img.shields.io/badge/licenca-MIT-blue)

### Descrição
Construtor visual de aplicativos Java Swing com banco SQLite, desenvolvido em Tauri (Rust + React). Ideia de um "NetBeans simplificado": monta a interface arrastando componentes, liga os eventos ao banco sem escrever código e gera um projeto Maven completo.

### O que faz
Construtor visual de aplicativos Java Swing com banco SQLite, desenvolvido em Tauri (Rust + React). Ideia de um "NetBeans simplificado": monta a interface arrastando componentes, liga os eventos ao banco sem escrever código e gera um projeto Maven completo.

### Tecnologias
- Rust
- Tauri
- React
- TypeScript
- SQLite
- Java
- Maven
>>>>>>> 8780a322d09a5d5c026ea9cf48ed3f603e896781

### Como usar
Não há comando padrão registrado para esta stack. Consulte os arquivos do repositório para os comandos de execução.

<<<<<<< HEAD
Para gerar instaladores:
=======
### Estrutura
Consulte a árvore do repositório para a organização exata de pastas e arquivos.

### Testes
Não há contagem de testes registrada nesta metadata. Adicione e execute testes apropriados à linguagem (pytest para Python, ./mvnw test para Java, npm test para JavaScript/TypeScript).
>>>>>>> 8780a322d09a5d5c026ea9cf48ed3f603e896781

### Licença
MIT

<<<<<<< HEAD
Saída em src-tauri/target/release/bundle (NSIS e MSI). Também é possível rodar direto: src-tauri/target/release/javaforge.exe (ou JavaForge.exe na raiz do repositório).

## Estrutura do projeto

Repositório:

- src/ — frontend React: start/ (tela inicial e criação de projetos), ide/ (bancada, barra de título, status, atalhos), designer/ (canvas WYSIWYG com arrastar, redimensionar e seleção), panels/ (arquivos, paleta, propriedades, conexões, dados, banco, saída, migração), editor/ (abas e editor CodeMirror), components/, actions.ts, store.ts, model-ops.ts, catalog.ts, types.ts, styles.css, theme-vscode.ts
- src-tauri/ — backend Rust: src/lib.rs, model.rs, codegen.rs, templates.rs, commands.rs, runner.rs, registry.rs, util.rs; tests/end_to_end.rs; tauri.conf.json; build.rs
- vendor/ — sqlite-jdbc.jar e mvnw (Maven Wrapper)
- tools/ — scripts PowerShell (fumaca-ui, teste-completo e outros) e geradores de ícone
- verify/ — capturas de tela e relatórios de verificação
- dist/ — build do frontend; public/, index.html, vite.config.ts, tsconfig.json, package.json

Projeto gerado (exemplo MeuApp/):

- pom.xml (Maven) ou build.gradle com gradlew, settings.gradle e gradle.properties (Gradle)
- app.model.json — modelo visual, fonte da verdade
- src/main/java/Main.java, Database.java, Schema.java e *Window.java (uma classe por janela)
- data/app.db — banco SQLite, criado no primeiro uso
- build/ — trabalho do JavaForge (lib/sqlite-jdbc.jar, tools/, out/)
- README.md, .gitignore

build/, data/, target/ e .gradle/ estão no .gitignore gerado. Projetos de versões anteriores (.javaforge, lib/ e app.db na raiz) continuam abrindo e funcionando do mesmo jeito.

## Trade-offs e decisões

- Estrutura achatada do projeto gerado: Main.java, Database.java, Schema.java e as janelas *Window.java ficam direto em src/main/java/, sem pacotes (sem com/exemplo/app, sem db/ ou ui/) e sem declaração de package. O objetivo é ser fácil de navegar e editar à mão em qualquer editor, com Maven, Gradle ou javac puro. A desvantagem é não atender quem precisa de pacotes Java organizados por camada.
- Um único tema escuro de alto contraste para a ferramenta (fundo #0a0c10, superfícies até #1a2029, contraste do texto principal cerca de 16:1), acento âmbar #f5a524, sem gradientes, brilhos ou vidro. Tipografia de código em Cascadia/Consolas e interface em Segoe UI Variable, para o código não "mudar de casa" ao entrar no app. Raio pequeno (3 a 8 px) e bordas secas: ferramenta densa, não vitrine.
- Prévia das telas no estilo Swing (cinza claro, baixo relevo) separa visualmente "seu app" do "estúdio"; grade de 10 px e alça de redimensionar mantêm o posicionamento previsível.
- Layout de bancada simplificado (tipo NetBeans): arquivos e componentes à esquerda, tela no centro, propriedades/conexões/dados à direita, console embaixo; tudo visível de uma vez, sem menus escondidos.
- Sem elemento decorativo sem função; todo botão tem ação; atalhos (F5 roda, Ctrl+S salva, Delete remove) e estados vazios explicam o próximo passo.
- Arquivos gerados recebem aviso e cópia de segurança antes de serem sobrescritos.

## Limitações conhecidas

- Instaladores produzidos são NSIS e MSI (Windows); o executável é .exe. Não há declaração de suporte a macOS ou Linux neste repositório.
- Sem Maven nem Gradle, a compilação usa javac com o driver SQLite embutido; recursos que dependem de build Maven/Gradle (por exemplo, testes JUnit gerados) não se aplicam nesse modo.
- O banco app.db é binário: não abre no editor de código; clicar no arquivo na árvore abre a aba Banco. Não há desfazer de SQL executado na aba Banco — comandos destrutivos pedem confirmação antes de executar.
- Projetos gerados usam estrutura sem pacotes, o que pode não ser adequado para convenções de organização por pacotes Java.
- Modelos (.json) são transferidos de computador para computador à mão; não há sincronização em nuvem.

## Licença

Não há arquivo LICENSE na raiz do repositório; a licença não está especificada.

## Autor

Kelvin.
=======
### Autor
Kelvin Oliveira — github.com/KelvinOliveiraCode

---

# JavaForge — Visual Java Swing App Builder

![language: Rust](https://img.shields.io/badge/language-Rust-blue)  
![status: concluido](https://img.shields.io/badge/status-concluido-green)  
![license: MIT](https://img.shields.io/badge/license-MIT-blue)

### Description
Visual Java Swing application builder with SQLite database, built with Tauri (Rust + React). A "simplified NetBeans": drag-and-drop UI, wire events to the database without writing code, and generate a complete Maven project.

### What it does
Visual Java Swing application builder with SQLite database, built with Tauri (Rust + React). A "simplified NetBeans": drag-and-drop UI, wire events to the database without writing code, and generate a complete Maven project.

### Technologies
- Rust
- Tauri
- React
- TypeScript
- SQLite
- Java
- Maven

### How to use
No standard command registered for this stack. Check the repository files for execution commands.

### Structure
Check the repository tree for the exact folder and file organization.

### Tests
No test count recorded in this metadata. Add and run tests appropriate for the language (pytest for Python, ./mvnw test for Java, npm test for JavaScript/TypeScript).

### License
MIT

### Author
Kelvin Oliveira — github.com/KelvinOliveiraCode
>>>>>>> 8780a322d09a5d5c026ea9cf48ed3f603e896781
