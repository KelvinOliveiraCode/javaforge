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
        refs_table: String::new(),
        refs_column: String::new(),
    }
}

/// Coluna que aponta para outra coluna (chave estrangeira).
fn col_ref(name: &str, col_type: SqlType, table: &str, column: &str) -> ColumnSpec {
    ColumnSpec {
        name: name.to_string(),
        col_type,
        pk: false,
        not_null: false,
        auto_increment: false,
        refs_table: table.to_string(),
        refs_column: column.to_string(),
    }
}

fn window(id: &str, title: &str, w: f64, h: f64, components: Vec<ComponentSpec>) -> WindowSpec {
    WindowSpec {
        id: id.to_string(),
        title: title.to_string(),
        width: w,
        height: h,
        components,
        menu: Vec::new(),
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
        "tarefas" => tarefas_template(name, package_name),
        "calculadora" => calculadora_template(name, package_name),
        "contatos" => contatos_template(name, package_name),
        _ => blank_template(name, package_name),
    }
}

pub fn template_name(kind: &str) -> &'static str {
    match kind {
        "login" => "Login + Painel principal",
        "crud" => "Cadastro (CRUD) com tabela",
        "tarefas" => "Lista de tarefas",
        "calculadora" => "Calculadora",
        "contatos" => "Agenda de contatos",
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
            file: "data/app.db".to_string(),
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
            file: "data/app.db".to_string(),
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
            file: "data/app.db".to_string(),
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

/// Lista de tarefas: adicionar, renomear, excluir e listar. Bom primeiro contato
/// com consulta, inserção, atualização e exclusão em uma tabela só.
fn tarefas_template(name: &str, package_name: &str) -> AppModel {
    let principal = window(
        "tarefas",
        "Minhas tarefas",
        680.0,
        430.0,
        vec![
            comp("lblTitulo", ComponentType::JLabel, 24.0, 18.0, 300.0, 22.0, &[("text", "Minhas tarefas")]),
            comp("lblNova", ComponentType::JLabel, 24.0, 54.0, 60.0, 20.0, &[("text", "Nova:")]),
            comp("txtNova", ComponentType::JTextField, 90.0, 50.0, 220.0, 26.0, &[("columns", "18")]),
            comp("btnAdicionar", ComponentType::JButton, 324.0, 50.0, 110.0, 28.0, &[("text", "Adicionar")]),
            comp("btnListar", ComponentType::JButton, 444.0, 50.0, 130.0, 28.0, &[("text", "Listar todas")]),
            comp("lblProjeto", ComponentType::JLabel, 24.0, 94.0, 70.0, 20.0, &[("text", "Projeto:")]),
            comp(
                "cmbProjeto",
                ComponentType::JComboBox,
                90.0,
                90.0,
                160.0,
                26.0,
                &[("items", "Estudo, Trabalho, Casa")],
            ),
            comp(
                "lblDica2",
                ComponentType::JLabel,
                266.0,
                94.0,
                380.0,
                20.0,
                &[("text", "A tabela tarefas guarda o projeto por chave estrangeira.")],
            ),
            comp("tblTarefas", ComponentType::JTable, 24.0, 126.0, 630.0, 200.0, &[]),
            comp("lblLocalizar", ComponentType::JLabel, 24.0, 340.0, 70.0, 20.0, &[("text", "Localizar:")]),
            comp("txtTitulo", ComponentType::JTextField, 100.0, 336.0, 180.0, 26.0, &[("columns", "16")]),
            comp("btnExcluir", ComponentType::JButton, 296.0, 336.0, 100.0, 26.0, &[("text", "Excluir")]),
            comp("lblNovoTitulo", ComponentType::JLabel, 24.0, 378.0, 90.0, 20.0, &[("text", "Novo título:")]),
            comp("txtNovoTitulo", ComponentType::JTextField, 100.0, 374.0, 180.0, 26.0, &[("columns", "16")]),
            comp("btnRenomear", ComponentType::JButton, 296.0, 374.0, 100.0, 26.0, &[("text", "Renomear")]),
            comp(
                "lblDica",
                ComponentType::JLabel,
                24.0,
                412.0,
                630.0,
                34.0,
                &[("text", "Digite o título de uma tarefa em \"Localizar\" para excluir ou renomear. \"Listar todas\" mostra a tabela inteira, com o projeto de cada tarefa.")],
            ),
        ],
    );

    let mut adicionar = conn(
        "conexao1",
        "Adicionar tarefa",
        "btnAdicionar",
        "actionPerformed",
        ConnectionKind::Insert,
    );
    adicionar.table = "tarefas".to_string();
    adicionar.params = vec![
        param("titulo", "txtNova", ParamRole::Set, QueryOperator::Eq),
        param("projeto", "cmbProjeto", ParamRole::Set, QueryOperator::Eq),
    ];
    adicionar.message = "Tarefa adicionada.".to_string();
    adicionar.message_title = "Tarefas".to_string();

    let mut listar = conn(
        "conexao2",
        "Listar tarefas",
        "btnListar",
        "actionPerformed",
        ConnectionKind::Query,
    );
    listar.table = "tarefas".to_string();
    listar.query_columns = vec![
        QueryColumn { column: "id".into(), header: "Código".into() },
        QueryColumn { column: "titulo".into(), header: "Tarefa".into() },
        QueryColumn { column: "projeto".into(), header: "Projeto".into() },
    ];
    listar.target_table_component_id = "tblTarefas".to_string();

    let mut excluir = conn(
        "conexao3",
        "Excluir tarefa",
        "btnExcluir",
        "actionPerformed",
        ConnectionKind::Delete,
    );
    excluir.table = "tarefas".to_string();
    excluir.params = vec![param("titulo", "txtTitulo", ParamRole::Where, QueryOperator::Eq)];
    excluir.message = "Tarefa excluída.".to_string();
    excluir.message_title = "Tarefas".to_string();

    let mut renomear = conn(
        "conexao4",
        "Renomear tarefa",
        "btnRenomear",
        "actionPerformed",
        ConnectionKind::Update,
    );
    renomear.table = "tarefas".to_string();
    renomear.params = vec![
        param("titulo", "txtNovoTitulo", ParamRole::Set, QueryOperator::Eq),
        param("titulo", "txtTitulo", ParamRole::Where, QueryOperator::Eq),
    ];
    renomear.message = "Tarefa renomeada.".to_string();
    renomear.message_title = "Tarefas".to_string();

    AppModel {
        schema_version: 1,
        name: name.to_string(),
        package_name: package_name.to_string(),
        main_window_id: principal.id.clone(),
        windows: vec![principal],
        database: DatabaseSpec {
            file: "data/app.db".to_string(),
            tables: vec![
                table(
                    "projetos",
                    vec![
                        col("id", SqlType::Integer, true, false, true),
                        col("nome", SqlType::Text, false, true, false),
                    ],
                    vec![
                        vec![("nome", "Estudo")],
                        vec![("nome", "Trabalho")],
                        vec![("nome", "Casa")],
                    ],
                ),
                table(
                    "tarefas",
                    vec![
                        col("id", SqlType::Integer, true, false, true),
                        col("titulo", SqlType::Text, false, true, false),
                        col_ref("projeto", SqlType::Text, "projetos", "nome"),
                    ],
                    vec![
                        vec![("titulo", "Estudar Java"), ("projeto", "Estudo")],
                        vec![("titulo", "Fazer compras"), ("projeto", "Casa")],
                    ],
                ),
            ],
        },
        connections: vec![adicionar, listar, excluir, renomear],
    }
}

/// Calculadora sem banco: mostra como usar código manual em um botão.
fn calculadora_template(name: &str, package_name: &str) -> AppModel {
    let principal = window(
        "principal",
        "Calculadora",
        420.0,
        340.0,
        vec![
            comp("lblTitulo", ComponentType::JLabel, 24.0, 20.0, 300.0, 22.0, &[("text", "Calculadora simples")]),
            comp("lblNum1", ComponentType::JLabel, 24.0, 62.0, 80.0, 20.0, &[("text", "Número 1:")]),
            comp("txtNum1", ComponentType::JTextField, 124.0, 58.0, 160.0, 26.0, &[("columns", "12")]),
            comp("lblNum2", ComponentType::JLabel, 24.0, 102.0, 80.0, 20.0, &[("text", "Número 2:")]),
            comp("txtNum2", ComponentType::JTextField, 124.0, 98.0, 160.0, 26.0, &[("columns", "12")]),
            comp("lblOperacao", ComponentType::JLabel, 24.0, 142.0, 80.0, 20.0, &[("text", "Operação:")]),
            comp(
                "cmbOperacao",
                ComponentType::JComboBox,
                124.0,
                138.0,
                160.0,
                26.0,
                &[("items", "Somar, Subtrair, Multiplicar, Dividir")],
            ),
            comp("btnCalcular", ComponentType::JButton, 124.0, 182.0, 120.0, 32.0, &[("text", "Calcular")]),
            comp("lblResultado", ComponentType::JLabel, 24.0, 232.0, 80.0, 20.0, &[("text", "Resultado:")]),
            comp("txtResultado", ComponentType::JTextField, 124.0, 228.0, 160.0, 26.0, &[("columns", "12"), ("enabled", "false")]),
            comp(
                "lblDica",
                ComponentType::JLabel,
                24.0,
                268.0,
                370.0,
                44.0,
                &[("text", "Sem banco de dados: o botão Calcular roda o código Java que você escreveu na conexão. Abra a aba Conexões para ver e mudar esse código.")],
            ),
        ],
    );

    let mut calcular = conn(
        "conexao1",
        "Calcular",
        "btnCalcular",
        "actionPerformed",
        ConnectionKind::Custom,
    );
    calcular.custom_code = concat!(
        "double a = Double.parseDouble(txtNum1.getText().replace(\",\", \".\"));\n",
        "double b = Double.parseDouble(txtNum2.getText().replace(\",\", \".\"));\n",
        "String op = String.valueOf(cmbOperacao.getSelectedItem());\n",
        "double r = 0;\n",
        "if (\"Somar\".equals(op)) r = a + b;\n",
        "else if (\"Subtrair\".equals(op)) r = a - b;\n",
        "else if (\"Multiplicar\".equals(op)) r = a * b;\n",
        "else if (\"Dividir\".equals(op)) {\n",
        "    if (b == 0) throw new ArithmeticException(\"divisão por zero\");\n",
        "    r = a / b;\n",
        "}\n",
        "txtResultado.setText(String.valueOf(r));"
    )
    .to_string();

    AppModel {
        schema_version: 1,
        name: name.to_string(),
        package_name: package_name.to_string(),
        main_window_id: principal.id.clone(),
        windows: vec![principal],
        database: DatabaseSpec {
            file: "data/app.db".to_string(),
            tables: Vec::new(),
        },
        connections: vec![calcular],
    }
}

/// Agenda de contatos: cadastro curto com pesquisa por nome.
fn contatos_template(name: &str, package_name: &str) -> AppModel {
    let principal = window(
        "contatos",
        "Agenda de contatos",
        700.0,
        470.0,
        vec![
            comp("lblTitulo", ComponentType::JLabel, 24.0, 18.0, 300.0, 22.0, &[("text", "Meus contatos")]),
            comp("lblBuscar", ComponentType::JLabel, 24.0, 52.0, 60.0, 20.0, &[("text", "Buscar:")]),
            comp("txtBuscar", ComponentType::JTextField, 90.0, 48.0, 260.0, 26.0, &[("columns", "20")]),
            comp("btnPesquisar", ComponentType::JButton, 366.0, 48.0, 110.0, 28.0, &[("text", "Pesquisar")]),
            comp("tblContatos", ComponentType::JTable, 24.0, 88.0, 650.0, 190.0, &[]),
            comp("lblNome", ComponentType::JLabel, 24.0, 296.0, 70.0, 20.0, &[("text", "Nome:")]),
            comp("txtNome", ComponentType::JTextField, 100.0, 292.0, 220.0, 26.0, &[("columns", "18")]),
            comp("lblTelefone", ComponentType::JLabel, 24.0, 334.0, 70.0, 20.0, &[("text", "Telefone:")]),
            comp("txtTelefone", ComponentType::JTextField, 100.0, 330.0, 220.0, 26.0, &[("columns", "18")]),
            comp("lblEmail", ComponentType::JLabel, 350.0, 296.0, 60.0, 20.0, &[("text", "E-mail:")]),
            comp("txtEmail", ComponentType::JTextField, 414.0, 292.0, 260.0, 26.0, &[("columns", "20")]),
            comp("btnSalvar", ComponentType::JButton, 100.0, 372.0, 120.0, 30.0, &[("text", "Salvar")]),
            comp("btnExcluir", ComponentType::JButton, 236.0, 372.0, 120.0, 30.0, &[("text", "Excluir")]),
            comp(
                "lblDica",
                ComponentType::JLabel,
                24.0,
                414.0,
                650.0,
                34.0,
                &[("text", "Preencha nome, telefone e e-mail e clique em Salvar. Pesquisar sem texto lista todos os contatos; Excluir apaga o nome digitado em \"Nome\".")],
            ),
        ],
    );

    let mut pesquisar = conn(
        "conexao1",
        "Pesquisar contatos",
        "btnPesquisar",
        "actionPerformed",
        ConnectionKind::Query,
    );
    pesquisar.table = "contatos".to_string();
    pesquisar.params = vec![param("nome", "txtBuscar", ParamRole::Where, QueryOperator::Like)];
    pesquisar.query_columns = vec![
        QueryColumn { column: "id".into(), header: "Código".into() },
        QueryColumn { column: "nome".into(), header: "Nome".into() },
        QueryColumn { column: "telefone".into(), header: "Telefone".into() },
        QueryColumn { column: "email".into(), header: "E-mail".into() },
    ];
    pesquisar.target_table_component_id = "tblContatos".to_string();

    let mut salvar = conn(
        "conexao2",
        "Salvar contato",
        "btnSalvar",
        "actionPerformed",
        ConnectionKind::Insert,
    );
    salvar.table = "contatos".to_string();
    salvar.params = vec![
        param("nome", "txtNome", ParamRole::Set, QueryOperator::Eq),
        param("telefone", "txtTelefone", ParamRole::Set, QueryOperator::Eq),
        param("email", "txtEmail", ParamRole::Set, QueryOperator::Eq),
    ];
    salvar.message = "Contato salvo.".to_string();
    salvar.message_title = "Contatos".to_string();

    let mut excluir = conn(
        "conexao3",
        "Excluir contato",
        "btnExcluir",
        "actionPerformed",
        ConnectionKind::Delete,
    );
    excluir.table = "contatos".to_string();
    excluir.params = vec![param("nome", "txtNome", ParamRole::Where, QueryOperator::Eq)];
    excluir.message = "Contato excluído.".to_string();
    excluir.message_title = "Contatos".to_string();

    AppModel {
        schema_version: 1,
        name: name.to_string(),
        package_name: package_name.to_string(),
        main_window_id: principal.id.clone(),
        windows: vec![principal],
        database: DatabaseSpec {
            file: "data/app.db".to_string(),
            tables: vec![table(
                "contatos",
                vec![
                    col("id", SqlType::Integer, true, false, true),
                    col("nome", SqlType::Text, false, true, false),
                    col("telefone", SqlType::Text, false, false, false),
                    col("email", SqlType::Text, false, false, false),
                ],
                vec![vec![
                    ("nome", "Ana Souza"),
                    ("telefone", "(11) 90000-0001"),
                    ("email", "ana@exemplo.com"),
                ]],
            )],
        },
        connections: vec![pesquisar, salvar, excluir],
    }
}

/// Nome de classe da janela principal (usado no Main.java).
pub fn main_class_name(model: &AppModel) -> String {
    let win = model.windows.iter().find(|w| w.id == model.main_window_id);
    java_class_name(win.map(|w| w.id.as_str()).unwrap_or("principal"))
}

