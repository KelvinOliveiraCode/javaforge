// Prova de ponta a ponta do codegen: gera os templates e um modelo sintático
// com todos os componentes e todos os tipos de conexão, compila tudo com javac
// e com Maven, e cria o banco via um SchemaTool Java.

use javaforge_lib::codegen;
use javaforge_lib::commands::{db_apply, db_sql};
use javaforge_lib::model::*;
use javaforge_lib::templates;
use javaforge_lib::util::{is_valid_java_ident, java_class_name, FLATLAF_JAR_BYTES, SQLITE_JAR_BYTES};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join("javaforge-e2e").join(name);
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    dir
}

fn write_project(dir: &PathBuf, model: &AppModel) {
    let files = codegen::generate(model).expect("codegen deve funcionar");
    for f in &files {
        let target = dir.join(f.path.replace('/', "\\"));
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        match &f.bytes {
            Some(raw) => fs::write(&target, raw).unwrap(),
            None => fs::write(&target, &f.content).unwrap(),
        }
    }
    fs::create_dir_all(dir.join("build").join("lib")).unwrap();
    fs::write(
        dir.join("build").join("lib").join("sqlite-jdbc.jar"),
        SQLITE_JAR_BYTES,
    )
    .unwrap();
    // O app gerado usa FlatLaf; sem o jar no classpath o javac nao acha a classe.
    fs::write(
        dir.join("build").join("lib").join("flatlaf.jar"),
        FLATLAF_JAR_BYTES,
    )
    .unwrap();
    let json = serde_json::to_string_pretty(model).unwrap();
    fs::write(dir.join("app.model.json"), json).unwrap();
}

fn javac() -> PathBuf {
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let p = PathBuf::from(java_home).join("bin").join("javac.exe");
        if p.exists() {
            return p;
        }
    }
    let path = std::env::var("PATH").unwrap();
    for d in path.split(';') {
        let p = PathBuf::from(d).join("javac.exe");
        if p.exists() {
            return p;
        }
    }
    panic!("javac não encontrado; defina JAVA_HOME");
}

/// Garante que o projeto gerado compila pelo Maven (layout src/main/java).
fn mvn_compile(dir: &PathBuf, label: &str) {
    let mvn = std::env::var("JAVAFORGE_MVN").unwrap_or_else(|_| "mvn".to_string());
    let out = Command::new(&mvn)
        .args(["-q", "-B", "compile"])
        .current_dir(dir)
        .output();
    match out {
        Ok(o) if o.status.success() => {}
        Ok(o) => panic!(
            "{}: mvn compile falhou:\n{}",
            label,
            String::from_utf8_lossy(&o.stderr)
        ),
        Err(e) => eprintln!("mvn indisponível ({}), verificação pulada", e),
    }
}

fn compile(dir: &PathBuf, label: &str) {
    let out = dir.join("out");
    let mut java_files = Vec::new();
    // So src/main/java: e o que o Maven/Gradle compilam. Varrer src inteiro
    // tentaria compilar src/test sem JUnit no classpath.
    collect(&dir.join("src").join("main").join("java"), &mut java_files);
    assert!(!java_files.is_empty(), "{}: nenhum arquivo java gerado", label);
    let lib = dir.join("build").join("lib");
    let cp = format!(
        "{}{}{}",
        lib.join("sqlite-jdbc.jar").to_string_lossy(),
        if cfg!(windows) { ";" } else { ":" },
        lib.join("flatlaf.jar").to_string_lossy()
    );
    let result = Command::new(javac())
        .arg("-encoding")
        .arg("UTF-8")
        .arg("-d")
        .arg(&out)
        .arg("-cp")
        .arg(cp)
        .args(&java_files)
        .output()
        .expect("falha ao executar javac");
    assert!(
        result.status.success(),
        "{}: javac falhou:\n{}",
        label,
        String::from_utf8_lossy(&result.stderr)
    );
}

fn collect(dir: &PathBuf, out: &mut Vec<PathBuf>) {
    if let Ok(read) = fs::read_dir(dir) {
        for e in read.flatten() {
            let p = e.path();
            if p.is_dir() {
                collect(&p, out);
            } else if p.extension().map(|x| x == "java").unwrap_or(false) {
                out.push(p);
            }
        }
    }
}

fn base_model(name: &str) -> AppModel {
    AppModel {
        schema_version: 1,
        name: name.to_string(),
        package_name: "com.teste.app".to_string(),
        main_window_id: "principal".to_string(),
        windows: Vec::new(),
        database: DatabaseSpec {
            file: "data/app.db".to_string(),
            tables: Vec::new(),
        },
        connections: Vec::new(),
        build_tool: BuildTool::Maven,
        theme: "dark".to_string(),
    }
}

fn props(entries: &[(&str, &str)]) -> BTreeMap<String, serde_json::Value> {
    let mut m = BTreeMap::new();
    for (k, v) in entries {
        m.insert(k.to_string(), serde_json::json!(v));
    }
    m
}

fn comp(id: &str, t: ComponentType, x: f64, y: f64, w: f64, h: f64) -> ComponentSpec {
    ComponentSpec {
        id: id.to_string(),
        comp_type: t,
        x,
        y,
        width: w,
        height: h,
        props: BTreeMap::new(),
        parent_id: None,
    }
}

/// Modelo sintético: todos os tipos de componente e todos os tipos de conexão.
fn synthetic_model() -> AppModel {
    let mut model = base_model("Sintético");
    let mut win = WindowSpec {
        id: "principal".to_string(),
        title: "Tela principal".to_string(),
        width: 900.0,
        height: 600.0,
        components: Vec::new(),
        menu: vec![MenuSpec {
            id: "menuArquivo".to_string(),
            label: "Arquivo".to_string(),
            items: vec![MenuItemSpec {
                id: "itemSalvar".to_string(),
                label: "Salvar".to_string(),
            }],
        }],
    };
    win.components = vec![
            comp("lblTitulo", ComponentType::JLabel, 10.0, 10.0, 200.0, 20.0),
            comp("btnAcao", ComponentType::JButton, 10.0, 40.0, 120.0, 30.0),
            comp("txtNome", ComponentType::JTextField, 10.0, 80.0, 180.0, 26.0),
            comp("pwdSenha", ComponentType::JPasswordField, 10.0, 110.0, 180.0, 26.0),
            comp("txtAreaObs", ComponentType::JTextArea, 10.0, 140.0, 220.0, 100.0),
            comp("chkAtivo", ComponentType::JCheckBox, 10.0, 240.0, 140.0, 24.0),
            comp("rdoOpcao", ComponentType::JRadioButton, 10.0, 270.0, 140.0, 24.0),
            comp("cmbTipo", ComponentType::JComboBox, 10.0, 300.0, 160.0, 26.0),
            comp("lstItens", ComponentType::JList, 10.0, 330.0, 200.0, 120.0),
            comp("tblDados", ComponentType::JTable, 300.0, 40.0, 400.0, 220.0),
            comp("progresso", ComponentType::JProgressBar, 300.0, 280.0, 200.0, 20.0),
            comp("spnQtd", ComponentType::JSpinner, 520.0, 280.0, 70.0, 26.0),
            comp("pnlGrupo", ComponentType::JPanel, 300.0, 320.0, 260.0, 170.0),
            comp("scrollArea", ComponentType::JScrollPane, 580.0, 320.0, 260.0, 170.0),
            comp("tglModo", ComponentType::JToggleButton, 10.0, 400.0, 130.0, 30.0),
            comp("sepBloco", ComponentType::JSeparator, 10.0, 440.0, 200.0, 8.0),
            comp("sldNivel", ComponentType::JSlider, 10.0, 460.0, 200.0, 24.0),
            comp("scrollBarAux", ComponentType::JScrollBar, 10.0, 490.0, 160.0, 18.0),
            comp("txtPaneInfo", ComponentType::JTextPane, 10.0, 520.0, 240.0, 60.0),
            comp("editorNotas", ComponentType::JEditorPane, 260.0, 520.0, 260.0, 60.0),
            comp("barraAcoes", ComponentType::JToolBar, 580.0, 500.0, 260.0, 40.0),
            comp("arvoreItens", ComponentType::JTree, 580.0, 550.0, 240.0, 150.0),
    ];
    let mut filho = comp("lblFilho", ComponentType::JLabel, 330.0, 350.0, 120.0, 20.0);
    filho.parent_id = Some("pnlGrupo".to_string());
    win.components.push(filho);

    let mut win2 = WindowSpec {
        id: "secundaria".to_string(),
        title: "Secundária".to_string(),
        width: 400.0,
        height: 300.0,
        components: vec![comp("lblOutra", ComponentType::JLabel, 20.0, 20.0, 200.0, 20.0)],
        menu: Vec::new(),
    };

    let mut conns: Vec<ConnectionSpec> = Vec::new();
    let mut mk = |id: &str, comp_id: &str, kind: ConnectionKind| -> ConnectionSpec {
        ConnectionSpec {
            id: id.to_string(),
            name: id.to_string(),
            component_id: comp_id.to_string(),
            event: "actionPerformed".to_string(),
            kind,
            table: "pessoas".to_string(),
            params: Vec::new(),
            query_columns: Vec::new(),
            target_table_component_id: String::new(),
            open_window_id: String::new(),
            close_current: false,
            message: String::new(),
            message_title: String::new(),
            message_kind: "info".to_string(),
            auth_success_window_id: String::new(),
            custom_code: String::new(),
        }
    };

    let mut c = mk("conexao1", "btnAcao", ConnectionKind::Message);
    c.message = "Olá!".to_string();
    c.message_title = "Teste".to_string();
    conns.push(c);

    let mut c = mk("conexao2", "btnAcao", ConnectionKind::OpenWindow);
    c.open_window_id = "secundaria".to_string();
    c.close_current = true;
    conns.push(c);

    let mut c = mk("conexao3", "btnAcao", ConnectionKind::Custom);
    c.custom_code = "System.out.println(\"custom\");".to_string();
    conns.push(c);

    let mut c = mk("conexao4", "btnAcao", ConnectionKind::Authenticate);
    c.params = vec![
        ParamSpec {
            column: "usuario".to_string(),
            from_component_id: "txtNome".to_string(),
            role: ParamRole::Where,
            operator: QueryOperator::Eq,
        },
        ParamSpec {
            column: "senha".to_string(),
            from_component_id: "pwdSenha".to_string(),
            role: ParamRole::Where,
            operator: QueryOperator::Eq,
        },
    ];
    c.auth_success_window_id = "secundaria".to_string();
    c.message = "Bem-vindo!".to_string();
    c.message_title = "Login".to_string();
    conns.push(c);

    let mut c = mk("conexao5", "btnAcao", ConnectionKind::Insert);
    c.params = vec![
        ParamSpec {
            column: "nome".to_string(),
            from_component_id: "txtNome".to_string(),
            role: ParamRole::Set,
            operator: QueryOperator::Eq,
        },
        ParamSpec {
            column: "preco".to_string(),
            from_component_id: "spnQtd".to_string(),
            role: ParamRole::Set,
            operator: QueryOperator::Eq,
        },
        ParamSpec {
            column: "observacao".to_string(),
            from_component_id: "txtAreaObs".to_string(),
            role: ParamRole::Set,
            operator: QueryOperator::Eq,
        },
    ];
    conns.push(c);

    let mut c = mk("conexao6", "btnAcao", ConnectionKind::Update);
    c.params = vec![
        ParamSpec {
            column: "nome".to_string(),
            from_component_id: "txtNome".to_string(),
            role: ParamRole::Set,
            operator: QueryOperator::Eq,
        },
        ParamSpec {
            column: "preco".to_string(),
            from_component_id: "spnQtd".to_string(),
            role: ParamRole::Where,
            operator: QueryOperator::Gte,
        },
    ];
    conns.push(c);

    let mut c = mk("conexao7", "btnAcao", ConnectionKind::Delete);
    c.params = vec![ParamSpec {
        column: "id".to_string(),
        from_component_id: "spnQtd".to_string(),
        role: ParamRole::Where,
        operator: QueryOperator::Eq,
    }];
    conns.push(c);

    let mut c = mk("conexao8", "btnAcao", ConnectionKind::Query);
    c.params = vec![ParamSpec {
        column: "nome".to_string(),
        from_component_id: "txtNome".to_string(),
        role: ParamRole::Where,
        operator: QueryOperator::Like,
    }];
    c.query_columns = vec![
        QueryColumn {
            column: "id".to_string(),
            header: "Código".to_string(),
        },
        QueryColumn {
            column: "nome".to_string(),
            header: "Nome".to_string(),
        },
    ];
    c.target_table_component_id = "tblDados".to_string();
    conns.push(c);

    // conexão em item de menu
    let mut c = mk("conexao9", "itemSalvar", ConnectionKind::Custom);
    c.custom_code = "JOptionPane.showMessageDialog(this, \"Salvo pelo menu.\");".to_string();
    conns.push(c);

    model.windows.push(win);
    model.windows.push(win2);
    model.database.tables.push(TableSpec {
        name: "pessoas".to_string(),
        columns: vec![
            ColumnSpec {
                name: "id".to_string(),
                col_type: SqlType::Integer,
                pk: true,
                not_null: false,
                auto_increment: true,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "usuario".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: true,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "senha".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: true,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "nome".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: false,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "preco".to_string(),
                col_type: SqlType::Real,
                pk: false,
                not_null: false,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "observacao".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: false,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
        ],
        seed_rows: vec![BTreeMap::from([
            ("usuario".to_string(), "admin".to_string()),
            ("senha".to_string(), "1234".to_string()),
            ("nome".to_string(), "Administrador".to_string()),
        ])],
    });
    model.connections = conns;
    model
}

/// O projeto gerado precisa ter testes que PASSEM, nao so que compilem.
/// Roda `gradle test` de verdade num modelo com banco.
#[test]
fn gradle_test_run_passes() {
    let dir = scratch("gradle-test-run");
    let mut model = templates::template_model("crud", "App Teste", "com.teste.app");
    model.build_tool = BuildTool::Gradle;
    write_project(&dir, &model);

    // O teste do schema so existe quando ha tabelas.
    assert!(
        dir.join("src").join("test").join("java").join("com").join("teste").join("app").join("db").join("SchemaTest.java").exists(),
        "SchemaTest nao foi gerado"
    );
    let gradle = fs::read_to_string(dir.join("build.gradle")).unwrap();
    assert!(gradle.contains("junit-jupiter"), "build.gradle sem junit-jupiter");
    // Testa contra o proprio SQLite do app, nao contra um H2 emulado:
    assert!(gradle.contains("useJUnitPlatform"), "build.gradle sem useJUnitPlatform");

    // Veredito pela saida: o gradlew do Windows encerra com 1 mesmo depois
    // de BUILD SUCCESSFUL quando o stdout vai por pipe.
    let out = Command::new(dir.join("gradlew.cmd"))
        .args(["test"])
        .current_dir(&dir)
        .output();
    match out {
        Ok(o) => {
            let combined = format!(
                "{}{}",
                String::from_utf8_lossy(&o.stdout),
                String::from_utf8_lossy(&o.stderr)
            );
            let sem_rede = combined.contains("Could not resolve")
                || combined.contains("Could not download")
                || combined.contains("Connection")
                || combined.contains("UnknownHostException");
            if sem_rede {
                eprintln!("Gradle sem rede, teste do projeto gerado pulado");
                return;
            }
            assert!(
                combined.contains("BUILD SUCCESSFUL"),
                "gradle test falhou:\n{combined}"
            );
        }
        Err(e) => eprintln!("gradlew indisponivel ({e}), teste pulado"),
    }
}
#[test]
fn templates_compile() {
    for kind in ["blank", "login", "crud", "tarefas", "calculadora", "contatos"] {
        let dir = scratch(&format!("tpl-{kind}"));
        let model = templates::template_model(kind, "App Teste", "com.teste.app");
        write_project(&dir, &model);
        compile(&dir, kind);
        mvn_compile(&dir, kind);
        // O banco é criado via SchemaTool (javac + java + driver JDBC).
        db_apply(&dir, &model, false).expect("db_apply deve criar o banco");
        assert!(
            dir.join("data").join("app.db").exists(),
            "{kind}: app.db não foi criado"
        );
    }
}

/// Garante que o projeto gerado compila pelo Gradle quando ele está disponível.
/// O wrapper baixa a distribuição na primeira uso; sem Gradle na máquina o
/// teste apenas confere que os arquivos foram gerados.
fn gradle_compile(dir: &PathBuf, label: &str) {
    for required in ["build.gradle", "settings.gradle", "gradlew", "gradlew.cmd"] {
        assert!(
            dir.join(required).exists(),
            "{label}: {required} não foi gerado"
        );
    }
    // O wrapper properties tem que apontar para uma distribuição real.
    let props = fs::read_to_string(dir.join("gradle").join("wrapper").join("gradle-wrapper.properties"))
        .expect("gradle-wrapper.properties ausente");
    assert!(
        props.contains("distributionUrl"),
        "{label}: distributionUrl ausente no wrapper"
    );

    // "compile" é ambíguo no Gradle (compileJava/compileTestJava): a task
    // certa é compileJava. "run" é o que o app usa de verdade (compila e
    // executa) e exige interface gráfica, então fica de fora do teste.
    //
    // O veredito vem da SAÍDA, não do exit code: o gradlew.cmd do Windows
    // encerra com 1 mesmo depois de "BUILD SUCCESSFUL" quando o daemon
    // devolve a saída por pipe.
    let out = Command::new(dir.join("gradlew.cmd"))
        .args(["compileJava"])
        .current_dir(dir)
        .output();
    match out {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let stderr = String::from_utf8_lossy(&o.stderr);
            let combined = format!("{stdout}{stderr}");
            if combined.contains("BUILD SUCCESSFUL") || o.status.success() {
                return;
            }
            // Sem rede/cache o Gradle não baixa a distribuição nem a
            // dependência: isso não é defeito do codegen.
            if combined.contains("No cached version")
                || combined.contains("offline mode")
                || combined.contains("Could not resolve")
                || combined.contains("Could not download")
                || combined.contains("Connection")
                || combined.contains("UnknownHostException")
            {
                eprintln!("{label}: Gradle sem rede/cache, compilacao pulada");
            } else {
                panic!("{label}: gradle compileJava falhou:\n{combined}");
            }
        }
        Err(e) => eprintln!("gradlew indisponivel ({e}), verificacao pulada"),
    }
}

/// O Gradle tem de gerar o mesmo código Java que o Maven, com o build file
/// no lugar e nada de pom.xml sobrando.
#[test]
fn gradle_project_compiles() {
    for kind in ["blank", "login", "crud"] {
        let dir = scratch(&format!("gradle-{kind}"));
        let mut model = templates::template_model(kind, "App Teste", "com.teste.app");
        model.build_tool = BuildTool::Gradle;
        write_project(&dir, &model);

        assert!(
            dir.join("build.gradle").exists(),
            "{kind}: build.gradle ausente com BuildTool::Gradle"
        );
        assert!(
            !dir.join("pom.xml").exists(),
            "{kind}: pom.xml nao deveria existir com BuildTool::Gradle"
        );

        let build_gradle = fs::read_to_string(dir.join("build.gradle")).unwrap();
        assert!(
            build_gradle.contains("sqlite-jdbc"),
            "{kind}: build.gradle sem a dependencia do sqlite-jdbc"
        );

        // O mesmo código Java gerado precisa compilar.
        compile(&dir, kind);
        gradle_compile(&dir, kind);
    }
}

/// BuildTool::None não gera pom nem build.gradle: o projeto só compila
/// pelo caminho javac puro.
#[test]
fn build_tool_none_generates_no_build_file() {
    let dir = scratch("gradle-none");
    let mut model = templates::template_model("crud", "App Teste", "com.teste.app");
    model.build_tool = BuildTool::None;
    write_project(&dir, &model);

    assert!(!dir.join("pom.xml").exists(), "pom.xml nao deveria existir");
    assert!(!dir.join("build.gradle").exists(), "build.gradle nao deveria existir");
    compile(&dir, "none");
}

/// A mesma coluna como "campo a alterar" e como filtro precisa gerar Java válido.
#[test]
fn update_with_same_column_in_set_and_where() {
    let mut model = base_model("Atualizar mesmo campo");
    let mut win = WindowSpec {
        id: "principal".to_string(),
        title: "Principal".to_string(),
        width: 400.0,
        height: 300.0,
        components: vec![
            comp("txtTitulo", ComponentType::JTextField, 10.0, 10.0, 180.0, 26.0),
            comp("txtNovoTitulo", ComponentType::JTextField, 10.0, 50.0, 180.0, 26.0),
            comp("btnRenomear", ComponentType::JButton, 10.0, 90.0, 120.0, 30.0),
        ],
        menu: Vec::new(),
    };
    win.components[0]
        .props
        .insert("columns".to_string(), serde_json::json!("16"));
    model.windows.push(win);
    model.database.tables.push(TableSpec {
        name: "tarefas".to_string(),
        columns: vec![
            ColumnSpec {
                name: "id".to_string(),
                col_type: SqlType::Integer,
                pk: true,
                not_null: false,
                auto_increment: true,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "titulo".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: true,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
        ],
        seed_rows: Vec::new(),
    });
    let mut c = ConnectionSpec {
        id: "conexaoRenomear".to_string(),
        name: "Renomear tarefa".to_string(),
        component_id: "btnRenomear".to_string(),
        event: "actionPerformed".to_string(),
        kind: ConnectionKind::Update,
        table: "tarefas".to_string(),
        params: vec![
            ParamSpec {
                column: "titulo".to_string(),
                from_component_id: "txtNovoTitulo".to_string(),
                role: ParamRole::Set,
                operator: QueryOperator::Eq,
            },
            ParamSpec {
                column: "titulo".to_string(),
                from_component_id: "txtTitulo".to_string(),
                role: ParamRole::Where,
                operator: QueryOperator::Eq,
            },
        ],
        query_columns: Vec::new(),
        target_table_component_id: String::new(),
        open_window_id: String::new(),
        close_current: false,
        message: String::new(),
        message_title: String::new(),
        message_kind: "info".to_string(),
        auth_success_window_id: String::new(),
        custom_code: String::new(),
    };
    model.connections.push(c);

    let problems = javaforge_lib::commands::validate_model(model.clone());
    let errors: Vec<&Problem> = problems.iter().filter(|p| p.severity == "error").collect();
    assert!(errors.is_empty(), "modelo com erros: {:?}", errors);

    let dir = scratch("update-mesma-coluna");
    write_project(&dir, &model);
    compile(&dir, "update-mesma-coluna");
    mvn_compile(&dir, "update-mesma-coluna");
}

/// Chave estrangeira: o DDL gerado precisa usar REFERENCES e a validação
/// tem de recusar relações que apontam para o nada.
#[test]
fn foreign_key_reaches_ddl_and_validation() {
    let mut model = base_model("Relacoes");
    model.database.tables = vec![
        TableSpec {
            name: "usuarios".to_string(),
            columns: vec![
                ColumnSpec {
                    name: "id".to_string(),
                    col_type: SqlType::Integer,
                    pk: true,
                    not_null: false,
                    auto_increment: true,
                    refs_table: String::new(),
                    refs_column: String::new(),
                },
                ColumnSpec {
                    name: "nome".to_string(),
                    col_type: SqlType::Text,
                    pk: false,
                    not_null: true,
                    auto_increment: false,
                    refs_table: String::new(),
                    refs_column: String::new(),
                },
            ],
            seed_rows: Vec::new(),
        },
        TableSpec {
            name: "logs".to_string(),
            columns: vec![
                ColumnSpec {
                    name: "id".to_string(),
                    col_type: SqlType::Integer,
                    pk: true,
                    not_null: false,
                    auto_increment: true,
                    refs_table: String::new(),
                    refs_column: String::new(),
                },
                ColumnSpec {
                    name: "usuario".to_string(),
                    col_type: SqlType::Text,
                    pk: false,
                    not_null: false,
                    auto_increment: false,
                    refs_table: "usuarios".to_string(),
                    refs_column: "nome".to_string(),
                },
            ],
            seed_rows: Vec::new(),
        },
    ];
    model.windows.push(WindowSpec {
        id: "principal".to_string(),
        title: "Principal".to_string(),
        width: 400.0,
        height: 300.0,
        components: vec![comp("lblTitulo", ComponentType::JLabel, 10.0, 10.0, 200.0, 20.0)],
        menu: Vec::new(),
    });

    let problemas = javaforge_lib::commands::validate_model(model.clone());
    let erros: Vec<&Problem> = problemas.iter().filter(|p| p.severity == "error").collect();
    assert!(erros.is_empty(), "relacao valida barrada: {:?}", erros);

    let ddl = javaforge_lib::commands::ddl_statements(&model);
    let tabela_logs = ddl
        .iter()
        .find(|d| d.contains("\"logs\""))
        .expect("ddl da tabela logs");
    assert!(
        tabela_logs.contains(r#"REFERENCES "usuarios" ("nome")"#),
        "clausula de chave estrangeira ausente:\n{}",
        tabela_logs
    );

    // relacao quebrada gera erro de validacao
    model.database.tables[1].columns[1].refs_table = "inexistente".to_string();
    let problemas = javaforge_lib::commands::validate_model(model);
    assert!(
        problemas
            .iter()
            .any(|p| p.severity == "error" && p.message.contains("inexistente")),
        "tabela inexistente nao foi barrada: {:?}",
        problemas
    );
}

/// Excluir projeto: apaga a pasta e tira dos recentes, mas recusa pasta que
/// não seja projeto JavaForge.
#[test]
fn project_delete_refuses_non_projects() {
    let dir = scratch("excluir-nao-projeto");
    fs::write(dir.join("qualquer-coisa.txt"), "ola").unwrap();
    let erro = javaforge_lib::commands::project_delete(dir.to_string_lossy().to_string())
        .expect_err("pasta sem app.model.json não pode ser apagada");
    assert!(
        erro.contains("app.model.json"),
        "mensagem deveria explicar o motivo: {}",
        erro
    );
    assert!(dir.join("qualquer-coisa.txt").exists(), "a pasta foi apagada");

    let dir = scratch("excluir-projeto");
    let model = templates::template_model("login", "Apagar", "com.teste.app");
    write_project(&dir, &model);
    javaforge_lib::commands::project_delete(dir.to_string_lossy().to_string())
        .expect("projeto deveria ser apagado");
    assert!(!dir.exists(), "a pasta do projeto continua no disco");
}

/// Substituir pasta: sem a marcação o app recusa e não apaga nada; com a
/// marcação a pasta antiga sai e o projeto novo entra no lugar.
#[test]
fn project_create_can_replace_existing_folder() {
    let dir = scratch("substituir-pasta");
    let pai = dir.join("pai");
    fs::create_dir_all(&pai).unwrap();
    let destino = pai.join("MeuApp");
    fs::create_dir_all(&destino).unwrap();
    fs::write(destino.join("antigo.txt"), "conteudo antigo").unwrap();

    let pai_str = pai.to_string_lossy().to_string();

    // sem marcar "substituir": erro e a pasta antiga fica intacta
    let erro = javaforge_lib::commands::project_create(
        "login".to_string(),
        "MeuApp".to_string(),
        pai_str.clone(),
        "com.teste.app".to_string(),
        false,
    )
    .expect_err("nao deveria criar por cima de pasta cheia");
    assert!(erro.contains("já existe"), "mensagem inesperada: {}", erro);
    assert!(
        destino.join("antigo.txt").exists(),
        "o arquivo antigo foi apagado sem permissao"
    );

    // marcando "substituir": a pasta antiga sai e o projeto novo entra
    javaforge_lib::commands::project_create(
        "login".to_string(),
        "MeuApp".to_string(),
        pai_str.clone(),
        "com.teste.app".to_string(),
        true,
    )
    .expect("deveria substituir a pasta");
    assert!(!destino.join("antigo.txt").exists(), "sobrou arquivo antigo");
    assert!(destino.join("app.model.json").exists(), "modelo nao foi criado");
    assert!(
        destino
            .join("src")
            .join("main")
            .join("java")
            .join("com")
            .join("teste")
            .join("app")
            .join("ui")
            .join("LoginWindow.java")
            .exists(),
        "o codigo Java nao foi gerado"
    );

    // nao deixa o projeto de teste na lista de recentes do usuario
    javaforge_lib::registry::forget(&destino.to_string_lossy());
}

/// Cada modelo novo precisa passar pela validação sem erro de componente
/// inexistente, coluna errada ou conexão quebrada.
#[test]
fn new_templates_are_valid() {
    for kind in ["tarefas", "calculadora", "contatos"] {
        let model = templates::template_model(kind, "App Teste", "com.teste.app");
        let problems = javaforge_lib::commands::validate_model(model);
        let errors: Vec<&Problem> = problems.iter().filter(|p| p.severity == "error").collect();
        assert!(errors.is_empty(), "{kind}: erros no modelo: {:?}", errors);
        assert_eq!(
            templates::template_name(kind) != "Aplicativo em branco",
            true,
            "{kind}: template sem nome"
        );
    }
}

#[test]
fn synthetic_model_compiles() {
    let dir = scratch("synthetic");
    let model = synthetic_model();
    let problems = javaforge_lib::commands::validate_model(model.clone());
    let errors: Vec<&Problem> = problems.iter().filter(|p| p.severity == "error").collect();
    assert!(errors.is_empty(), "modelo sintético com erros: {:?}", errors);
    write_project(&dir, &model);
    compile(&dir, "synthetic");
    mvn_compile(&dir, "synthetic");
    db_apply(&dir, &model, false).expect("db_apply deve criar o banco");
    assert!(dir.join("data").join("app.db").exists());
}

#[test]
fn identifiers_are_sane() {
    assert!(is_valid_java_ident("txtUsuario"));
    assert!(!is_valid_java_ident("class"));
    assert!(!is_valid_java_ident("2abc"));
    let model = templates::template_model("login", "X", "com.t.app");
    assert_eq!(java_class_name("login"), "LoginWindow");
    assert_eq!(model.windows.len(), 2);
}

/// Janela com um item de menu cuja conexão grava no banco: o método em Database
/// precisa existir, senão o Java gerado não compila.
#[test]
fn menu_item_db_connection_compiles() {
    let mut model = base_model("Menu Banco");
    let mut win = WindowSpec {
        id: "principal".to_string(),
        title: "Principal".to_string(),
        width: 400.0,
        height: 300.0,
        components: vec![comp("txtNome", ComponentType::JTextField, 10.0, 10.0, 180.0, 26.0)],
        menu: vec![MenuSpec {
            id: "menuArquivo".to_string(),
            label: "Arquivo".to_string(),
            items: vec![MenuItemSpec {
                id: "itemSalvar".to_string(),
                label: "Salvar".to_string(),
            }],
        }],
    };
    win.components
        .push(comp("btnSair", ComponentType::JButton, 10.0, 50.0, 120.0, 30.0));
    model.windows.push(win);
    model.database.tables.push(TableSpec {
        name: "pessoas".to_string(),
        columns: vec![
            ColumnSpec {
                name: "id".to_string(),
                col_type: SqlType::Integer,
                pk: true,
                not_null: false,
                auto_increment: true,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "nome".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: true,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
        ],
        seed_rows: Vec::new(),
    });
    let mut c = ConnectionSpec {
        id: "conexaoMenu".to_string(),
        name: "Salvar do menu".to_string(),
        component_id: "itemSalvar".to_string(),
        event: "actionPerformed".to_string(),
        kind: ConnectionKind::Insert,
        table: "pessoas".to_string(),
        params: vec![ParamSpec {
            column: "nome".to_string(),
            from_component_id: "txtNome".to_string(),
            role: ParamRole::Set,
            operator: QueryOperator::Eq,
        }],
        query_columns: Vec::new(),
        target_table_component_id: String::new(),
        open_window_id: String::new(),
        close_current: false,
        message: "Salvo.".to_string(),
        message_title: "Salvar".to_string(),
        message_kind: "info".to_string(),
        auth_success_window_id: String::new(),
        custom_code: String::new(),
    };
    c.event = "actionPerformed".to_string();
    model.connections.push(c);

    let problems = javaforge_lib::commands::validate_model(model.clone());
    let errors: Vec<&Problem> = problems.iter().filter(|p| p.severity == "error").collect();
    assert!(errors.is_empty(), "modelo com erros: {:?}", errors);

    let dir = scratch("menu-db");
    write_project(&dir, &model);
    compile(&dir, "menu-db");
    mvn_compile(&dir, "menu-db");
}

/// Botão liga/desliga e deslizador devem poder alimentar conexões de banco.
#[test]
fn toggle_and_slider_feed_connections() {
    let mut model = base_model("Novos Componentes");
    let mut win = WindowSpec {
        id: "principal".to_string(),
        title: "Principal".to_string(),
        width: 400.0,
        height: 300.0,
        components: vec![
            comp("tglModo", ComponentType::JToggleButton, 10.0, 10.0, 130.0, 30.0),
            comp("sldNivel", ComponentType::JSlider, 10.0, 50.0, 200.0, 24.0),
            comp("btnGravar", ComponentType::JButton, 10.0, 90.0, 120.0, 30.0),
        ],
        menu: Vec::new(),
    };
    win.components[0].props.insert(
        "selected".to_string(),
        serde_json::Value::Bool(true),
    );
    win.components[1].props
        .insert("value".to_string(), serde_json::json!(70));
    model.windows.push(win);
    model.database.tables.push(TableSpec {
        name: "config".to_string(),
        columns: vec![
            ColumnSpec {
                name: "id".to_string(),
                col_type: SqlType::Integer,
                pk: true,
                not_null: false,
                auto_increment: true,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "ativo".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: false,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "nivel".to_string(),
                col_type: SqlType::Integer,
                pk: false,
                not_null: false,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
        ],
        seed_rows: Vec::new(),
    });
    let mut c = ConnectionSpec {
        id: "conexaoGravar".to_string(),
        name: "Gravar config".to_string(),
        component_id: "btnGravar".to_string(),
        event: "actionPerformed".to_string(),
        kind: ConnectionKind::Insert,
        table: "config".to_string(),
        params: vec![
            ParamSpec {
                column: "ativo".to_string(),
                from_component_id: "tglModo".to_string(),
                role: ParamRole::Set,
                operator: QueryOperator::Eq,
            },
            ParamSpec {
                column: "nivel".to_string(),
                from_component_id: "sldNivel".to_string(),
                role: ParamRole::Set,
                operator: QueryOperator::Eq,
            },
        ],
        query_columns: Vec::new(),
        target_table_component_id: String::new(),
        open_window_id: String::new(),
        close_current: false,
        message: String::new(),
        message_title: String::new(),
        message_kind: "info".to_string(),
        auth_success_window_id: String::new(),
        custom_code: String::new(),
    };
    model.connections.push(c);

    let problems = javaforge_lib::commands::validate_model(model.clone());
    let blocking: Vec<&Problem> = problems
        .iter()
        .filter(|p| p.message.contains("não fornece valor") || p.severity == "error")
        .collect();
    assert!(
        blocking.is_empty(),
        "componentes novos barrados pela validação: {:?}",
        blocking
    );

    let dir = scratch("novos-componentes");
    write_project(&dir, &model);
    compile(&dir, "novos-componentes");
    mvn_compile(&dir, "novos-componentes");
}

/// A orientação do separador é uma propriedade do modelo e precisa chegar ao Java.
#[test]
fn separator_orientation_reaches_generated_code() {
    let mut model = base_model("Separador");
    let mut win = WindowSpec {
        id: "principal".to_string(),
        title: "Principal".to_string(),
        width: 400.0,
        height: 300.0,
        components: vec![comp("sepBloco", ComponentType::JSeparator, 10.0, 10.0, 200.0, 8.0)],
        menu: Vec::new(),
    };
    win.components[0]
        .props
        .insert("orientation".to_string(), serde_json::json!("vertical"));
    model.windows.push(win);

    let files = codegen::generate(&model).expect("codegen deve funcionar");
    let janela = files
        .iter()
        .find(|f| f.path.ends_with("PrincipalWindow.java"))
        .expect("arquivo da janela principal");
    assert!(
        janela.content.contains("setOrientation(javax.swing.SwingConstants.VERTICAL)"),
        "orientação vertical ignorada:\n{}",
        janela.content
    );
}

/// O console de SQL da aba Banco tem que falar com o arquivo de banco do modelo,
/// não com um "app.db" fixo.
#[test]
fn db_sql_uses_configured_database_file() {
    let mut model = base_model("Banco Renomeado");
    model.database.file = "dados.db".to_string();
    let mut win = WindowSpec {
        id: "principal".to_string(),
        title: "Principal".to_string(),
        width: 400.0,
        height: 300.0,
        components: vec![comp("lblTitulo", ComponentType::JLabel, 10.0, 10.0, 200.0, 20.0)],
        menu: Vec::new(),
    };
    win.components.push(comp(
        "tblDados",
        ComponentType::JTable,
        10.0,
        40.0,
        300.0,
        200.0,
    ));
    model.windows.push(win);
    model.database.tables.push(TableSpec {
        name: "pessoas".to_string(),
        columns: vec![
            ColumnSpec {
                name: "id".to_string(),
                col_type: SqlType::Integer,
                pk: true,
                not_null: false,
                auto_increment: true,
                refs_table: String::new(),
                refs_column: String::new(),},
            ColumnSpec {
                name: "nome".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: true,
                auto_increment: false,
                refs_table: String::new(),
                refs_column: String::new(),},
        ],
        seed_rows: vec![BTreeMap::from([("nome".to_string(), "Administrador".to_string())])],
    });

    let dir = scratch("banco-renomeado");
    write_project(&dir, &model);
    db_apply(&dir, &model, false).expect("db_apply deve criar dados.db");
    assert!(dir.join("dados.db").exists(), "dados.db não foi criado");

    let r = db_sql(
        dir.to_string_lossy().to_string(),
        "SELECT nome FROM pessoas".to_string(),
    )
    .expect("db_sql não deve falhar");
    assert!(r.error.is_none(), "db_sql retornou erro: {:?}", r.error);
    assert_eq!(r.columns, vec!["nome".to_string()]);
    assert_eq!(r.rows, vec![vec!["Administrador".to_string()]]);

    // escrita também precisa ir para o arquivo certo
    let u = db_sql(
        dir.to_string_lossy().to_string(),
        "UPDATE pessoas SET nome = 'Novo Nome'".to_string(),
    )
    .expect("db_sql não deve falhar");
    assert!(u.error.is_none(), "update falhou: {:?}", u.error);
    assert_eq!(u.affected, Some(1));

    let d = db_sql(
        dir.to_string_lossy().to_string(),
        "SELECT nome FROM pessoas".to_string(),
    )
    .expect("db_sql não deve falhar");
    assert_eq!(d.rows, vec![vec!["Novo Nome".to_string()]]);
}

