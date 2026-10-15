# JavaForge

Construtor de aplicativos Java (Swing) com banco SQLite, feito em Tauri (Rust + React).
A ideia é um "NetBeans simplificado": monte a interface arrastando componentes, ligue os
eventos ao banco sem escrever código e gere um projeto Maven completo que você pode abrir
em qualquer editor.

## O que ele faz

- **Tela inicial**: criar em branco, criar a partir de um modelo ou abrir um projeto existente
  (com lista de recentes). Dá para **excluir um projeto** (a lixeira em cada recente, ou
  "Excluir projeto" no painel de arquivos) — a pasta inteira e o código gerado saem do disco,
  sempre com confirmação. Ao criar, é possível **substituir uma pasta que já existe**, com aviso
  explícito de que os arquivos antigos serão perdidos.
- **Modelos prontos**: "Login + painel principal" (consulta a tabela de usuários no SQLite e
  abre o painel), "Cadastro (CRUD)" (pesquisar, salvar, atualizar e excluir com dados de exemplo),
  "Lista de tarefas" (adicionar, renomear, excluir e listar; usa chave estrangeira entre as
  tabelas `tarefas` e `projetos`), "Agenda de contatos" (nome, telefone e e-mail) e
  "Calculadora" (sem banco: o botão roda código Java escrito por você).
- **Edição segura**: desfazer/refazer (Ctrl+Z, Ctrl+Y) em qualquer alteração do modelo, com
  edições seguidas juntadas em um passo só. Importar/Exportar o modelo em `.json` para levar
  um aplicativo de um computador a outro.
- **Tema claro ou escuro**: o botão de sol/lua na barra de título guarda a escolha.
- **Designer**: paleta com 22 componentes Swing (botão, rótulo, campo de texto, senha, área de
  texto, caixa de seleção, rádio, combinação, lista, tabela, painel, rolagem, progresso, girar,
  botão liga/desliga, separador, deslizador, barra de rolagem, painel de texto, editor de texto,
  barra de ferramentas e árvore). Arrastar para mover, alça para redimensionar, grade de 10 px,
  várias janelas por projeto e barra de menus por janela.
- **Conexões (o "cola" no-code)**: ligue um evento (clique, Enter, perda de foco) a uma ação:
  verificar login, inserir, atualizar, excluir, consultar e preencher tabela, abrir janela,
  mostrar mensagem ou rodar código manual. Itens de menu também aceitam conexões.
- **Dados**: editor de tabelas e colunas (chave primária, auto incremento, obrigatório) e de dados
  iniciais. O banco `app.db` é criado na pasta do projeto com um clique.
- **Aba Banco**: rode SQL à mão no banco do aplicativo (consultar, inserir, corrigir), veja a
  estrutura (tabelas, colunas e relações) e aplique o modelo de novo ao banco. SQL que apaga ou
  reescreve dados pede confirmação. Clicar no `app.db` da árvore de arquivos abre essa aba — o
  banco é binário e não abre no editor.
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
compilar e rodar os projetos gerados). **Maven ou Gradle são opcionais**: se estiverem no PATH
eles são usados; sem nenhum dos dois, a compilação usa `javac` com o driver SQLite que vem
embutido no app. A ferramenta de build é escolhida por projeto (Maven, Gradle ou nenhum) e
salva no `app.model.json`.

## Como gerar o instalador

```
npm run tauri build
```

Saída em `src-tauri/target/release/bundle/` (NSIS e MSI).

## Arquitetura

```
src-tauri/src/
  model.rs        tipos do modelo (serde, espelho de src/types.ts)
  codegen.rs      gera Main/Schema/Database/<Janela>.java, pom.xml / build.gradle + wrappers
  templates.rs    modelos iniciais (branco, login, CRUD, tarefas, contatos, calculadora)
  commands.rs     comandos Tauri: projetos, arquivos, modelo, validação, banco
  runner.rs       compila e executa o projeto gerado (Maven/Gradle/javac) com saída ao vivo
  registry.rs     registro de projetos recentes (JSON em %APPDATA%)
  util.rs         identificadores Java, escapes, drivers SQLite/Maven/Gradle embutidos
src/
  start/          tela inicial e modal de criação
  ide/            cascos da IDE (barra de título, status, atalhos)
  designer/       canvas WYSIWYG com arrastar, redimensionar e seleção
  panels/         arquivos, paleta, propriedades, conexões, dados, banco, saída
  editor/         abas e editor de código (CodeMirror, tema VS Code Dark+)
  theme-vscode.ts cores do VS Code Dark+ aplicadas ao CodeMirror
  actions.ts      ações sobre o modelo (debounce de salvamento e geração)
```

O `app.model.json` na raiz de cada projeto é a fonte da verdade: telas, componentes,
conexões, banco e **ferramenta de build**. Salvar o modelo regera o código Java.

### Estrutura do projeto gerado

```
MeuApp/
├── pom.xml                      projeto Maven (se Maven selecionado)
├── mvnw, mvnw.cmd, .mvn/        Maven Wrapper
├── build.gradle                 projeto Gradle (se Gradle selecionado)
├── settings.gradle              configuração do Gradle
├── gradle.properties            propriedades do Gradle
├── gradlew, gradlew.cmd         Gradle Wrapper
├── gradle/wrapper/              arquivos do wrapper
├── README.md, .gitignore
├── app.model.json               modelo visual (fonte da verdade)
├── src/main/java/<pacote>/
│   ├── Main.java                ponto de entrada
│   ├── db/Database.java         acesso ao SQLite e métodos das conexões
│   ├── db/Schema.java           tabelas, colunas, chaves estrangeiras e dados iniciais
│   └── ui/*Window.java          uma classe por janela
├── data/app.db                  banco SQLite (criado no primeiro uso)
└── build/                       pasta de trabalho do JavaForge
    ├── lib/sqlite-jdbc.jar      driver usado quando não há Maven/Gradle
    ├── tools/                   ferramentas auxiliares (SchemaTool, SqlTool, DDL, seed)
    └── out/, out-sql/           classes compiladas dessas ferramentas
```

`build/`, `data/`, `target/` e `.gradle/` estão no `.gitignore` gerado. Projetos criados em
versões anteriores usavam `.javaforge`, `lib/` e `app.db` na raiz: eles continuam
abrindo e funcionando do mesmo jeito.

## Testes

```
cargo test --test end_to_end
```

Gera os modelos (branco, login, CRUD, tarefas, contatos e calculadora) e um modelo sintético com
todos os componentes e todos os tipos de conexão, compila tudo com `javac`, **com Maven e com
Gradle**, cria o banco via um SchemaTool Java, confere os identificadores, a estrutura gerada, as
chaves estrangeiras e o console SQL.

Além disso, um teste roda `gradle test` de verdade num projeto gerado: o JavaForge passa a gerar
um `SchemaTest` (JUnit 5) que confere, contra um SQLite em arquivo temporário, que as tabelas e
colunas do modelo existem no banco. O teste usa o mesmo SQLite do app — não um banco emulado —
porque detalhes como `AUTOINCREMENT` mudam entre dialectos.

São 15 testes. O caminho Maven é pulado com aviso quando o `mvn` não está instalado.


Há também um teste de fumaça da interface, que abre o app de verdade e confere que ele sobe,
fica vivo e desenha a tela:

```
powershell -File tools\fumaca-ui.ps1
```

Saída em `verify/fumaca/tela.png`.

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
