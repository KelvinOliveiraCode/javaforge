# JavaForge

Construtor de aplicativos Java (Swing) com banco SQLite, feito em Tauri (Rust + React).
A ideia é um "NetBeans simplificado": monte a interface arrastando componentes, ligue os
eventos ao banco sem escrever código e gere um projeto Maven completo que você pode abrir
em qualquer editor.

## O que ele faz

- **Tela inicial**: criar em branco, criar a partir de um modelo ou abrir um projeto existente
  (com lista de recentes).
- **Modelos prontos**: "Login + painel principal" (consulta a tabela de usuários no SQLite e
  abre o painel) e "Cadastro (CRUD)" (pesquisar, salvar, atualizar e excluir com dados de exemplo).
- **Designer**: paleta com 14 componentes Swing (botão, rótulo, campo de texto, senha, área de
  texto, caixa de seleção, rádio, combinação, lista, tabela, painel, rolagem, progresso, girar).
  Arrastar para mover, alça para redimensionar, grade de 10 px, várias janelas por projeto.
- **Conexões (o "cola" no-code)**: ligue um evento (clique, Enter, perda de foco) a uma ação:
  verificar login, inserir, atualizar, excluir, consultar e preencher tabela, abrir janela,
  mostrar mensagem ou rodar código manual.
- **Dados**: editor de tabelas e colunas (chave primária, auto incremento, obrigatório) e de dados
  iniciais. O banco `app.db` é criado na pasta do projeto com um clique.
- **Código**: o projeto gerado é Maven completo (com Maven Wrapper) e pode ser editado no
  editor do app (tema VS Code Dark+) ou em qualquer editor externo. Alterações feitas por fora
  geram cópia de segurança antes de uma nova geração.
- **Rodar**: compila e executa o app gerado (Maven se disponível, senão `javac` + driver SQLite
  embutido). Atalho F5.

## Como desenvolver

```
npm install
npm run tauri dev
```

Requisitos: Node 18+, Rust (stable), JDK 17+ com `JAVA_HOME` (o app usa javac/java para
compilar e rodar os projetos gerados). Maven é opcional: se estiver no PATH ele é usado;
sem Maven, a compilação usa `javac` com o driver SQLite que vem embutido no app.

## Como gerar o instalador

```
npm run tauri build
```

Saída em `src-tauri/target/release/bundle/` (NSIS e MSI).

## Arquitetura

```
src-tauri/src/
  model.rs        tipos do modelo (serde, espelho de src/types.ts)
  codegen.rs      gera Main/Schema/Database/<Janela>.java, pom.xml e wrapper Maven
  templates.rs    modelos iniciais (branco, login, CRUD)
  commands.rs     comandos Tauri: projetos, arquivos, modelo, validação, banco
  runner.rs       compila e executa o projeto gerado (Maven/javac) com saída ao vivo
  registry.rs     registro de projetos recentes (JSON em %APPDATA%)
  util.rs         identificadores Java, escapes, driver SQLite embutido
src/
  start/          tela inicial e modal de criação
  ide/            cascos da IDE (barra de título, status, atalhos)
  designer/       canvas WYSIWYG com arrastar, redimensionar e seleção
  panels/         arquivos, paleta, propriedades, conexões, dados, saída
  editor/         abas e editor de código (CodeMirror, tema VS Code Dark+)
  theme-vscode.ts cores do VS Code Dark+ aplicadas ao CodeMirror
  actions.ts      ações sobre o modelo (debounce de salvamento e geração)
```

O `app.model.json` na raiz de cada projeto é a fonte da verdade: telas, componentes,
conexões e banco. Salvar o modelo regera o código Java.

## Testes

```
cargo test --test end_to_end
```

Gera os três modelos e um modelo sintético com todos os componentes e todos os tipos de
conexão, compila tudo com `javac` **e com Maven**, cria o banco via um SchemaTool Java
e confere os identificadores.

## Verificação ponta a ponta (já executada)

- `cargo test`: 3/3 passando.
- App gerado pelo modelo de login: compila com Maven, abre a janela Swing,
  aceita `admin` / `1234` consultando o SQLite (diálogo "Bem-vindo!") e abre a
  janela principal.
- Interface do JavaForge verificada na prática: tela inicial, modal de criação,
  bancada (designer, paleta, propriedades, conexões, dados, console) e editor
  com o tema VS Code Dark+.
- Script de repro: `tools/teste-completo.ps1` (roda tudo e escreve
  `verify/relatorio.txt`).

## Instaladores

```
src-tauri/target/release/bundle/nsis/JavaForge_1.0.0_x64-setup.exe
src-tauri/target/release/bundle/msi/JavaForge_1.0.0_x64_en-US.msi
```

Ou rode direto: `src-tauri/target/release/javaforge.exe` (ou `JavaForge.exe` na raiz).
