use crate::model::*;
use crate::util::java_class_name;
use std::collections::BTreeMap;

fn props(entries: &[(&str, &str)]) -> Props {
    let mut map = BTreeMap::new();
    for (k, v) in entries {
        map.insert(k.to_string(), serde_json::json!(v));
    }
    map
}

fn comp(
    id: &str,
    comp_type: ComponentType,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    entries: &[(&str, &str)],
) -> ComponentSpec {
    ComponentSpec {
        id: id.to_string(),
        comp_type,
        x,
        y,
        width: w,
        height: h,
        props: props(entries),
        parent_id: None,
    }
}

fn table(name: &str, columns: Vec<ColumnSpec>, seeds: Vec<Vec<(&str, &str)>>) -> TableSpec {
    TableSpec {
        name: name.to_string(),
        columns,
        seed_rows: seeds
            .into_iter()
            .map(|row| {
                let mut map = BTreeMap::new();
                for (k, v) in row {
                    map.insert(k.to_string(), v.to_string());
                }
                map
            })
            .collect(),
    }
}

fn col(name: &str, col_type: SqlType, pk: bool, not_null: bool, auto_increment: bool) -> ColumnSpec {
    ColumnSpec {
        name: name.to_string(),
        col_type,
        pk,
        not_null,
        auto_increment,
    }
}

fn window(id: &str, title: &str, w: f64, h: f64, components: Vec<ComponentSpec>) -> WindowSpec {
    WindowSpec {
        id: id.to_string(),
        title: title.to_string(),
        width: w,
        height: h,
        components,
    }
}

fn param(column: &str, from: &str, role: ParamRole, operator: QueryOperator) -> ParamSpec {
    ParamSpec {
        column: column.to_string(),
        from_component_id: from.to_string(),
        role,
        operator,
    }
}

fn conn(id: &str, name: &str, component_id: &str, event: &str, kind: ConnectionKind) -> ConnectionSpec {
    ConnectionSpec {
        id: id.to_string(),
        name: name.to_string(),
        component_id: component_id.to_string(),
        event: event.to_string(),
        kind,
        table: String::new(),
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
}

pub fn template_model(kind: &str, name: &str, package_name: &str) -> AppModel {
    match kind {
        "login" => login_template(name, package_name),
        "crud" => crud_template(name, package_name),
        _ => blank_template(name, package_name),
    }
}

pub fn template_name(kind: &str) -> &'static str {
    match kind {
        "login" => "Login + Painel principal",
        "crud" => "Cadastro (CRUD) com tabela",
        _ => "Aplicativo em branco",
    }
}

fn blank_template(name: &str, package_name: &str) -> AppModel {
    let principal = window(
        "principal",
        "Minha aplicação",
        760.0,
        480.0,
        vec![
            comp(
                "lblTitulo",
                ComponentType::JLabel,
                32.0,
                28.0,
                320.0,
                22.0,
                &[("text", "Olá! Arraste componentes da paleta para começar.")],
            ),
            comp(
                "btnAcao",
                ComponentType::JButton,
                32.0,
                66.0,
                140.0,
                32.0,
                &[("text", "Clique aqui")],
            ),
        ],
    );
    AppModel {
        schema_version: 1,
        name: name.to_string(),
        package_name: package_name.to_string(),
        main_window_id: principal.id.clone(),
        windows: vec![principal],
        database: DatabaseSpec {
            file: "app.db".to_string(),
            tables: vec![table(
                "registros",
                vec![
                    col("id", SqlType::Integer, true, false, true),
                    col("titulo", SqlType::Text, false, false, false),
                    col("criado_em", SqlType::Text, false, false, false),
                ],
                vec![],
            )],
        },
        connections: vec![],
    }
}

fn login_template(name: &str, package_name: &str) -> AppModel {
    let login = window(
        "login",
        "Entrar",
        440.0,
        330.0,
        vec![
            comp("lblTitulo", ComponentType::JLabel, 30.0, 22.0, 200.0, 22.0, &[("text", "Acesso ao sistema")]),
            comp("lblUsuario", ComponentType::JLabel, 30.0, 66.0, 80.0, 22.0, &[("text", "Usuário:")]),
            comp("txtUsuario", ComponentType::JTextField, 122.0, 62.0, 250.0, 26.0, &[("columns", "18")]),
            comp("lblSenha", ComponentType::JLabel, 30.0, 106.0, 80.0, 22.0, &[("text", "Senha:")]),
            comp("pwdSenha", ComponentType::JPasswordField, 122.0, 102.0, 250.0, 26.0, &[("columns", "18")]),
            comp("btnEntrar", ComponentType::JButton, 122.0, 150.0, 120.0, 32.0, &[("text", "Entrar")]),
            comp("btnCancelar", ComponentType::JButton, 252.0, 150.0, 120.0, 32.0, &[("text", "Cancelar")]),
        ],
    );
    let principal = window(
        "principal",
        "Sistema",
        720.0,
        440.0,
        vec![
            comp("lblBoasVindas", ComponentType::JLabel, 28.0, 26.0, 400.0, 24.0, &[("text", "Bem-vindo ao sistema!")]),
            comp(
                "lblInfo",
                ComponentType::JLabel,
                28.0,
                58.0,
                420.0,
                22.0,
                &[("text", "Use as conexões para ligar botões ao banco SQLite.")],
            ),
            comp(
                "btnSair",
                ComponentType::JButton,
                28.0,
                96.0,
                110.0,
                30.0,
                &[("text", "Sair")],
            ),
        ],
    );

    let mut entrar = conn(
        "conexao1",
        "Validar login",
        "btnEntrar",
        "actionPerformed",
        ConnectionKind::Authenticate,
    );
    entrar.table = "usuarios".to_string();
    entrar.params = vec![
        param("usuario", "txtUsuario", ParamRole::Where, QueryOperator::Eq),
        param("senha", "pwdSenha", ParamRole::Where, QueryOperator::Eq),
    ];
    entrar.auth_success_window_id = principal.id.clone();
    entrar.close_current = true;
    entrar.message = "Bem-vindo!".to_string();
    entrar.message_title = "Login".to_string();
    entrar.message_kind = "info".to_string();

    let mut cancelar = conn(
        "conexao2",
        "Cancelar login",
        "btnCancelar",
        "actionPerformed",
        ConnectionKind::Custom,
    );
    cancelar.custom_code =
        "JOptionPane.showMessageDialog(this, \"Operação cancelada.\", \"Login\", JOptionPane.WARNING_MESSAGE);\nSystem.exit(0);"
            .to_string();

    let mut sair = conn(
        "conexao3",
        "Sair do sistema",
        "btnSair",
        "actionPerformed",
        ConnectionKind::Custom,
    );
    sair.custom_code = "System.exit(0);".to_string();

    AppModel {
        schema_version: 1,
        name: name.to_string(),
        package_name: package_name.to_string(),
        main_window_id: login.id.clone(),
        windows: vec![login, principal],
        database: DatabaseSpec {
            file: "app.db".to_string(),
            tables: vec![table(
                "usuarios",
                vec![
                    col("id", SqlType::Integer, true, false, true),
                    col("usuario", SqlType::Text, false, true, false),
                    col("senha", SqlType::Text, false, true, false),
                    col("nome", SqlType::Text, false, false, false),
                ],
                vec![vec![
                    ("usuario", "admin"),
                    ("senha", "1234"),
                    ("nome", "Administrador"),
                ]],
            )],
        },
        connections: vec![entrar, cancelar, sair],
    }
}

fn crud_template(name: &str, package_name: &str) -> AppModel {
    let principal = window(
        "produtos",
        "Cadastro de produtos",
        720.0,
        520.0,
        vec![
            comp("lblTitulo", ComponentType::JLabel, 24.0, 18.0, 300.0, 22.0, &[("text", "Produtos")]),
            comp("lblBuscar", ComponentType::JLabel, 24.0, 52.0, 60.0, 20.0, &[("text", "Buscar:")]),
            comp("txtBuscar", ComponentType::JTextField, 90.0, 48.0, 200.0, 26.0, &[("columns", "16")]),
            comp("btnBuscar", ComponentType::JButton, 300.0, 48.0, 110.0, 28.0, &[("text", "Pesquisar")]),
            comp(
                "tblProdutos",
                ComponentType::JTable,
                24.0,
                92.0,
                440.0,
                200.0,
                &[],
            ),
            comp("lblId", ComponentType::JLabel, 492.0, 96.0, 60.0, 20.0, &[("text", "Código:")]),
            comp("txtId", ComponentType::JTextField, 556.0, 92.0, 120.0, 26.0, &[("columns", "8")]),
            comp("lblNome", ComponentType::JLabel, 492.0, 140.0, 60.0, 20.0, &[("text", "Nome:")]),
            comp("txtNome", ComponentType::JTextField, 556.0, 136.0, 132.0, 26.0, &[("columns", "10")]),
            comp("lblPreco", ComponentType::JLabel, 492.0, 184.0, 60.0, 20.0, &[("text", "Preço:")]),
            comp("txtPreco", ComponentType::JTextField, 556.0, 180.0, 132.0, 26.0, &[("columns", "10")]),
            comp("btnNovo", ComponentType::JButton, 492.0, 232.0, 88.0, 30.0, &[("text", "Novo")]),
            comp("btnSalvar", ComponentType::JButton, 588.0, 232.0, 88.0, 30.0, &[("text", "Salvar")]),
            comp("btnExcluir", ComponentType::JButton, 492.0, 272.0, 184.0, 30.0, &[("text", "Excluir selecionado")]),
            comp(
                "lblDica",
                ComponentType::JLabel,
                24.0,
                306.0,
                460.0,
                40.0,
                &[("text", "Digite o código de um produto para atualizar ou excluir. Use Pesquisar sem filtro para listar tudo.")],
            ),
        ],
    );

    let mut buscar = conn(
        "conexao1",
        "Pesquisar produtos",
        "btnBuscar",
        "actionPerformed",
        ConnectionKind::Query,
    );
    buscar.table = "produtos".to_string();
    buscar.params = vec![param("nome", "txtBuscar", ParamRole::Where, QueryOperator::Like)];
    buscar.query_columns = vec![
        QueryColumn { column: "id".into(), header: "Código".into() },
        QueryColumn { column: "nome".into(), header: "Nome".into() },
        QueryColumn { column: "preco".into(), header: "Preço".into() },
    ];
    buscar.target_table_component_id = "tblProdutos".to_string();

    let mut novo = conn("conexao2", "Limpar formulário", "btnNovo", "actionPerformed", ConnectionKind::Custom);
    novo.custom_code = "txtId.setText(\"\");\ntxtNome.setText(\"\");\ntxtPreco.setText(\"\");\ntxtNome.requestFocus();".to_string();

    let mut salvar = conn(
        "conexao3",
        "Salvar produto",
        "btnSalvar",
        "actionPerformed",
        ConnectionKind::Insert,
    );
    salvar.table = "produtos".to_string();
    salvar.params = vec![
        param("nome", "txtNome", ParamRole::Set, QueryOperator::Eq),
        param("preco", "txtPreco", ParamRole::Set, QueryOperator::Eq),
    ];
    salvar.message = "Produto salvo com sucesso.".to_string();
    salvar.message_title = "Salvar".to_string();

    let mut excluir = conn(
        "conexao4",
        "Excluir produto",
        "btnExcluir",
        "actionPerformed",
        ConnectionKind::Delete,
    );
    excluir.table = "produtos".to_string();
    excluir.params = vec![param("id", "txtId", ParamRole::Where, QueryOperator::Eq)];
    excluir.message = "Produto excluído.".to_string();
    excluir.message_title = "Excluir".to_string();

    AppModel {
        schema_version: 1,
        name: name.to_string(),
        package_name: package_name.to_string(),
        main_window_id: principal.id.clone(),
        windows: vec![principal],
        database: DatabaseSpec {
            file: "app.db".to_string(),
            tables: vec![table(
                "produtos",
                vec![
                    col("id", SqlType::Integer, true, false, true),
                    col("nome", SqlType::Text, false, true, false),
                    col("preco", SqlType::Real, false, true, false),
                ],
                vec![
                    vec![("nome", "Arroz 5kg"), ("preco", "24.90")],
                    vec![("nome", "Feijão 1kg"), ("preco", "8.50")],
                    vec![("nome", "Macarrão"), ("preco", "4.20")],
                ],
            )],
        },
        connections: vec![buscar, novo, salvar, excluir],
    }
}

/// Nome de classe da janela principal (usado no Main.java).
pub fn main_class_name(model: &AppModel) -> String {
    let win = model.windows.iter().find(|w| w.id == model.main_window_id);
    java_class_name(win.map(|w| w.id.as_str()).unwrap_or("principal"))
}
