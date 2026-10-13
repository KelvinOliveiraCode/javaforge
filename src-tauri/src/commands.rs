use crate::codegen;
use crate::model::*;
use crate::registry;
use crate::templates;
use crate::util::*;
use serde_json::json;
use std::collections::HashSet;
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn model_path(project: &Path) -> PathBuf {
    project.join("app.model.json")
}

fn read_model(project: &Path) -> Result<AppModel, String> {
    let path = model_path(project);
    let content = fs::read_to_string(&path)
        .map_err(|_| "app.model.json não encontrado. A pasta é um projeto JavaForge?".to_string())?;
    serde_json::from_str::<AppModel>(&content)
        .map_err(|e| format!("app.model.json inválido: {}", e))
}

fn write_model(project: &Path, model: &AppModel) -> Result<(), String> {
    let path = model_path(project);
    let json = serde_json::to_string_pretty(model).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| format!("Falha ao salvar o modelo: {}", e))
}

// ---------------------------------------------------------------- registro --

#[tauri::command]
pub fn registry_list() -> Vec<ProjectEntry> {
    registry::list()
}

#[tauri::command]
pub fn project_forget(path: String) {
    registry::forget(&path);
}

/// Pasta pessoal do usuário (padrão para novos projetos).
#[tauri::command]
pub fn home_dir() -> String {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| "C:\\".to_string())
}

/// Registra erros da interface em %APPDATA%/JavaForge/client.log.
#[tauri::command]
pub fn client_log(message: String) {
    let dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("JavaForge");
    let _ = fs::create_dir_all(&dir);
    let path = dir.join("client.log");
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let line = format!("[{}] {}\n", stamp, message.replace('\n', " | "));
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(&path) {
        use std::io::Write;
        let _ = f.write_all(line.as_bytes());
    }
}

#[tauri::command]
pub fn project_open(path: String) -> Result<ProjectEntry, String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err("Pasta não encontrada.".to_string());
    }
    let model = read_model(&dir)?;
    let name = if model.name.trim().is_empty() {
        dir.file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "Projeto".to_string())
    } else {
        model.name.clone()
    };
    let entry = ProjectEntry {
        id: format!("p{}", now_secs()),
        name,
        path: path.clone(),
        kind: "opened".to_string(),
        template_name: "Projeto aberto".to_string(),
        created_at: registry::now_iso(),
        last_opened_at: registry::now_iso(),
    };
    registry::add(&entry);
    Ok(entry)
}

// ---------------------------------------------------------------- projetos --

#[tauri::command]
pub fn project_create(
    kind: String,
    name: String,
    parent_dir: String,
    package_name: String,
) -> Result<ProjectEntry, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Dê um nome ao aplicativo.".to_string());
    }
    if package_name.trim().is_empty()
        || !package_name.split('.').all(|p| is_valid_java_ident(p))
    {
        return Err(format!(
            "Pacote Java inválido: \"{}\". Use apenas letras minúsculas separadas por ponto (ex.: com.exemplo.app).",
            package_name
        ));
    }
    let parent = PathBuf::from(&parent_dir);
    if !parent.is_dir() {
        return Err("Pasta de destino não encontrada.".to_string());
    }
    let folder = sanitize_folder_name(&name);
    let project_dir = parent.join(&folder);
    if project_dir.exists() {
        let empty = fs::read_dir(&project_dir)
            .map(|mut d| d.next().is_none())
            .unwrap_or(false);
        if !empty {
            return Err(format!(
                "A pasta \"{}\" já existe e não está vazia.",
                project_dir.display()
            ));
        }
    }

    let model = templates::template_model(&kind, &name, &package_name);
    fs::create_dir_all(&project_dir).map_err(|e| e.to_string())?;
    write_model(&project_dir, &model)?;

    let files = codegen::generate(&model)?;
    let mut warnings = Vec::new();
    write_generated(&project_dir, &files, &mut warnings);

    fs::create_dir_all(project_dir.join("lib")).ok();
    fs::write(
        project_dir.join("lib").join("sqlite-jdbc.jar"),
        SQLITE_JAR_BYTES,
    )
    .map_err(|e| format!("Falha ao copiar o driver SQLite: {}", e))?;

    // Cria o banco já com as tabelas e os dados iniciais.
    if let Err(e) = db_apply(&project_dir, &model, false) {
        eprintln!("aviso db_apply: {}", e);
    }

    let kind_final = if kind.is_empty() { "blank".to_string() } else { kind.clone() };
    let entry = ProjectEntry {
        id: format!("p{}", now_secs()),
        name: name.clone(),
        path: project_dir.to_string_lossy().to_string(),
        kind: kind_final.clone(),
        template_name: templates::template_name(&kind_final).to_string(),
        created_at: registry::now_iso(),
        last_opened_at: registry::now_iso(),
    };
    registry::add(&entry);
    Ok(entry)
}

fn manifest_path(project: &Path) -> PathBuf {
    project.join(".javaforge").join("manifest.json")
}

fn read_manifest(project: &Path) -> serde_json::Value {
    let path = manifest_path(project);
    match fs::read_to_string(&path) {
        Ok(c) => serde_json::from_str(&c).unwrap_or(json!({})),
        Err(_) => json!({}),
    }
}

/// Escreve os arquivos gerados, fazendo backup (.bak) do que foi alterado por fora.
fn write_generated(project: &Path, files: &[codegen::GeneratedFile], warnings: &mut Vec<String>) {
    let manifest = read_manifest(project);
    let mut new_manifest = serde_json::Map::new();

    for f in files {
        let target = project.join(f.path.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).ok();
        }
        if target.exists() {
            let current = fs::read_to_string(&target).unwrap_or_default();
            let last_hash = manifest
                .get(&f.path)
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if last_hash != hash_str(&current) && current != f.content {
                let backup = format!(
                    "{}.bak-{}",
                    target.to_string_lossy(),
                    SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0)
                );
                if fs::rename(&target, &backup).is_ok() {
                    warnings.push(format!(
                        "{} foi alterado por fora; cópia salva em {}",
                        f.path,
                        Path::new(&backup)
                            .file_name()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_default()
                    ));
                }
            }
        }
        fs::write(&target, &f.content).ok();
        new_manifest.insert(f.path.clone(), json!(hash_str(&f.content)));
    }

    let dir = project.join(".javaforge");
    fs::create_dir_all(&dir).ok();
    fs::write(manifest_path(project), json!(new_manifest).to_string()).ok();
}

#[tauri::command]
pub fn codegen_generate(project_dir: String) -> Result<CodegenResult, String> {
    let project = PathBuf::from(&project_dir);
    let model = read_model(&project)?;
    let problems = validate_model(model.clone());
    let mut warnings: Vec<String> = problems
        .iter()
        .map(|p| format!("[{}] {}", p.severity, p.message))
        .collect();
    let files = codegen::generate(&model)?;
    write_generated(&project, &files, &mut warnings);
    let names = files.into_iter().map(|f| f.path).collect();
    Ok(CodegenResult { files: names, warnings })
}

// -------------------------------------------------------------- arquivos --

const SKIP_DIRS: [&str; 5] = ["target", ".javaforge", "out", "bin", ".git"];

fn build_tree(dir: &Path) -> Vec<TreeNode> {
    let mut entries: Vec<TreeNode> = Vec::new();
    let Ok(read) = fs::read_dir(dir) else {
        return entries;
    };
    let mut items: Vec<_> = read.flatten().collect();
    items.sort_by_key(|e| e.file_name());
    for entry in items {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let Ok(ft) = entry.file_type() else { continue };
        if ft.is_dir() {
            if SKIP_DIRS.contains(&name.as_str()) {
                continue;
            }
            entries.push(TreeNode {
                name,
                path: path.to_string_lossy().to_string(),
                kind: "dir".to_string(),
                ext: None,
                children: build_tree(&path),
            });
        } else {
            let ext = path
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase());
            entries.push(TreeNode {
                name,
                path: path.to_string_lossy().to_string(),
                kind: "file".to_string(),
                ext,
                children: vec![],
            });
        }
    }
    // diretórios primeiro
    entries.sort_by_key(|n| if n.kind == "dir" { 0 } else { 1 });
    entries
}

#[tauri::command]
pub fn fs_tree(path: String) -> Result<Vec<TreeNode>, String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err("Pasta não encontrada.".to_string());
    }
    Ok(build_tree(&dir))
}

fn language_of(path: &Path) -> String {
    match path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
        .as_str()
    {
        "java" => "java".to_string(),
        "json" => "json".to_string(),
        "xml" | "pom" => "xml".to_string(),
        "md" => "markdown".to_string(),
        "sql" => "sql".to_string(),
        _ => "text".to_string(),
    }
}

#[tauri::command]
pub fn fs_read(path: String) -> Result<FileContent, String> {
    let p = PathBuf::from(&path);
    if !p.is_file() {
        return Err("Arquivo não encontrado.".to_string());
    }
    let meta = fs::metadata(&p).map_err(|e| e.to_string())?;
    if meta.len() > 4 * 1024 * 1024 {
        return Err("Arquivo maior que 4 MB não é aberto no editor.".to_string());
    }
    let bytes = fs::read(&p).map_err(|e| format!("Falha ao ler: {}", e))?;
    let content = String::from_utf8_lossy(&bytes).to_string();
    Ok(FileContent {
        path: path.clone(),
        size: meta.len(),
        language: language_of(&p),
        content,
    })
}

#[tauri::command]
pub fn fs_write(path: String, content: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let utf8: Vec<u8> = content.into_bytes();
    fs::write(&p, utf8).map_err(|e| format!("Falha ao salvar: {}", e))
}

#[tauri::command]
pub fn fs_create_file(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.exists() {
        return Err("Arquivo já existe.".to_string());
    }
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&p, b"").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_create_folder(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_delete(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        fs::remove_dir_all(&p).map_err(|e| format!("Falha ao excluir pasta: {}", e))
    } else {
        fs::remove_file(&p).map_err(|e| format!("Falha ao excluir arquivo: {}", e))
    }
}

#[tauri::command]
pub fn fs_rename(old_path: String, new_path: String) -> Result<(), String> {
    let old = PathBuf::from(&old_path);
    let new = PathBuf::from(&new_path);
    if new.exists() {
        return Err("Já existe um arquivo ou pasta com esse nome.".to_string());
    }
    if let Some(parent) = new.parent() {
        fs::create_dir_all(parent).ok();
    }
    fs::rename(&old, &new).map_err(|e| format!("Falha ao renomear: {}", e))
}

// ------------------------------------------------------------------ modelo --

#[tauri::command]
pub fn model_load(project_dir: String) -> Result<AppModel, String> {
    read_model(&PathBuf::from(&project_dir))
}

#[tauri::command]
pub fn model_save(project_dir: String, model: AppModel) -> Result<(), String> {
    write_model(&PathBuf::from(&project_dir), &model)
}

// -------------------------------------------------------------- validação --

fn param_capable(c: &ComponentSpec) -> bool {
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
    )
}

fn events_of(c: &ComponentSpec) -> &'static [&'static str] {
    match c.comp_type {
        ComponentType::JButton => &["actionPerformed"],
        ComponentType::JTextField | ComponentType::JPasswordField => {
            &["actionPerformed", "focusLost"]
        }
        ComponentType::JTextArea => &["focusLost"],
        ComponentType::JCheckBox | ComponentType::JRadioButton => {
            &["actionPerformed", "itemStateChanged"]
        }
        ComponentType::JComboBox => &["itemStateChanged", "actionPerformed"],
        _ => &[],
    }
}

fn text_targetable(c: &ComponentSpec) -> bool {
    matches!(
        c.comp_type,
        ComponentType::JTextField | ComponentType::JTextArea | ComponentType::JLabel
    )
}

#[tauri::command]
pub fn validate_model(model: AppModel) -> Vec<Problem> {
    let mut out: Vec<Problem> = Vec::new();
    let err = |m: String| Problem {
        severity: "error".into(),
        message: m,
        component_id: None,
        window_id: None,
    };

    if model.name.trim().is_empty() {
        out.push(err("Dê um nome ao aplicativo.".into()));
    }
    if model.package_name.trim().is_empty()
        || !model.package_name.split('.').all(|p| is_valid_java_ident(p))
    {
        out.push(err(format!(
            "Pacote Java inválido: \"{}\". Use letras minúsculas separadas por ponto.",
            model.package_name
        )));
    } else if !model
        .package_name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c == '.' || c.is_ascii_digit())
    {
        out.push(Problem {
            severity: "warning".into(),
            message: format!(
                "Pacote \"{}\" deveria usar apenas letras minúsculas (convenção Java).",
                model.package_name
            ),
            component_id: None,
            window_id: None,
        });
    }
    if model.windows.is_empty() {
        out.push(err("Crie pelo menos uma janela.".into()));
    } else if !model.windows.iter().any(|w| w.id == model.main_window_id) {
        out.push(err("A janela principal definida não existe.".into()));
    }

    let mut classes: HashSet<String> = HashSet::new();
    for w in &model.windows {
        let cls = java_class_name(&w.id);
        if !classes.insert(cls.clone()) {
            out.push(err(format!(
                "Duas janelas gerariam a classe Java \"{}\"; use identificadores diferentes.",
                cls
            )));
        }
        if w.title.trim().is_empty() {
            out.push(Problem {
                severity: "warning".into(),
                message: format!("A janela \"{}\" está sem título.", w.id),
                component_id: None,
                window_id: Some(w.id.clone()),
            });
        }
        let mut ids: HashSet<String> = HashSet::new();
        for c in &w.components {
            if !is_valid_java_ident(&c.id) {
                out.push(Problem {
                    severity: "error".into(),
                    message: format!(
                        "Identificador \"{}\" inválido para Java (sem espaços, acentos ou palavras reservadas).",
                        c.id
                    ),
                    component_id: Some(c.id.clone()),
                    window_id: Some(w.id.clone()),
                });
            }
            if !ids.insert(c.id.clone()) {
                out.push(Problem {
                    severity: "error".into(),
                    message: format!("Identificador duplicado na janela: \"{}\".", c.id),
                    component_id: Some(c.id.clone()),
                    window_id: Some(w.id.clone()),
                });
            }
            match &c.parent_id {
                Some(pid) if !pid.is_empty() => {
                    if pid == &c.id {
                        out.push(Problem {
                            severity: "error".into(),
                            message: format!("Componente \"{}\" não pode ser pai de si mesmo.", c.id),
                            component_id: Some(c.id.clone()),
                            window_id: Some(w.id.clone()),
                        });
                    } else if !w.components.iter().any(|x| x.id == *pid) {
                        out.push(Problem {
                            severity: "warning".into(),
                            message: format!(
                                "Contêiner pai \"{}\" não existe; o componente ficará na janela.",
                                pid
                            ),
                            component_id: Some(c.id.clone()),
                            window_id: Some(w.id.clone()),
                        });
                    }
                }
                _ => {}
            }
        }
    }

    let mut tables: HashSet<String> = HashSet::new();
    for t in &model.database.tables {
        if t.name.trim().is_empty() {
            out.push(err("Há uma tabela sem nome na aba Dados.".into()));
            continue;
        }
        if !tables.insert(t.name.clone()) {
            out.push(err(format!("Tabela duplicada: \"{}\".", t.name)));
        }
        if t.columns.is_empty() {
            out.push(err(format!("Tabela \"{}\" não tem colunas.", t.name)));
        }
        let mut colnames: HashSet<String> = HashSet::new();
        let mut pks = 0;
        for c in &t.columns {
            if c.name.trim().is_empty() {
                out.push(err(format!("Coluna sem nome na tabela \"{}\".", t.name)));
                continue;
            }
            if !colnames.insert(c.name.clone()) {
                out.push(err(format!(
                    "Coluna duplicada \"{}\" na tabela \"{}\".",
                    c.name, t.name
                )));
            }
            if c.pk {
                pks += 1;
                if c.auto_increment && c.col_type != SqlType::Integer {
                    out.push(err(format!(
                        "AUTOINCREMENT só vale para colunas INTEGER: \"{}.{}\".",
                        t.name, c.name
                    )));
                }
            }
        }
        if pks > 1 {
            out.push(Problem {
                severity: "warning".into(),
                message: format!(
                    "Tabela \"{}\" tem {} colunas como chave primária; SQLite aceita apenas uma.",
                    t.name, pks
                ),
                component_id: None,
                window_id: None,
            });
        }
        for row in &t.seed_rows {
            for k in row.keys() {
                if !colnames.contains(k) {
                    out.push(Problem {
                        severity: "warning".into(),
                        message: format!(
                            "Dado inicial usa a coluna inexistente \"{}.{}\".",
                            t.name, k
                        ),
                        component_id: None,
                        window_id: None,
                    });
                }
            }
        }
    }

    let window_of_comp = |id: &str| -> Option<&WindowSpec> {
        model
            .windows
            .iter()
            .find(|w| w.components.iter().any(|c| c.id == id))
    };
    let comp_anywhere = |id: &str| -> Option<&ComponentSpec> {
        model
            .windows
            .iter()
            .flat_map(|w| w.components.iter())
            .find(|c| c.id == id)
    };

    let mut conn_ids: HashSet<String> = HashSet::new();
    for c in &model.connections {
        if !conn_ids.insert(c.id.clone()) {
            out.push(Problem {
                severity: "warning".into(),
                message: format!("Conexão com id repetido: \"{}\".", c.id),
                component_id: None,
                window_id: None,
            });
        }
        let Some(comp) = comp_anywhere(&c.component_id) else {
            out.push(err(format!(
                "Conexão \"{}\" aponta para um componente inexistente.",
                c.name
            )));
            continue;
        };
        if !events_of(comp).contains(&c.event.as_str()) {
            out.push(Problem {
                severity: "warning".into(),
                message: format!(
                    "Evento \"{}\" não é disparado por {} ({}).",
                    c.event,
                    comp.id,
                    format!("{:?}", comp.comp_type).replace('"', "")
                ),
                component_id: Some(comp.id.clone()),
                window_id: window_of_comp(&c.component_id).map(|w| w.id.clone()),
            });
        }
        match c.kind {
            ConnectionKind::OpenWindow => {
                if !model.windows.iter().any(|w| w.id == c.open_window_id) {
                    out.push(err(format!(
                        "Conexão \"{}\" abre uma janela inexistente.",
                        c.name
                    )));
                }
            }
            ConnectionKind::Authenticate => {
                if !tables.contains(&c.table) {
                    out.push(err(format!(
                        "Conexão \"{}\" usa a tabela inexistente \"{}\".",
                        c.name, c.table
                    )));
                }
                let n = c
                    .params
                    .iter()
                    .filter(|p| p.role == ParamRole::Where)
                    .count();
                if n < 2 {
                    out.push(err(format!(
                        "Conexão \"{}\" (login) precisa de dois campos: usuário e senha.",
                        c.name
                    )));
                }
                if !c.auth_success_window_id.is_empty()
                    && !model.windows.iter().any(|w| w.id == c.auth_success_window_id)
                {
                    out.push(err(format!(
                        "Conexão \"{}\" abre uma janela inexistente no login.",
                        c.name
                    )));
                }
                if c.message.trim().is_empty() && c.auth_success_window_id.is_empty() {
                    out.push(Problem {
                        severity: "warning".into(),
                        message: format!(
                            "Conexão \"{}\" (login) não faz nada quando o acesso é válido.",
                            c.name
                        ),
                        component_id: Some(comp.id.clone()),
                        window_id: window_of_comp(&c.component_id).map(|w| w.id.clone()),
                    });
                }
            }
            ConnectionKind::Insert | ConnectionKind::Update | ConnectionKind::Delete
            | ConnectionKind::Query => {
                if !tables.contains(&c.table) {
                    out.push(err(format!(
                        "Conexão \"{}\" usa a tabela inexistente \"{}\".",
                        c.name, c.table
                    )));
                }
                let set_n = c.params.iter().filter(|p| p.role == ParamRole::Set).count();
                let where_n = c.params.iter().filter(|p| p.role == ParamRole::Where).count();
                match c.kind {
                    ConnectionKind::Insert if set_n == 0 => out.push(err(format!(
                        "Conexão \"{}\" (inserir) não tem campos para gravar.",
                        c.name
                    ))),
                    ConnectionKind::Update if set_n == 0 || where_n == 0 => out.push(err(format!(
                        "Conexão \"{}\" (atualizar) precisa de campos para alterar e para localizar.",
                        c.name
                    ))),
                    ConnectionKind::Delete if where_n == 0 => out.push(err(format!(
                        "Conexão \"{}\" (excluir) precisa de um campo para localizar o registro.",
                        c.name
                    ))),
                    _ => {}
                }
                for p in &c.params {
                    let Some(t) = model.database.tables.iter().find(|t| t.name == c.table) else {
                        continue;
                    };
                    if !t.columns.iter().any(|col| col.name == p.column) {
                        out.push(Problem {
                            severity: "error".into(),
                            message: format!(
                                "Coluna \"{}\" não existe na tabela \"{}\" (conexão \"{}\").",
                                p.column, c.table, c.name
                            ),
                            component_id: Some(comp.id.clone()),
                            window_id: window_of_comp(&c.component_id).map(|w| w.id.clone()),
                        });
                    }
                    match comp_anywhere(&p.from_component_id) {
                        None => out.push(err(format!(
                            "Conexão \"{}\" lê do componente inexistente \"{}\".",
                            c.name, p.from_component_id
                        ))),
                        Some(src) => {
                            if !param_capable(src) {
                                out.push(err(format!(
                                    "Componente \"{}\" não fornece valor para o banco.",
                                    src.id
                                )));
                            }
                        }
                    }
                }
                if c.kind == ConnectionKind::Query {
                    if c.query_columns.is_empty() {
                        out.push(err(format!(
                            "Conexão \"{}\" (consulta) não tem colunas para exibir.",
                            c.name
                        )));
                    }
                    match comp_anywhere(&c.target_table_component_id) {
                        None => out.push(err(format!(
                            "Conexão \"{}\" (consulta) não tem componente de destino.",
                            c.name
                        ))),
                        Some(t) => {
                            if t.comp_type != ComponentType::JTable && !text_targetable(t) {
                                out.push(err(format!(
                                    "Destino \"{}\" não pode receber resultado de consulta.",
                                    t.id
                                )));
                            }
                        }
                    }
                }
            }
            ConnectionKind::Custom => {
                if c.custom_code.trim().is_empty() {
                    out.push(err(format!(
                        "Conexão \"{}\" (código manual) está vazia.",
                        c.name
                    )));
                }
            }
            ConnectionKind::Message => {}
        }
    }

    out
}

// ------------------------------------------------------------ banco de dados --

#[tauri::command]
pub fn db_recreate(project_dir: String, model: AppModel, drop_existing: bool) -> Result<Vec<String>, String> {
    let project = PathBuf::from(&project_dir);
    let mut warnings = Vec::new();
    if drop_existing {
        let db = project.join(&model.database.file);
        if db.exists() {
            fs::remove_file(&db).map_err(|e| format!("Falha ao remover o banco: {}", e))?;
        }
    }
    db_apply(&project, &model, false)?;
    warnings.push(format!(
        "Banco \"{}\" pronto ({} tabelas).",
        model.database.file,
        model.database.tables.len()
    ));
    Ok(warnings)
}

pub fn ddl_statements(model: &AppModel) -> Vec<String> {
    let mut ddl = Vec::new();
    for t in &model.database.tables {
        if t.columns.is_empty() {
            continue;
        }
        let cols = t
            .columns
            .iter()
            .map(|c| {
                let ty = match c.col_type {
                    SqlType::Integer => "INTEGER",
                    SqlType::Text => "TEXT",
                    SqlType::Real => "REAL",
                    SqlType::Blob => "BLOB",
                };
                let mut s = format!("\"{}\" {}", c.name, ty);
                if c.pk {
                    s = format!("{} PRIMARY KEY", s);
                    if c.auto_increment && c.col_type == SqlType::Integer {
                        s = format!("{} AUTOINCREMENT", s);
                    }
                }
                if c.not_null {
                    s = format!("{} NOT NULL", s);
                }
                s
            })
            .collect::<Vec<_>>()
            .join(", ");
        ddl.push(format!(
            "CREATE TABLE IF NOT EXISTS \"{}\" ({})",
            t.name, cols
        ));
    }
    ddl
}

pub fn seed_statements(model: &AppModel) -> Vec<String> {
    let mut out = Vec::new();
    for t in &model.database.tables {
        let key_col = t
            .columns
            .iter()
            .find(|c| c.not_null && !c.pk)
            .or_else(|| t.columns.first())
            .map(|c| c.name.clone())
            .unwrap_or_default();
        for row in &t.seed_rows {
            let valid: Vec<&String> = row
                .keys()
                .filter(|k| t.columns.iter().any(|c| &c.name == *k))
                .collect();
            if valid.is_empty() {
                continue;
            }
            let cols = valid
                .iter()
                .map(|k| format!(r#""{}""#, k))
                .collect::<Vec<_>>()
                .join(", ");
            let vals = valid
                .iter()
                .map(|k| sql_string_literal(row.get(*k).map(|s| s.as_str()).unwrap_or("")))
                .collect::<Vec<_>>()
                .join(", ");
            let has_key = !key_col.is_empty() && row.contains_key(&key_col);
            out.push(if has_key {
                format!(
                    r#"INSERT INTO "{}"({}) SELECT {} WHERE NOT EXISTS(SELECT 1 FROM "{}" WHERE "{}" = {})"#,
                    t.name,
                    cols,
                    vals,
                    t.name,
                    key_col,
                    sql_string_literal(row.get(&key_col).map(|s| s.as_str()).unwrap_or(""))
                )
            } else {
                format!(r#"INSERT INTO "{}"({}) VALUES({})"#, t.name, cols, vals)
            });
        }
    }
    out
}

const SCHEMA_TOOL_JAVA: &str = r#"import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;

public class SchemaTool {
    public static void main(String[] args) throws Exception {
        List<String> ddl = Files.readAllLines(Paths.get(args[0]));
        List<String> seed = Files.readAllLines(Paths.get(args[1]));
        Class.forName("org.sqlite.JDBC");
        try (Connection c = DriverManager.getConnection("jdbc:sqlite:" + args[2]);
             Statement st = c.createStatement()) {
            for (String s : ddl) {
                if (!s.trim().isEmpty()) st.executeUpdate(s);
            }
            for (String s : seed) {
                if (!s.trim().isEmpty()) st.executeUpdate(s);
            }
        }
        System.out.println("OK");
    }
}
"#;

pub fn db_apply(project: &Path, model: &AppModel, _fresh: bool) -> Result<(), String> {
    let tools = project.join(".javaforge").join("tools");
    fs::create_dir_all(&tools).map_err(|e| e.to_string())?;
    let ddl_file = tools.join("ddl.txt");
    let seed_file = tools.join("seed.txt");
    fs::write(
        &ddl_file,
        ddl_statements(model).join("\r\n"),
    )
    .map_err(|e| e.to_string())?;
    fs::write(&seed_file, seed_statements(model).join("\r\n")).map_err(|e| e.to_string())?;
    fs::write(tools.join("SchemaTool.java"), SCHEMA_TOOL_JAVA).map_err(|e| e.to_string())?;

    let jar = project.join("lib").join("sqlite-jdbc.jar");
    if !jar.exists() {
        fs::create_dir_all(jar.parent().unwrap()).ok();
        fs::write(&jar, SQLITE_JAR_BYTES).map_err(|e| e.to_string())?;
    }
    let javac = resolve_javac().ok_or_else(|| {
        "javac não encontrado. Instale o JDK 17+ (JAVA_HOME) para preparar o banco.".to_string()
    })?;

    let out_dir = tools.join("out");
    let _ = fs::remove_dir_all(&out_dir);
    fs::create_dir_all(&out_dir).ok();

    let out = std::process::Command::new(&javac)
        .arg("-encoding")
        .arg("UTF-8")
        .arg("-d")
        .arg(&out_dir)
        .arg("-cp")
        .arg(&jar)
        .arg(tools.join("SchemaTool.java"))
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| format!("Falha ao compilar SchemaTool: {}", e))?;
    if !out.status.success() {
        return Err(format!(
            "Falha ao compilar SchemaTool: {}",
            String::from_utf8_lossy(&out.stderr)
        ));
    }

    let db_path = project.join(&model.database.file);
    let run = std::process::Command::new("java")
        .arg("-cp")
        .arg(format!(
            "{};{}",
            out_dir.to_string_lossy(),
            jar.to_string_lossy()
        ))
        .arg("SchemaTool")
        .arg(&ddl_file)
        .arg(&seed_file)
        .arg(&db_path)
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| format!("Falha ao preparar o banco: {}", e))?;
    if !run.status.success() {
        return Err(format!(
            "Falha ao preparar o banco: {}",
            String::from_utf8_lossy(&run.stderr)
        ));
    }
    Ok(())
}

pub fn resolve_javac() -> Option<PathBuf> {
    if let Ok(explicit) = std::env::var("JAVAFORGE_JAVAC") {
        let p = PathBuf::from(explicit);
        if p.exists() {
            return Some(p);
        }
    }
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let p = PathBuf::from(java_home).join("bin").join("javac.exe");
        if p.exists() {
            return Some(p);
        }
    }
    let path = std::env::var("PATH").ok()?;
    for dir in path.split(';') {
        if dir.is_empty() {
            continue;
        }
        let p = PathBuf::from(dir).join("javac.exe");
        if p.exists() {
            return Some(p);
        }
    }
    None
}
