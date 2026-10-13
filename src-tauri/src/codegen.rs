use crate::model::*;
use crate::util::*;

pub struct GeneratedFile {
    pub path: String,
    pub content: String,
}

struct DbMethod {
    conn_id: String,
    name: String,
    code: String,
}

pub fn generate(model: &AppModel) -> Result<Vec<GeneratedFile>, String> {
    if model.package_name.trim().is_empty() {
        return Err("O pacote Java não pode ficar vazio.".to_string());
    }
    if !model.package_name.split('.').all(|p| is_valid_java_ident(p)) {
        return Err(format!(
            "Pacote Java inválido: {}. Use apenas letras minúsculas separadas por ponto.",
            model.package_name
        ));
    }

    let pkg_path = pkg_to_path(&model.package_name);
    let mut files: Vec<GeneratedFile> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    // Nomes de classe das janelas (únicos).
    let mut class_names: Vec<String> = Vec::new();
    for win in &model.windows {
        let mut name = java_class_name(&win.id);
        let mut n = 2;
        while class_names.contains(&name) {
            name = format!("{}{}", java_class_name(&win.id), n);
            n += 1;
        }
        class_names.push(name);
    }

    let main_idx = model
        .windows
        .iter()
        .position(|w| w.id == model.main_window_id)
        .unwrap_or(0);
    let main_class = class_names
        .get(main_idx)
        .cloned()
        .unwrap_or_else(|| "JanelaWindow".to_string());

    let plan = plan_database(model, &mut warnings);

    files.push(GeneratedFile {
        path: format!("src/main/java/{}/Main.java", pkg_path),
        content: gen_main(model, &main_class, &class_names),
    });
    files.push(GeneratedFile {
        path: format!("src/main/java/{}/db/Schema.java", pkg_path),
        content: gen_schema(model),
    });
    files.push(GeneratedFile {
        path: format!("src/main/java/{}/db/Database.java", pkg_path),
        content: gen_database(model, &plan),
    });

    for (idx, win) in model.windows.iter().enumerate() {
        files.push(GeneratedFile {
            path: format!("src/main/java/{}/ui/{}.java", pkg_path, class_names[idx]),
            content: gen_window(model, win, &class_names, &plan, &mut warnings),
        });
    }

    files.push(GeneratedFile {
        path: "pom.xml".to_string(),
        content: gen_pom(model),
    });
    files.push(GeneratedFile {
        path: "README.md".to_string(),
        content: gen_readme(model),
    });
    files.push(GeneratedFile {
        path: ".gitignore".to_string(),
        content: "target/\nbuild/\ndata/\n*.class\n*.db\n".to_string(),
    });
    files.push(GeneratedFile {
        path: "mvnw".to_string(),
        content: String::from_utf8_lossy(MVNW_BYTES).to_string(),
    });
    files.push(GeneratedFile {
        path: "mvnw.cmd".to_string(),
        content: String::from_utf8_lossy(MVNW_CMD_BYTES).to_string(),
    });
    files.push(GeneratedFile {
        path: ".mvn/wrapper/maven-wrapper.properties".to_string(),
        content: String::from_utf8_lossy(MVNW_PROPS_BYTES).to_string(),
    });

    Ok(files)
}

// --------------------------------------------------------------- utilidades --

fn table_of<'a>(model: &'a AppModel, table: &str) -> Option<&'a TableSpec> {
    model.database.tables.iter().find(|t| t.name == table)
}

fn col_of<'a>(model: &'a AppModel, table: &str, column: &str) -> Option<&'a ColumnSpec> {
    table_of(model, table).and_then(|t| t.columns.iter().find(|c| c.name == column))
}

fn comp_in<'a>(window: &'a WindowSpec, id: &str) -> Option<&'a ComponentSpec> {
    window.components.iter().find(|c| c.id == id)
}

fn is_param_source(c: &ComponentSpec) -> bool {
    matches!(
        c.comp_type,
        ComponentType::JTextField
            | ComponentType::JPasswordField
            | ComponentType::JTextArea
            | ComponentType::JCheckBox
            | ComponentType::JRadioButton
            | ComponentType::JComboBox
            | ComponentType::JList
            | ComponentType::JSpinner
            | ComponentType::JToggleButton
            | ComponentType::JSlider
    )
}

fn read_expr(comp: &ComponentSpec) -> String {
    let v = java_ident(&comp.id, "campo");
    match comp.comp_type {
        ComponentType::JTextField | ComponentType::JTextArea => format!("{}.getText()", v),
        ComponentType::JPasswordField => format!("new String({}.getPassword())", v),
        ComponentType::JCheckBox | ComponentType::JRadioButton => {
            format!("String.valueOf({}.isSelected())", v)
        }
        ComponentType::JToggleButton => format!("String.valueOf({}.isSelected())", v),
        ComponentType::JComboBox => format!("String.valueOf({}.getSelectedItem())", v),
        ComponentType::JList => format!("String.valueOf({}.getSelectedValue())", v),
        ComponentType::JSpinner => format!("String.valueOf({}.getValue())", v),
        ComponentType::JSlider => format!("String.valueOf({}.getValue())", v),
        _ => String::new(),
    }
}

/// Parâmetros válidos de um papel (set/where), com componente e coluna resolvidos.
/// Retorna (coluna, componente, parâmetro).
fn valid_params<'a>(
    model: &'a AppModel,
    window: &'a WindowSpec,
    table: &str,
    params: &'a [ParamSpec],
    role: ParamRole,
    warnings: &mut Vec<String>,
) -> Vec<(&'a ColumnSpec, &'a ComponentSpec, &'a ParamSpec)> {
    let mut out = Vec::new();
    for p in params {
        if p.role != role {
            continue;
        }
        let Some(col) = col_of(model, table, &p.column) else {
            warnings.push(format!(
                "Coluna {} não existe na tabela {}; parâmetro ignorado.",
                p.column, table
            ));
            continue;
        };
        let Some(comp) = comp_in(window, &p.from_component_id) else {
            warnings.push(format!(
                "Componente {} não existe na janela; parâmetro ignorado.",
                p.from_component_id
            ));
            continue;
        };
        if !is_param_source(comp) {
            warnings.push(format!(
                "Componente {} não fornece valor para consultas; parâmetro ignorado.",
                comp.id
            ));
            continue;
        }
        out.push((col, comp, p));
    }
    out
}

/// Nomes de variável únicos (colunas repetidas recebem sufixo 2, 3...).
fn unique_vars<'a>(
    params: &'a [(&'a ColumnSpec, &'a ComponentSpec, &'a ParamSpec)],
) -> Vec<(String, &'a ColumnSpec, &'a ComponentSpec)> {
    let mut used: Vec<String> = Vec::new();
    params
        .iter()
        .map(|(col, comp, _)| {
            let base = camel_case(&col.name);
            let mut name = base.clone();
            let mut n = 2;
            while used.contains(&name) {
                name = format!("{}{}", base, n);
                n += 1;
            }
            used.push(name.clone());
            (name, *col, *comp)
        })
        .collect()
}

/// Nomes únicos para uma atualização: a mesma coluna pode aparecer nos campos a
/// alterar e no filtro, e cada lado precisa de um nome diferente.
fn unique_update_vars<'a>(
    s: &[(&'a ColumnSpec, &'a ComponentSpec, &'a ParamSpec)],
    w: &[(&'a ColumnSpec, &'a ComponentSpec, &'a ParamSpec)],
) -> (
    Vec<(String, &'a ColumnSpec, &'a ComponentSpec)>,
    Vec<(String, &'a ColumnSpec, &'a ComponentSpec)>,
) {
    let mut used: Vec<String> = Vec::new();
    let take = |base: String, used: &mut Vec<String>| -> String {
        let mut name = base.clone();
        let mut n = 2;
        while used.contains(&name) {
            name = format!("{}{}", base, n);
            n += 1;
        }
        used.push(name.clone());
        name
    };
    let svars = s
        .iter()
        .map(|(col, comp, _)| (take(camel_case(&col.name), &mut used), *col, *comp))
        .collect();
    let wvars = w
        .iter()
        .map(|(col, comp, _)| (take(camel_case(&col.name), &mut used), *col, *comp))
        .collect();
    (svars, wvars)
}

fn setter_call(col: &ColumnSpec, idx: usize, expr: &str, like: bool) -> String {
    let value = match (col.col_type.clone(), like) {
        (SqlType::Text, true) | (SqlType::Blob, true) => {
            format!(r#""%" + {} + "%""#, expr)
        }
        _ => expr.to_string(),
    };
    match col.col_type {
        SqlType::Real => format!(
            "ps.setDouble({}, Double.parseDouble({}.replace(\",\", \".\")));",
            idx, value
        ),
        SqlType::Integer => format!(
            "ps.setInt({}, Integer.parseInt({}.replace(\",\", \".\")));",
            idx, value
        ),
        _ => format!("ps.setString({}, {});", idx, value),
    }
}

fn where_clause(params: &[(&ColumnSpec, &ComponentSpec, &ParamSpec)]) -> String {
    params
        .iter()
        .map(|(_, _, p)| format!("{} {} ?", p.column, p.operator.as_sql()))
        .collect::<Vec<_>>()
        .join(" AND ")
}

/// Escapa aspas duplas para embed em literal de string Java.
fn java_quotes(s: &str) -> String {
    s.replace('\u{22}', "\u{5c}\u{22}")
}

// ------------------------------------------------------------- Main / Schema --

fn gen_main(model: &AppModel, main_class: &str, class_names: &[String]) -> String {
    let pkg = &model.package_name;
    let mut imports = format!("import {}.db.Database;", pkg);
    for cls in class_names {
        imports.push_str(&format!("\nimport {}.ui.{};", pkg, cls));
    }
    format!(
        r#"package {pkg};

import javax.swing.SwingUtilities;
{imports}

public final class Main {{

    private Main() {{
    }}

    public static void main(String[] args) {{
        SwingUtilities.invokeLater(() -> {{
            try {{
                Database.ensureSchema();
                Database.seed();
            }} catch (RuntimeException ex) {{
                System.err.println("Falha ao preparar o banco de dados: " + ex.getMessage());
            }}
            new {cls}().setVisible(true);
        }});
    }}
}}
"#,
        pkg = pkg,
        cls = main_class,
        imports = imports
    )
}

fn ddl_column(col: &ColumnSpec) -> String {
    let sql_type = match col.col_type {
        SqlType::Integer => "INTEGER",
        SqlType::Text => "TEXT",
        SqlType::Real => "REAL",
        SqlType::Blob => "BLOB",
    };
    let mut out = format!(r#""{}" {}"#, col.name, sql_type);
    if col.pk {
        out = format!("{} PRIMARY KEY", out);
        if col.auto_increment && col.col_type == SqlType::Integer {
            out = format!("{} AUTOINCREMENT", out);
        }
    }
    if col.not_null {
        out = format!("{} NOT NULL", out);
    }
    if !col.refs_table.trim().is_empty() {
        let target = if col.refs_column.trim().is_empty() {
            "id".to_string()
        } else {
            col.refs_column.clone()
        };
        out = format!(r#"{} REFERENCES "{}" ("{}")"#, out, col.refs_table, target);
    }
    out
}

fn gen_schema(model: &AppModel) -> String {
    let mut ddl: Vec<String> = Vec::new();
    let mut seed: Vec<String> = Vec::new();

    for table in &model.database.tables {
        if table.columns.is_empty() {
            continue;
        }
        let cols = table
            .columns
            .iter()
            .map(ddl_column)
            .collect::<Vec<_>>()
            .join(", ");
        ddl.push(format!(
            r#"CREATE TABLE IF NOT EXISTS "{}" ({})"#,
            table.name, cols
        ));
        if !table.seed_rows.is_empty() {
            let key_col = table
                .columns
                .iter()
                .find(|c| c.not_null && !c.pk)
                .or_else(|| table.columns.first())
                .map(|c| c.name.clone())
                .unwrap_or_default();
            for row in &table.seed_rows {
                let names: Vec<String> = row.keys().cloned().collect();
                if names.is_empty() {
                    continue;
                }
                let collist = names
                    .iter()
                    .map(|n| format!(r#""{}""#, n))
                    .collect::<Vec<_>>()
                    .join(", ");
                let values = names
                    .iter()
                    .map(|k| sql_string_literal(row.get(k).map(|s| s.as_str()).unwrap_or("")))
                    .collect::<Vec<_>>()
                    .join(", ");
                let has_key = !key_col.is_empty() && row.contains_key(&key_col);
                seed.push(if has_key {
                    format!(
                        r#"INSERT INTO "{}"({}) SELECT {} WHERE NOT EXISTS(SELECT 1 FROM "{}" WHERE "{}" = {})"#,
                        table.name,
                        collist,
                        values,
                        table.name,
                        key_col,
                        sql_string_literal(row.get(&key_col).map(|s| s.as_str()).unwrap_or(""))
                    )
                } else {
                    format!(
                        r#"INSERT INTO "{}"({}) VALUES({})"#,
                        table.name, collist, values
                    )
                });
            }
        }
    }

    let ddl_body = if ddl.is_empty() {
        "        // Nenhuma tabela definida ainda. Crie tabelas na aba Dados.".to_string()
    } else {
        ddl.iter()
            .map(|d| format!("        \"{}\",", java_string_literal(d)))
            .collect::<Vec<_>>()
            .join("\n")
    };
    let seed_body = if seed.is_empty() {
        "        // Nenhum dado inicial definido.".to_string()
    } else {
        seed.iter()
            .map(|d| format!("        \"{}\",", java_string_literal(d)))
            .collect::<Vec<_>>()
            .join("\n")
    };

    format!(
        r#"package {pkg}.db;

public final class Schema {{

    private Schema() {{
    }}

    public static final String[] DDL = new String[] {{
{ddl}
    }};

    public static final String[] SEED = new String[] {{
{seed}
    }};
}}
"#,
        pkg = model.package_name,
        ddl = ddl_body,
        seed = seed_body
    )
}

// ------------------------------------------------------------------ Database --

/// Janela dona de uma conexão: o componente pode ser um item de menu.
fn window_of_conn<'a>(model: &'a AppModel, conn: &ConnectionSpec) -> Option<&'a WindowSpec> {
    model.windows.iter().find(|w| {
        w.components.iter().any(|c| c.id == conn.component_id)
            || w.menu
                .iter()
                .flat_map(|m| m.items.iter())
                .any(|i| i.id == conn.component_id)
    })
}

fn plan_database(model: &AppModel, warnings: &mut Vec<String>) -> Vec<DbMethod> {
    let mut methods: Vec<DbMethod> = Vec::new();
    let mut used: Vec<String> = Vec::new();

    for conn in &model.connections {
        let Some(window) = window_of_conn(model, conn) else {
            continue;
        };
        let code: Option<(String, String)> = match conn.kind {
            ConnectionKind::Authenticate => {
                let Some(table) = table_of(model, &conn.table) else {
                    warnings.push(format!("Conexão {} usa uma tabela inexistente.", conn.name));
                    continue;
                };
                let w = valid_params(model, window, &conn.table, &conn.params, ParamRole::Where, warnings);
                if w.is_empty() {
                    warnings.push(format!(
                        "Conexão {} (login) sem parâmetros de usuário e senha.",
                        conn.name
                    ));
                    continue;
                }
                let vars = unique_vars(&w);
                let binds = vars
                    .iter()
                    .enumerate()
                    .map(|(i, (v, col, _))| {
                        setter_call(col, i + 1, v, w[i].2.operator == QueryOperator::Like)
                    })
                    .collect::<Vec<_>>()
                    .join("\n            ");
                let name = unique(&mut used, format!("validarLoginEm{}", pascal_case(&table.name)));
                let sql = java_quotes(&format!(
                    r#"SELECT 1 FROM "{}" WHERE {} LIMIT 1"#,
                    table.name,
                    where_clause(&w)
                ));
                Some((
                    name.clone(),
                    format!(
                        r#"    public static boolean {name}({args}) throws SQLException {{
        String sql = "{sql}";
        try (Connection c = connect(); PreparedStatement ps = c.prepareStatement(sql)) {{
            {binds}
            try (ResultSet rs = ps.executeQuery()) {{
                return rs.next();
            }}
        }}
    }}"#,
                        name = name,
                        args = vars
                            .iter()
                            .map(|(v, _, _)| format!("String {}", v))
                            .collect::<Vec<_>>()
                            .join(", "),
                        sql = sql,
                        binds = binds
                    ),
                ))
            }
            ConnectionKind::Insert => {
                let Some(table) = table_of(model, &conn.table) else { continue };
                let s = valid_params(model, window, &conn.table, &conn.params, ParamRole::Set, warnings);
                if s.is_empty() {
                    continue;
                }
                let vars = unique_vars(&s);
                let binds = vars
                    .iter()
                    .enumerate()
                    .map(|(i, (v, col, _))| setter_call(col, i + 1, v, false))
                    .collect::<Vec<_>>()
                    .join("\n            ");
                let name = unique(&mut used, format!("inserir{}", pascal_case(&singularize(&table.name))));
                let names = s
                    .iter()
                    .map(|(col, _, _)| format!(r#""{}""#, col.name))
                    .collect::<Vec<_>>()
                    .join(", ");
                let sql = java_quotes(&format!(
                    r#"INSERT INTO "{}"({}) VALUES({})"#,
                    table.name,
                    names,
                    vec!["?"; s.len()].join(", ")
                ));
                Some((
                    name.clone(),
                    format!(
                        r#"    public static int {name}({args}) throws SQLException {{
        try (Connection c = connect(); PreparedStatement ps = c.prepareStatement("{sql}", Statement.RETURN_GENERATED_KEYS)) {{
            {binds}
            ps.executeUpdate();
            try (ResultSet k = ps.getGeneratedKeys()) {{
                return k.next() ? k.getInt(1) : 0;
            }}
        }}
    }}"#,
                        name = name,
                        args = vars
                            .iter()
                            .map(|(v, _, _)| format!("String {}", v))
                            .collect::<Vec<_>>()
                            .join(", "),
                        sql = sql,
                        binds = binds
                    ),
                ))
            }
            ConnectionKind::Update => {
                let Some(table) = table_of(model, &conn.table) else { continue };
                let s = valid_params(model, window, &conn.table, &conn.params, ParamRole::Set, warnings);
                let w = valid_params(model, window, &conn.table, &conn.params, ParamRole::Where, warnings);
                if s.is_empty() || w.is_empty() {
                    continue;
                }
                let (svars, wvars) = unique_update_vars(&s, &w);
                let mut idx = 0usize;
                let mut binds: Vec<String> = Vec::new();
                for (v, col, _) in &svars {
                    idx += 1;
                    binds.push(setter_call(col, idx, v, false));
                }
                for (i, (v, col, _)) in wvars.iter().enumerate() {
                    idx += 1;
                    binds.push(setter_call(col, idx, v, w[i].2.operator == QueryOperator::Like));
                }
                let all_vars = svars.iter().chain(wvars.iter()).collect::<Vec<_>>();
                let por = w
                    .iter()
                    .map(|(col, _, _)| pascal_case(&col.name))
                    .collect::<Vec<_>>()
                    .join("E");
                let name = unique(
                    &mut used,
                    format!("atualizar{}Por{}", pascal_case(&singularize(&table.name)), por),
                );
                let set_sql = s
                    .iter()
                    .map(|(col, _, _)| format!(r#"{} = ?"#, col.name))
                    .collect::<Vec<_>>()
                    .join(", ");
                let sql = java_quotes(&format!(
                    r#"UPDATE "{}" SET {} WHERE {}"#,
                    table.name,
                    set_sql,
                    where_clause(&w)
                ));
                Some((
                    name.clone(),
                    format!(
                        r#"    public static int {name}({args}) throws SQLException {{
        try (Connection c = connect(); PreparedStatement ps = c.prepareStatement("{sql}")) {{
            {binds}
            return ps.executeUpdate();
        }}
    }}"#,
                        name = name,
                        args = all_vars
                            .iter()
                            .map(|(v, _, _)| format!("String {}", v))
                            .collect::<Vec<_>>()
                            .join(", "),
                        sql = sql,
                        binds = binds.join("\n            ")
                    ),
                ))
            }
            ConnectionKind::Delete => {
                let Some(table) = table_of(model, &conn.table) else { continue };
                let w = valid_params(model, window, &conn.table, &conn.params, ParamRole::Where, warnings);
                if w.is_empty() {
                    continue;
                }
                let vars = unique_vars(&w);
                let binds = vars
                    .iter()
                    .enumerate()
                    .map(|(i, (v, col, _))| {
                        setter_call(col, i + 1, v, w[i].2.operator == QueryOperator::Like)
                    })
                    .collect::<Vec<_>>()
                    .join("\n            ");
                let por = w
                    .iter()
                    .map(|(col, _, _)| pascal_case(&col.name))
                    .collect::<Vec<_>>()
                    .join("E");
                let name = unique(
                    &mut used,
                    format!("excluir{}Por{}", pascal_case(&singularize(&table.name)), por),
                );
                let sql = java_quotes(&format!(
                    r#"DELETE FROM "{}" WHERE {}"#,
                    table.name,
                    where_clause(&w)
                ));
                Some((
                    name.clone(),
                    format!(
                        r#"    public static int {name}({args}) throws SQLException {{
        try (Connection c = connect(); PreparedStatement ps = c.prepareStatement("{sql}")) {{
            {binds}
            return ps.executeUpdate();
        }}
    }}"#,
                        name = name,
                        args = vars
                            .iter()
                            .map(|(v, _, _)| format!("String {}", v))
                            .collect::<Vec<_>>()
                            .join(", "),
                        sql = sql,
                        binds = binds
                    ),
                ))
            }
            ConnectionKind::Query => {
                let Some(table) = table_of(model, &conn.table) else { continue };
                let w = valid_params(model, window, &conn.table, &conn.params, ParamRole::Where, warnings);
                let target = model
                    .windows
                    .iter()
                    .flat_map(|win| win.components.iter())
                    .find(|c| c.id == conn.target_table_component_id);
                let base = if conn.target_table_component_id.is_empty() {
                    format!("preencher{}", pascal_case(&table.name))
                } else {
                    format!("preencher{}", pascal_case(&conn.target_table_component_id))
                };
                let name = unique(&mut used, base);
                let columns: Vec<String> = if conn.query_columns.is_empty() {
                    table.columns.iter().map(|c| c.name.clone()).collect()
                } else {
                    conn.query_columns.iter().map(|q| q.column.clone()).collect()
                };
                let headers: Vec<String> = if conn.query_columns.is_empty() {
                    table.columns.iter().map(|c| pascal_case(&c.name)).collect()
                } else {
                    conn.query_columns
                        .iter()
                        .map(|q| {
                            if q.header.trim().is_empty() {
                                pascal_case(&q.column)
                            } else {
                                q.header.clone()
                            }
                        })
                        .collect()
                };
                if columns.is_empty() {
                    continue;
                }
                let vars = unique_vars(&w);
                let filter_args = vars
                    .iter()
                    .map(|(v, _, _)| format!("String {}", v))
                    .collect::<Vec<_>>()
                    .join(", ");
                let binds = vars
                    .iter()
                    .enumerate()
                    .map(|(i, (v, col, _))| {
                        setter_call(col, i + 1, v, w[i].2.operator == QueryOperator::Like)
                    })
                    .collect::<Vec<_>>()
                    .join("\n                ");
                let select_sql = columns
                    .iter()
                    .map(|c| format!(r#""{}""#, c))
                    .collect::<Vec<_>>()
                    .join(", ");
                let headers_arr = headers
                    .iter()
                    .map(|h| format!(r#""{}""#, java_string_literal(h)))
                    .collect::<Vec<_>>()
                    .join(", ");
                let n = columns.len();
                let sql = java_quotes(&if w.is_empty() {
                    format!(r#"SELECT {} FROM "{}""#, select_sql, table.name)
                } else {
                    format!(
                        r#"SELECT {} FROM "{}" WHERE {}"#,
                        select_sql,
                        table.name,
                        where_clause(&w)
                    )
                });
                let extra = if filter_args.is_empty() {
                    String::new()
                } else {
                    format!(", {}", filter_args)
                };
                let bind_lines = if binds.is_empty() {
                    String::new()
                } else {
                    format!("{}\n", binds)
                };
                let code = match target {
                    Some(t) if t.comp_type == ComponentType::JTable => format!(
                        r#"    public static void {name}(JTable tabela{extra}) throws SQLException {{
        String sql = "{sql}";
        try (Connection c = connect(); PreparedStatement ps = c.prepareStatement(sql)) {{
{binds}            try (ResultSet rs = ps.executeQuery()) {{
                DefaultTableModel modelo = new DefaultTableModel(new String[] {{ {headers} }}, 0) {{
                    @Override
                    public boolean isCellEditable(int row, int column) {{
                        return false;
                    }}
                }};
                while (rs.next()) {{
                    Object[] linha = new Object[{n}];
                    for (int i = 0; i < {n}; i++) {{
                        linha[i] = rs.getObject(i + 1);
                    }}
                    modelo.addRow(linha);
                }}
                tabela.setModel(modelo);
            }}
        }}
    }}"#,
                        name = name,
                        extra = extra,
                        sql = sql,
                        binds = bind_lines,
                        headers = headers_arr,
                        n = n
                    ),
                    Some(t) => {
                        let v = java_ident(&t.id, "campo");
                        format!(
                            r#"    public static void {name}(String valor{extra}) throws SQLException {{
        String sql = "{sql}";
        try (Connection c = connect(); PreparedStatement ps = c.prepareStatement(sql)) {{
{binds}            try (ResultSet rs = ps.executeQuery()) {{
                Object v = rs.getObject(1);
                {v}.setText(v == null ? "" : v.toString());
            }}
        }}
    }}"#,
                            name = name,
                            extra = extra,
                            sql = sql,
                            binds = bind_lines,
                            v = v
                        )
                    }
                    None => {
                        warnings.push(format!(
                            "Conexão {} (consulta) sem componente de destino; não gerada.",
                            conn.name
                        ));
                        continue;
                    }
                };
                Some((name, code))
            }
            _ => None,
        };
        if let Some((name, code)) = code {
            methods.push(DbMethod {
                conn_id: conn.id.clone(),
                name,
                code,
            });
        }
    }
    methods
}

fn unique(used: &mut Vec<String>, base: String) -> String {
    let mut name = base.clone();
    let mut n = 2;
    while used.contains(&name) {
        name = format!("{}{}", base, n);
        n += 1;
    }
    used.push(name.clone());
    name
}

fn gen_database(model: &AppModel, plan: &[DbMethod]) -> String {
    let methods_code = if plan.is_empty() {
        "    // Nenhuma conexão com banco definida ainda. Crie conexões na aba Conexões.".to_string()
    } else {
        plan.iter()
            .map(|m| m.code.clone())
            .collect::<Vec<_>>()
            .join("\n\n")
    };

    let needs_table_model = plan.iter().any(|m| m.code.contains("DefaultTableModel"));
    let mut imports = String::from(
        "import java.sql.Connection;\nimport java.sql.DriverManager;\nimport java.sql.PreparedStatement;\nimport java.sql.ResultSet;\nimport java.sql.SQLException;\nimport java.sql.Statement;",
    );
    if needs_table_model {
        imports.push_str("\nimport javax.swing.JTable;\nimport javax.swing.table.DefaultTableModel;");
    }

    format!(
        r#"package {pkg}.db;

{imports}

public final class Database {{

    public static final String URL = "jdbc:sqlite:{db}";

    static {{
        try {{
            // garante que a pasta do banco exista (ex.: data/)
            java.nio.file.Path pasta = java.nio.file.Paths.get(URL.replace("jdbc:sqlite:", "")).getParent();
            if (pasta != null) {{
                java.nio.file.Files.createDirectories(pasta);
            }}
        }} catch (java.io.IOException ex) {{
            throw new ExceptionInInitializerError(ex);
        }}
        try {{
            Class.forName("org.sqlite.JDBC");
        }} catch (ClassNotFoundException ex) {{
            throw new ExceptionInInitializerError(ex);
        }}
    }}

    private Database() {{
    }}

    public static Connection connect() throws SQLException {{
        return DriverManager.getConnection(URL);
    }}

    public static void ensureSchema() {{
        try (Connection c = connect(); Statement st = c.createStatement()) {{
            for (String ddl : Schema.DDL) {{
                st.executeUpdate(ddl);
            }}
        }} catch (SQLException ex) {{
            throw new RuntimeException("Falha ao preparar o banco de dados: " + ex.getMessage(), ex);
        }}
    }}

    public static void seed() {{
        try (Connection c = connect(); Statement st = c.createStatement()) {{
            st.executeUpdate("CREATE TABLE IF NOT EXISTS javaforge_seed(aplicado INTEGER)");
            try (ResultSet rs = st.executeQuery("SELECT aplicado FROM javaforge_seed LIMIT 1")) {{
                if (rs.next()) {{
                    return;
                }}
            }}
            for (String sql : Schema.SEED) {{
                st.executeUpdate(sql);
            }}
            st.executeUpdate("INSERT INTO javaforge_seed(aplicado) VALUES(1)");
        }} catch (SQLException ex) {{
            throw new RuntimeException("Falha ao gravar dados iniciais: " + ex.getMessage(), ex);
        }}
    }}

{methods}
}}
"#,
        pkg = model.package_name,
        imports = imports,
        db = model.database.file,
        methods = methods_code
    )
}

// -------------------------------------------------------------------- Janela --

struct CatalogMeta {
    java_type: &'static str,
    import: &'static str,
}

fn catalog_entry(comp: &ComponentSpec) -> CatalogMeta {
    match comp.comp_type {
        ComponentType::JLabel => CatalogMeta { java_type: "JLabel", import: "javax.swing.JLabel" },
        ComponentType::JButton => CatalogMeta { java_type: "JButton", import: "javax.swing.JButton" },
        ComponentType::JTextField => CatalogMeta { java_type: "JTextField", import: "javax.swing.JTextField" },
        ComponentType::JPasswordField => CatalogMeta { java_type: "JPasswordField", import: "javax.swing.JPasswordField" },
        ComponentType::JTextArea => CatalogMeta { java_type: "JTextArea", import: "javax.swing.JTextArea" },
        ComponentType::JCheckBox => CatalogMeta { java_type: "JCheckBox", import: "javax.swing.JCheckBox" },
        ComponentType::JRadioButton => CatalogMeta { java_type: "JRadioButton", import: "javax.swing.JRadioButton" },
        ComponentType::JComboBox => CatalogMeta { java_type: "JComboBox", import: "javax.swing.JComboBox" },
        ComponentType::JList => CatalogMeta { java_type: "JList", import: "javax.swing.JList" },
        ComponentType::JTable => CatalogMeta { java_type: "JTable", import: "javax.swing.JTable" },
        ComponentType::JPanel => CatalogMeta { java_type: "JPanel", import: "javax.swing.JPanel" },
        ComponentType::JScrollPane => CatalogMeta { java_type: "JScrollPane", import: "javax.swing.JScrollPane" },
        ComponentType::JProgressBar => CatalogMeta { java_type: "JProgressBar", import: "javax.swing.JProgressBar" },
        ComponentType::JSpinner => CatalogMeta { java_type: "JSpinner", import: "javax.swing.JSpinner" },
        ComponentType::JToggleButton => CatalogMeta { java_type: "JToggleButton", import: "javax.swing.JToggleButton" },
        ComponentType::JSeparator => CatalogMeta { java_type: "JSeparator", import: "javax.swing.JSeparator" },
        ComponentType::JSlider => CatalogMeta { java_type: "JSlider", import: "javax.swing.JSlider" },
        ComponentType::JScrollBar => CatalogMeta { java_type: "JScrollBar", import: "javax.swing.JScrollBar" },
        ComponentType::JTextPane => CatalogMeta { java_type: "JTextPane", import: "javax.swing.JTextPane" },
        ComponentType::JEditorPane => CatalogMeta { java_type: "JEditorPane", import: "javax.swing.JEditorPane" },
        ComponentType::JToolBar => CatalogMeta { java_type: "JToolBar", import: "javax.swing.JToolBar" },
        ComponentType::JTree => CatalogMeta { java_type: "JTree", import: "javax.swing.JTree" },
    }
}

fn scroll_owner(comp: &ComponentSpec) -> Option<String> {
    match comp.comp_type {
        ComponentType::JTextArea | ComponentType::JList | ComponentType::JTable
        | ComponentType::JTextPane | ComponentType::JEditorPane | ComponentType::JTree => {
            Some(format!("scroll{}", pascal_case(&comp.id)))
        }
        _ => None,
    }
}

fn order_by_parent(window: &WindowSpec) -> Vec<ComponentSpec> {
    fn depth(c: &ComponentSpec, comps: &[ComponentSpec]) -> usize {
        match &c.parent_id {
            Some(pid) if !pid.is_empty() => comps
                .iter()
                .find(|p| p.id == *pid)
                .map(|p| depth(p, comps) + 1)
                .unwrap_or(0),
            _ => 0,
        }
    }
    let mut comps = window.components.clone();
    comps.sort_by_key(|c| depth(c, &window.components));
    comps
}

fn parent_offset(window: &WindowSpec, comp: &ComponentSpec) -> (f64, f64) {
    match &comp.parent_id {
        Some(pid) if !pid.is_empty() => window
            .components
            .iter()
            .find(|p| p.id == *pid)
            .map(|parent| (comp.x - parent.x, comp.y - parent.y))
            .unwrap_or((comp.x, comp.y)),
        _ => (comp.x, comp.y),
    }
}

fn gen_window(
    model: &AppModel,
    window: &WindowSpec,
    class_names: &[String],
    plan: &[DbMethod],
    warnings: &mut Vec<String>,
) -> String {
    let mut imports: Vec<String> = vec!["javax.swing.JFrame".to_string()];
    let ordered = order_by_parent(window);
    let mut field_lines: Vec<String> = Vec::new();
    let mut init_blocks: Vec<String> = Vec::new();
    let mut group_lines: Vec<String> = Vec::new();

    for comp in &ordered {
        let meta = catalog_entry(comp);
        push_import(&mut imports, meta.import);
        let var = java_ident(&comp.id, "campo");
        field_lines.push(format!("    private {} {};", meta.java_type, var));

        let owner = scroll_owner(comp).unwrap_or_else(|| var.clone());
        let (rel_x, rel_y) = parent_offset(window, comp);
        let add_target = match &comp.parent_id {
            Some(pid) if !pid.is_empty() => format!("{}.add", java_ident(pid.as_str(), "painel")),
            _ => "add".to_string(),
        };

        let mut lines: Vec<String> = Vec::new();
        match comp.comp_type {
            ComponentType::JLabel | ComponentType::JButton => {
                lines.push(format!(
                    r#"{} = new {}("{}");"#,
                    var,
                    meta.java_type,
                    java_string_literal(&comp.prop_str("text", ""))
                ));
            }
            ComponentType::JTextField | ComponentType::JPasswordField => {
                lines.push(format!("{} = new {}();", var, meta.java_type));
                let cols = comp.prop_num("columns", 20.0) as i64;
                lines.push(format!("{}.setColumns({});", var, cols));
            }
            ComponentType::JTextArea => {
                lines.push(format!("{} = new JTextArea();", var));
                let rows = comp.prop_num("rows", 6.0) as i64;
                lines.push(format!("{}.setRows({});", var, rows));
                lines.push(format!("JScrollPane {} = new JScrollPane({});", owner, var));
                push_import(&mut imports, "javax.swing.JScrollPane");
            }
            ComponentType::JCheckBox | ComponentType::JRadioButton => {
                lines.push(format!(
                    r#"{} = new {}("{}", {});"#,
                    var,
                    meta.java_type,
                    java_string_literal(&comp.prop_str("text", "")),
                    comp.prop_bool("selected", false)
                ));
                if comp.comp_type == ComponentType::JRadioButton {
                    let group = comp.prop_str("group", "");
                    if !group.trim().is_empty() {
                        let gname = format!("grupo{}", pascal_case(&group));
                        if !group_lines.iter().any(|l: &String| l.contains(&gname)) {
                            group_lines.push(format!("        ButtonGroup {} = new ButtonGroup();", gname));
                            push_import(&mut imports, "javax.swing.ButtonGroup");
                        }
                        group_lines.push(format!("        {}.add({});", gname, var));
                    }
                }
            }
            ComponentType::JComboBox | ComponentType::JList => {
                let items = csv_items(&comp.prop_str("items", ""));
                let arr = items
                    .iter()
                    .map(|i| format!(r#""{}""#, java_string_literal(i)))
                    .collect::<Vec<_>>()
                    .join(", ");
                lines.push(format!(
                    "{} = new {}(new String[] {{ {} }});",
                    var, meta.java_type, arr
                ));
                if comp.comp_type == ComponentType::JList {
                    lines.push(format!("JScrollPane {} = new JScrollPane({});", owner, var));
                    push_import(&mut imports, "javax.swing.JScrollPane");
                }
            }
            ComponentType::JTable => {
                lines.push(format!("{} = new JTable();", var));
                lines.push(format!(
                    "{}.setModel(new DefaultTableModel(new Object[][] {{}}, new String[] {{}}));",
                    var
                ));
                lines.push(format!("JScrollPane {} = new JScrollPane({});", owner, var));
                push_import(&mut imports, "javax.swing.JScrollPane");
                push_import(&mut imports, "javax.swing.table.DefaultTableModel");
            }
            ComponentType::JPanel => {
                lines.push(format!("{} = new JPanel(null);", var));
                let title = comp.prop_str("title", "");
                if !title.trim().is_empty() {
                    lines.push(format!(
                        r#"{}.setBorder(BorderFactory.createTitledBorder("{}"));"#,
                        var,
                        java_string_literal(&title)
                    ));
                    push_import(&mut imports, "javax.swing.BorderFactory");
                }
            }
            ComponentType::JScrollPane => {
                lines.push(format!("{} = new JScrollPane();", var));
            }
            ComponentType::JToggleButton => {
                lines.push(format!(
                    r#"{} = new JToggleButton("{}", {});"#,
                    var,
                    java_string_literal(&comp.prop_str("text", "")),
                    comp.prop_bool("selected", false)
                ));
            }
            ComponentType::JSeparator => {
                lines.push(format!("{} = new JSeparator();", var));
                if comp.prop_str("orientation", "horizontal").eq_ignore_ascii_case("vertical") {
                    lines.push(format!(
                        "{}.setOrientation(javax.swing.SwingConstants.VERTICAL);",
                        var
                    ));
                }
            }
            ComponentType::JSlider => {
                lines.push(format!(
                    "{} = new JSlider({}, {}, {});",
                    var,
                    comp.prop_num("min", 0.0) as i64,
                    comp.prop_num("max", 100.0) as i64,
                    comp.prop_num("value", 50.0) as i64
                ));
            }
            ComponentType::JScrollBar => {
                lines.push(format!(
                    "{} = new javax.swing.JScrollBar(javax.swing.JScrollBar.HORIZONTAL, {}, 10, {}, {});",
                    var,
                    comp.prop_num("value", 0.0) as i64,
                    comp.prop_num("min", 0.0) as i64,
                    comp.prop_num("max", 100.0) as i64
                ));
            }
            ComponentType::JTextPane | ComponentType::JEditorPane => {
                lines.push(format!("{} = new {}();", var, meta.java_type));
                let text = comp.prop_str("text", "");
                if !text.trim().is_empty() {
                    lines.push(format!("{}.setText(\"{}\");", var, java_string_literal(&text)));
                }
                lines.push(format!("JScrollPane {} = new JScrollPane({});", owner, var));
                push_import(&mut imports, "javax.swing.JScrollPane");
            }
            ComponentType::JToolBar => {
                lines.push(format!("{} = new JToolBar();", var));
                lines.push(format!("{}.setFloatable(false);", var));
            }
            ComponentType::JTree => {
                lines.push(format!(
                    "{} = new JTree();",
                    var
                ));
                lines.push(format!(
                    "javax.swing.tree.DefaultMutableTreeNode raiz{} = new javax.swing.tree.DefaultMutableTreeNode(\"{}\");",
                    pascal_case(&comp.id),
                    java_string_literal(&comp.prop_str("root", "Raiz"))
                ));
                lines.push(format!(
                    "raiz{}.add(new javax.swing.tree.DefaultMutableTreeNode(\"Item 1\"));",
                    pascal_case(&comp.id)
                ));
                lines.push(format!(
                    "raiz{}.add(new javax.swing.tree.DefaultMutableTreeNode(\"Item 2\"));",
                    pascal_case(&comp.id)
                ));
                lines.push(format!(
                    "{}.setModel(new javax.swing.tree.DefaultTreeModel(raiz{}));",
                    var,
                    pascal_case(&comp.id)
                ));
                lines.push(format!("JScrollPane {} = new JScrollPane({});", owner, var));
                push_import(&mut imports, "javax.swing.JScrollPane");
            }
            ComponentType::JProgressBar => {
                lines.push(format!(
                    "{} = new JProgressBar({}, {});",
                    var,
                    comp.prop_num("min", 0.0) as i64,
                    comp.prop_num("max", 100.0) as i64
                ));
                lines.push(format!("{}.setValue({});", var, format_num(comp.prop_num("value", 0.0))));
            }
            ComponentType::JSpinner => {
                lines.push(format!("{} = new JSpinner();", var));
                lines.push(format!("{}.setValue({});", var, format_num(comp.prop_num("value", 1.0))));
            }
        }

        let tooltip = comp.prop_str("toolTipText", "");
        if !tooltip.trim().is_empty() {
            lines.push(format!(
                r#"{}.setToolTipText("{}");"#,
                var,
                java_string_literal(&tooltip)
            ));
        }
        if !comp.prop_bool("enabled", true) {
            lines.push(format!("{}.setEnabled(false);", var));
        }
        lines.push(format!(
            "{}.setBounds({}, {}, {}, {});",
            owner,
            num(rel_x),
            num(rel_y),
            num(comp.width),
            num(comp.height)
        ));
        lines.push(format!("{}({});", add_target, owner));

        init_blocks.push(
            lines
                .iter()
                .map(|l| format!("        {}", l))
                .collect::<Vec<_>>()
                .join("\n"),
        );
    }

    let conns: Vec<&ConnectionSpec> = model
        .connections
        .iter()
        .filter(|c| {
            window.components.iter().any(|w| w.id == c.component_id)
                || window
                    .menu
                    .iter()
                    .flat_map(|m| m.items.iter())
                    .any(|i| i.id == c.component_id)
        })
        .collect();

    let needs_sql = conns.iter().any(|c| {
        matches!(
            c.kind,
            ConnectionKind::Authenticate
                | ConnectionKind::Insert
                | ConnectionKind::Update
                | ConnectionKind::Delete
                | ConnectionKind::Query
        )
    });
    if !conns.is_empty() {
        push_import(&mut imports, "javax.swing.JOptionPane");
        // as telas vivem em <pacote>.ui; o acesso ao banco em <pacote>.db
        push_import(&mut imports, &format!("{}.db.Database", model.package_name));
    }
    // as telas vivem em <pacote>.ui e enxergam as outras telas sem import
    if needs_sql {
        push_import(&mut imports, "java.sql.SQLException");
    }

    let mut wiring: Vec<String> = Vec::new();
    let mut methods: Vec<String> = Vec::new();
    let mut used_handlers: Vec<String> = Vec::new();

    // conexões de componentes (com ligação de listener no construtor)
    for conn in &conns {
        if window
            .menu
            .iter()
            .flat_map(|m| m.items.iter())
            .any(|i| i.id == conn.component_id)
        {
            continue;
        }
        let Some(comp) = comp_in(window, &conn.component_id) else { continue };
        let handler = unique(&mut used_handlers, format!("on{}", pascal_case(&comp.id)));
        wiring.push(format!("        {}", wiring_line(comp, &conn.event, &handler)));
        let method = gen_conn_method(model, window, conn, &handler, class_names, plan, warnings);
        if !method.trim().is_empty() {
            methods.push(method);
        }
    }

    // conexões de itens de menu (ligação feita no bloco do menu)
    let mut menu_lines: Vec<String> = Vec::new();
    if !window.menu.is_empty() {
        push_import(&mut imports, "javax.swing.JMenuBar");
        push_import(&mut imports, "javax.swing.JMenu");
        push_import(&mut imports, "javax.swing.JMenuItem");
        menu_lines.push("        JMenuBar barraMenu = new JMenuBar();".to_string());
        for menu in &window.menu {
            let mvar = java_ident(&menu.id, "menu");
            menu_lines.push(format!(
                "        JMenu {} = new JMenu(\"{}\");",
                mvar,
                java_string_literal(&menu.label)
            ));
            for item in &menu.items {
                let ivar = java_ident(&item.id, "item");
                menu_lines.push(format!(
                    "        JMenuItem {} = new JMenuItem(\"{}\");",
                    ivar,
                    java_string_literal(&item.label)
                ));
                if let Some(conn) = conns.iter().find(|c| c.component_id == item.id) {
                    let handler = unique(&mut used_handlers, format!("on{}", pascal_case(&item.id)));
                    menu_lines.push(format!(
                        "        {}.addActionListener(e -> {}());",
                        ivar, handler
                    ));
                    let method = gen_conn_method(model, window, conn, &handler, class_names, plan, warnings);
                    if !method.trim().is_empty() {
                        methods.push(method);
                    }
                }
                menu_lines.push(format!("        {}.add({});", mvar, ivar));
            }
            menu_lines.push(format!("        barraMenu.add({});", mvar));
        }
        menu_lines.push("        setJMenuBar(barraMenu);".to_string());
    }

    imports.sort();
    imports.dedup();

    let cls = class_names
        .get(
            model
                .windows
                .iter()
                .position(|w| w.id == window.id)
                .unwrap_or(0),
        )
        .cloned()
        .unwrap_or_else(|| "JanelaWindow".to_string());

    format!(
        r#"package {pkg}.ui;

{imports}

public class {cls} extends JFrame {{

{fields}

    public {cls}() {{
        setTitle("{title}");
        setSize({w}, {h});
        setMinimumSize(new java.awt.Dimension({w}, {h}));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setLayout(null);
        getContentPane().setBackground(new java.awt.Color(0xD8, 0xDB, 0xDF));

{init}
{groups}
{menu}
{wiring}
    }}

{methods}
}}
"#,
        pkg = model.package_name,
        imports = imports
            .iter()
            .map(|i| format!("import {};", i))
            .collect::<Vec<_>>()
            .join("\n"),
        cls = cls,
        title = java_string_literal(&window.title),
        w = num(window.width),
        h = num(window.height),
        fields = field_lines.join("\n"),
        init = init_blocks.join("\n\n"),
        groups = if group_lines.is_empty() {
            String::new()
        } else {
            format!("\n{}\n", group_lines.join("\n"))
        },
        menu = if menu_lines.is_empty() {
            String::new()
        } else {
            format!("\n{}\n", menu_lines.join("\n"))
        },
        wiring = if wiring.is_empty() {
            String::new()
        } else {
            format!("\n{}\n", wiring.join("\n"))
        },
        methods = methods.join("\n\n")
    )
}

fn push_import(imports: &mut Vec<String>, imp: &str) {
    let s = imp.to_string();
    if !imports.contains(&s) {
        imports.push(s);
    }
}

fn csv_items(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

fn num(v: f64) -> String {
    format_num(v)
}

fn format_num(v: f64) -> String {
    if (v - v.round()).abs() < f64::EPSILON {
        format!("{}", v.round() as i64)
    } else {
        format!("{}", v)
    }
}

fn wiring_line(comp: &ComponentSpec, event: &str, handler: &str) -> String {
    let var = java_ident(&comp.id, "campo");
    match event {
        "actionPerformed" => format!("{}.addActionListener(e -> {}());", var, handler),
        "itemStateChanged" => format!("{}.addItemListener(e -> {}());", var, handler),
        "focusLost" => format!(
            r#"{var}.addFocusListener(new java.awt.event.FocusAdapter() {{
            @Override
            public void focusLost(java.awt.event.FocusEvent e) {{
                {handler}();
            }}
        }});"#,
            var = var,
            handler = handler
        ),
        "stateChanged" => format!("{}.addChangeListener(e -> {}());", var, handler),
        _ => format!("// evento {} não suportado em {}", event, var),
    }
}

fn dialog_code(kind: &str, message: &str, title: &str) -> String {
    let msg = if message.trim().is_empty() {
        "Operação concluída.".to_string()
    } else {
        message.to_string()
    };
    let title = if title.trim().is_empty() {
        "Aviso".to_string()
    } else {
        title.to_string()
    };
    let level = match kind {
        "error" => "JOptionPane.ERROR_MESSAGE",
        "warning" => "JOptionPane.WARNING_MESSAGE",
        _ => "JOptionPane.INFORMATION_MESSAGE",
    };
    format!(
        "JOptionPane.showMessageDialog(this, \"{}\", \"{}\", {});",
        java_string_literal(&msg),
        java_string_literal(&title),
        level
    )
}

fn class_of(model: &AppModel, window_id: &str, class_names: &[String]) -> String {
    model
        .windows
        .iter()
        .position(|w| w.id == window_id)
        .and_then(|i| class_names.get(i))
        .cloned()
        .unwrap_or_default()
}

fn gen_conn_method(
    model: &AppModel,
    window: &WindowSpec,
    conn: &ConnectionSpec,
    handler: &str,
    class_names: &[String],
    plan: &[DbMethod],
    warnings: &mut Vec<String>,
) -> String {
    let db_name = |fallback: &str| -> String {
        plan.iter()
            .find(|m| m.conn_id == conn.id)
            .map(|m| m.name.clone())
            .unwrap_or_else(|| fallback.to_string())
    };

    let body = match conn.kind {
        ConnectionKind::Message => format!(
            "        {}",
            dialog_code(&conn.message_kind, &conn.message, &conn.message_title)
        ),
        ConnectionKind::OpenWindow => {
            let cls = class_of(model, &conn.open_window_id, class_names);
            let mut out = if cls.is_empty() {
                "        // janela de destino não encontrada".to_string()
            } else {
                format!("        new {}().setVisible(true);", cls)
            };
            if conn.close_current {
                out.push_str("\n        dispose();");
            }
            out
        }
        ConnectionKind::Custom => {
            if conn.custom_code.trim().is_empty() {
                warnings.push(format!("Conexão {} (código manual) está vazia.", conn.name));
                return String::new();
            }
            format!(
                r#"        try {{
{code}
        }} catch (Exception ex) {{
            JOptionPane.showMessageDialog(this, "Erro: " + ex.getMessage(), "Erro", JOptionPane.ERROR_MESSAGE);
        }}"#,
                code = conn
                    .custom_code
                    .lines()
                    .map(|l| format!("            {}", l))
                    .collect::<Vec<_>>()
                    .join("\n")
            )
        }
        ConnectionKind::Authenticate => {
            let w = valid_params(model, window, &conn.table, &conn.params, ParamRole::Where, &mut Vec::new());
            if w.is_empty() {
                warnings.push(format!("Conexão {} (login) sem parâmetros.", conn.name));
                return String::new();
            }
            let vars = unique_vars(&w);
            let decls = vars
                .iter()
                .map(|(v, _, comp)| format!("String {} = {};", v, read_expr(comp)))
                .collect::<Vec<_>>()
                .join("\n        ");
            let args = vars
                .iter()
                .map(|(v, _, _)| v.clone())
                .collect::<Vec<_>>()
                .join(", ");
            let mut success: Vec<String> = Vec::new();
            if !conn.message.trim().is_empty() {
                success.push(format!(
                    "                {}",
                    dialog_code(&conn.message_kind, &conn.message, &conn.message_title)
                ));
            }
            let cls = class_of(model, &conn.auth_success_window_id, class_names);
            if !cls.is_empty() {
                success.push(format!("                new {}().setVisible(true);", cls));
            }
            if conn.close_current {
                success.push("                dispose();".to_string());
            }
            if success.is_empty() {
                success.push(
                    "                JOptionPane.showMessageDialog(this, \"Autenticado.\", \"Acesso\", JOptionPane.INFORMATION_MESSAGE);".to_string(),
                );
            }
            format!(
                r#"        {decls}
        try {{
            if (Database.{db}({args})) {{
{success}
            }} else {{
                {fail}
            }}
        }} catch (SQLException ex) {{
            JOptionPane.showMessageDialog(this, "Falha ao acessar o banco: " + ex.getMessage(), "Erro", JOptionPane.ERROR_MESSAGE);
        }}"#,
                decls = decls,
                db = db_name("validarLogin"),
                args = args,
                success = success.join("\n"),
                fail = dialog_code("error", "Usuário ou senha incorretos.", "Acesso negado")
            )
        }
        ConnectionKind::Insert => {
            let s = valid_params(model, window, &conn.table, &conn.params, ParamRole::Set, &mut Vec::new());
            if s.is_empty() {
                warnings.push(format!("Conexão {} (inserir) sem campos de origem.", conn.name));
                return String::new();
            }
            let vars = unique_vars(&s);
            let decls = vars
                .iter()
                .map(|(v, _, comp)| format!("String {} = {};", v, read_expr(comp)))
                .collect::<Vec<_>>()
                .join("\n        ");
            let args = vars
                .iter()
                .map(|(v, _, _)| v.clone())
                .collect::<Vec<_>>()
                .join(", ");
            let msg = if conn.message.trim().is_empty() {
                "Registro salvo com sucesso."
            } else {
                conn.message.as_str()
            };
            format!(
                r#"        {decls}
        try {{
            Database.{db}({args});
            {dialog}
{refresh}        }} catch (NumberFormatException ex) {{
            JOptionPane.showMessageDialog(this, "Verifique os valores numéricos informados.", "Dados", JOptionPane.WARNING_MESSAGE);
        }} catch (SQLException ex) {{
            JOptionPane.showMessageDialog(this, "Erro ao salvar: " + ex.getMessage(), "Erro", JOptionPane.ERROR_MESSAGE);
        }}"#,
                decls = decls,
                db = db_name("inserir"),
                args = args,
                dialog = dialog_code("info", msg, &conn.message_title),
                refresh = refresh_calls(model, window, plan)
            )
        }
        ConnectionKind::Update => {
            let s = valid_params(model, window, &conn.table, &conn.params, ParamRole::Set, &mut Vec::new());
            let w = valid_params(model, window, &conn.table, &conn.params, ParamRole::Where, &mut Vec::new());
            if s.is_empty() || w.is_empty() {
                warnings.push(format!(
                    "Conexão {} (atualizar) precisa de campos para alterar e para localizar.",
                    conn.name
                ));
                return String::new();
            }
            let (svars, wvars) = unique_update_vars(&s, &w);
            let mut all = svars.clone();
            all.extend(wvars.clone());
            let decls = all
                .iter()
                .map(|(v, _, comp)| format!("String {} = {};", v, read_expr(comp)))
                .collect::<Vec<_>>()
                .join("\n        ");
            let args = all
                .iter()
                .map(|(v, _, _)| v.clone())
                .collect::<Vec<_>>()
                .join(", ");
            let msg = if conn.message.trim().is_empty() {
                "Registro atualizado com sucesso."
            } else {
                conn.message.as_str()
            };
            format!(
                r#"        {decls}
        try {{
            int alterados = Database.{db}({args});
            if (alterados == 0) {{
                JOptionPane.showMessageDialog(this, "Nenhum registro alterado.", "Atualizar", JOptionPane.WARNING_MESSAGE);
            }} else {{
                {dialog}
            }}
{refresh}        }} catch (NumberFormatException ex) {{
            JOptionPane.showMessageDialog(this, "Verifique os valores numéricos informados.", "Dados", JOptionPane.WARNING_MESSAGE);
        }} catch (SQLException ex) {{
            JOptionPane.showMessageDialog(this, "Erro ao atualizar: " + ex.getMessage(), "Erro", JOptionPane.ERROR_MESSAGE);
        }}"#,
                decls = decls,
                db = db_name("atualizar"),
                args = args,
                dialog = dialog_code("info", msg, &conn.message_title),
                refresh = refresh_calls(model, window, plan)
            )
        }
        ConnectionKind::Delete => {
            let w = valid_params(model, window, &conn.table, &conn.params, ParamRole::Where, &mut Vec::new());
            if w.is_empty() {
                warnings.push(format!(
                    "Conexão {} (excluir) precisa de um campo para localizar o registro.",
                    conn.name
                ));
                return String::new();
            }
            let vars = unique_vars(&w);
            let decls = vars
                .iter()
                .map(|(v, _, comp)| format!("String {} = {};", v, read_expr(comp)))
                .collect::<Vec<_>>()
                .join("\n        ");
            let args = vars
                .iter()
                .map(|(v, _, _)| v.clone())
                .collect::<Vec<_>>()
                .join(", ");
            let msg = if conn.message.trim().is_empty() {
                "Registro excluído com sucesso."
            } else {
                conn.message.as_str()
            };
            format!(
                r#"        {decls}
        try {{
            int excluidos = Database.{db}({args});
            if (excluidos == 0) {{
                JOptionPane.showMessageDialog(this, "Nenhum registro excluído.", "Excluir", JOptionPane.WARNING_MESSAGE);
            }} else {{
                {dialog}
            }}
{refresh}        }} catch (SQLException ex) {{
            JOptionPane.showMessageDialog(this, "Erro ao excluir: " + ex.getMessage(), "Erro", JOptionPane.ERROR_MESSAGE);
        }}"#,
                decls = decls,
                db = db_name("excluir"),
                args = args,
                dialog = dialog_code("info", msg, &conn.message_title),
                refresh = refresh_calls(model, window, plan)
            )
        }
        ConnectionKind::Query => {
            let Some(target) = comp_in(window, &conn.target_table_component_id) else {
                warnings.push(format!(
                    "Conexão {} (consulta) sem componente de destino nesta janela.",
                    conn.name
                ));
                return String::new();
            };
            let w = valid_params(model, window, &conn.table, &conn.params, ParamRole::Where, &mut Vec::new());
            let vars = unique_vars(&w);
            let decls = vars
                .iter()
                .map(|(v, _, comp)| format!("String {} = {};", v, read_expr(comp)))
                .collect::<Vec<_>>()
                .join("\n        ");
            let args = vars
                .iter()
                .map(|(v, _, _)| v.clone())
                .collect::<Vec<_>>()
                .join(", ");
            let call = format!(
                "Database.{}({}{})",
                db_name("preencher"),
                java_ident(&target.id, "campo"),
                if args.is_empty() {
                    String::new()
                } else {
                    format!(", {}", args)
                }
            );
            format!(
                r#"        {decls}
        try {{
            {call};
        }} catch (SQLException ex) {{
            JOptionPane.showMessageDialog(this, "Erro ao consultar: " + ex.getMessage(), "Erro", JOptionPane.ERROR_MESSAGE);
        }}"#,
                decls = decls,
                call = call
            )
        }
    };

    format!("    private void {}() {{\n{}\n    }}", handler, body)
}

/// Após inserir/atualizar/excluir, chama as consultas da mesma janela.
fn refresh_calls(model: &AppModel, window: &WindowSpec, plan: &[DbMethod]) -> String {
    let mut lines: Vec<String> = Vec::new();
    for conn in &model.connections {
        if conn.kind != ConnectionKind::Query {
            continue;
        }
        if !window.components.iter().any(|x| x.id == conn.component_id) {
            continue;
        }
        if conn.target_table_component_id.is_empty() {
            continue;
        }
        let Some(target) = comp_in(window, &conn.target_table_component_id) else {
            continue;
        };
        let Some(m) = plan.iter().find(|m| m.conn_id == conn.id) else {
            continue;
        };
        let empties = vec!["\"\""; conn.params.len()].join(", ");
        lines.push(format!(
            "            Database.{}({}{});",
            m.name,
            java_ident(&target.id, "campo"),
            if empties.is_empty() {
                String::new()
            } else {
                format!(", {}", empties)
            }
        ));
    }
    if lines.is_empty() {
        String::new()
    } else {
        format!("{}\n", lines.join("\n"))
    }
}

// ---------------------------------------------------------------- pom / README --

fn gen_pom(model: &AppModel) -> String {
    let artifact = sanitize_folder_name(&model.name)
        .to_lowercase()
        .replace(' ', "-");
    let artifact = if artifact.is_empty() { "app".to_string() } else { artifact };
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>{group}</groupId>
  <artifactId>{artifact}</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <exec.mainClass>{main}</exec.mainClass>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.xerial</groupId>
      <artifactId>sqlite-jdbc</artifactId>
      <version>3.50.3.0</version>
    </dependency>
  </dependencies>

  <build>
    <finalName>${{project.artifactId}}</finalName>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.13.0</version>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-jar-plugin</artifactId>
        <version>3.4.1</version>
        <configuration>
          <archive>
            <manifest>
              <mainClass>${{exec.mainClass}}</mainClass>
            </manifest>
          </archive>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>exec-maven-plugin</artifactId>
        <version>3.5.0</version>
        <configuration>
          <mainClass>${{exec.mainClass}}</mainClass>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
"#,
        group = model.package_name,
        artifact = artifact,
        main = format!("{}.Main", model.package_name)
    )
}

fn gen_readme(model: &AppModel) -> String {
    let artifact = sanitize_folder_name(&model.name).to_lowercase().replace(' ', "-");
    format!(
        r#"# {name}

Aplicativo gerado pelo **JavaForge** (interface Swing + banco SQLite).

## Como executar

Com Maven instalado:

```
mvn compile exec:java
```

Ou com o Maven Wrapper incluído (não precisa de Maven instalado):

```
./mvnw.cmd compile exec:java
```

Para gerar o JAR executável:

```
mvn package
java -jar target/{artifact}.jar
```

## Estrutura

- `src/main/java/.../Main.java` - ponto de entrada
- `src/main/java/.../db/Database.java` - acesso ao SQLite e métodos das conexões
- `src/main/java/.../db/Schema.java` - criação das tabelas e dados iniciais
- `src/main/java/.../ui/*Window.java` - telas (janelas Swing)
- `data/{db}` - banco de dados SQLite, criado automaticamente no primeiro uso
- `build/` - pasta de trabalho do JavaForge (driver, ferramentas e classes geradas)
- `app.model.json` - modelo visual usado pelo JavaForge (janelas, componentes e conexões)

## Editando fora do JavaForge

O código Java pode ser editado em qualquer editor (VS Code, IntelliJ, Bloco de Notas).
Ao salvar alterações no modelo visual dentro do JavaForge, o código é regenerado;
arquivos gerados que foram alterados por fora recebem uma cópia de segurança (`.bak`).
"#,
        name = model.name,
        artifact = artifact,
        db = model.database.file
    )
}

/// Mapa de classes por id de janela (auxiliar para futuras extensões).
pub fn class_map(model: &AppModel) -> std::collections::BTreeMap<String, String> {
    let mut names: Vec<String> = Vec::new();
    let mut map = std::collections::BTreeMap::new();
    for w in &model.windows {
        let mut name = java_class_name(&w.id);
        let mut n = 2;
        while names.contains(&name) {
            name = format!("{}{}", java_class_name(&w.id), n);
            n += 1;
        }
        names.push(name.clone());
        map.insert(w.id.clone(), name);
    }
    map
}
