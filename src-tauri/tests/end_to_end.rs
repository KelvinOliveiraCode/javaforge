// Prova de ponta a ponta do codegen: gera os templates e um modelo sintático
// com todos os componentes e todos os tipos de conexão, compila tudo com javac
// e com Maven, e cria o banco via um SchemaTool Java.

use javaforge_lib::codegen;
use javaforge_lib::commands::db_apply;
use javaforge_lib::model::*;
use javaforge_lib::templates;
use javaforge_lib::util::{is_valid_java_ident, java_class_name, SQLITE_JAR_BYTES};
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
        fs::write(&target, &f.content).unwrap();
    }
    fs::create_dir_all(dir.join("lib")).unwrap();
    fs::write(dir.join("lib").join("sqlite-jdbc.jar"), SQLITE_JAR_BYTES).unwrap();
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
    collect(&dir.join("src"), &mut java_files);
    assert!(!java_files.is_empty(), "{}: nenhum arquivo java gerado", label);
    let result = Command::new(javac())
        .arg("-encoding")
        .arg("UTF-8")
        .arg("-d")
        .arg(&out)
        .arg("-cp")
        .arg(dir.join("lib").join("sqlite-jdbc.jar"))
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
            file: "app.db".to_string(),
            tables: Vec::new(),
        },
        connections: Vec::new(),
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
        components: vec![
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
        ],
    };
    let mut filho = comp("lblFilho", ComponentType::JLabel, 330.0, 350.0, 120.0, 20.0);
    filho.parent_id = Some("pnlGrupo".to_string());
    win.components.push(filho);

    let mut win2 = WindowSpec {
        id: "secundaria".to_string(),
        title: "Secundária".to_string(),
        width: 400.0,
        height: 300.0,
        components: vec![comp("lblOutra", ComponentType::JLabel, 20.0, 20.0, 200.0, 20.0)],
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
            },
            ColumnSpec {
                name: "usuario".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: true,
                auto_increment: false,
            },
            ColumnSpec {
                name: "senha".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: true,
                auto_increment: false,
            },
            ColumnSpec {
                name: "nome".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: false,
                auto_increment: false,
            },
            ColumnSpec {
                name: "preco".to_string(),
                col_type: SqlType::Real,
                pk: false,
                not_null: false,
                auto_increment: false,
            },
            ColumnSpec {
                name: "observacao".to_string(),
                col_type: SqlType::Text,
                pk: false,
                not_null: false,
                auto_increment: false,
            },
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

#[test]
fn templates_compile() {
    for kind in ["blank", "login", "crud"] {
        let dir = scratch(&format!("tpl-{kind}"));
        let model = templates::template_model(kind, "App Teste", "com.teste.app");
        write_project(&dir, &model);
        compile(&dir, kind);
        mvn_compile(&dir, kind);
        // O banco é criado via SchemaTool (javac + java + driver JDBC).
        db_apply(&dir, &model, false).expect("db_apply deve criar o banco");
        assert!(
            dir.join("app.db").exists(),
            "{kind}: app.db não foi criado"
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
    assert!(dir.join("app.db").exists());
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
