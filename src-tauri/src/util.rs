use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};

pub const SQLITE_JAR_BYTES: &[u8] = include_bytes!("../../vendor/sqlite-jdbc.jar");
pub const FLATLAF_JAR_BYTES: &[u8] = include_bytes!("../../vendor/flatlaf-3.7.1.jar");
pub const MVNW_BYTES: &[u8] = include_bytes!("../../vendor/mvnw/mvnw");
pub const MVNW_CMD_BYTES: &[u8] = include_bytes!("../../vendor/mvnw/mvnw.cmd");
pub const MVNW_PROPS_BYTES: &[u8] =
    include_bytes!("../../vendor/mvnw/.mvn/wrapper/maven-wrapper.properties");
pub const GRADLEW_BYTES: &[u8] = include_bytes!("../../vendor/gradle/gradlew");
pub const GRADLEW_CMD_BYTES: &[u8] = include_bytes!("../../vendor/gradle/gradlew.cmd");
pub const GRADLEW_PROPS_BYTES: &[u8] =
    include_bytes!("../../vendor/gradle/wrapper/gradle-wrapper.properties");
pub const GRADLE_WRAPPER_JAR_BYTES: &[u8] =
    include_bytes!("../../vendor/gradle/wrapper/gradle-wrapper.jar");

/// Pasta de trabalho do JavaForge dentro de um projeto gerado.
///
/// Projetos criados antes desta organização usam `.javaforge`; eles continuam
/// funcionando sem migração forçada.
pub fn build_dir(project: &Path) -> PathBuf {
    let legacy = project.join(".javaforge");
    if legacy.is_dir() {
        legacy
    } else {
        project.join("build")
    }
}

/// Caminho do driver SQLite local (usado quando o Maven não está disponível).
pub fn driver_jar(project: &Path) -> PathBuf {
    build_dir(project).join("lib").join("sqlite-jdbc.jar")
}

/// Garante o driver SQLite na pasta de trabalho, copiando o embutido se faltar.
pub fn ensure_driver_jar(project: &Path) -> std::io::Result<PathBuf> {
    let jar = driver_jar(project);
    if jar.exists() {
        return Ok(jar);
    }
    if let Some(parent) = jar.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&jar, SQLITE_JAR_BYTES)?;
    Ok(jar)
}

/// Garante o FlatLaf na pasta de trabalho, copiando o embutido se faltar.
pub fn ensure_flatlaf_jar(project: &Path) -> std::io::Result<PathBuf> {
    let jar = build_dir(project).join("lib").join("flatlaf-3.7.1.jar");
    if jar.exists() {
        return Ok(jar);
    }
    if let Some(parent) = jar.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&jar, FLATLAF_JAR_BYTES)?;
    Ok(jar)
}

pub fn hash_str(value: &str) -> String {
    hash_str_bytes(value.as_bytes())
}

/// Mesmo SHA-256, para conteúdo binário (wrapper do Gradle).
pub fn hash_str_bytes(value: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value);
    format!("{:x}", hasher.finalize())
}

/// Nome de pasta seguro para projetos.
pub fn sanitize_folder_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == ' ' {
                c
            } else {
                '-'
            }
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches(|c| c == '.' || c == '-').to_string();
    if trimmed.is_empty() {
        "meu-app".to_string()
    } else {
        trimmed.replace(' ', "-")
    }
}

/// Converte um identificador Java ou nome de coluna para um identificador válido.
pub fn java_ident(raw: &str, fallback: &str) -> String {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .collect();
    let mut out = if cleaned.is_empty() {
        fallback.to_string()
    } else {
        cleaned
    };
    if out.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
        out = format!("_{}", out);
    }
    out
}

const JAVA_KEYWORDS: [&str; 56] = [
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const",
    "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float",
    "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native",
    "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp",
    "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void",
    "volatile", "while", "true", "false", "null", "var", "record", "yield",
];

pub fn is_valid_java_ident(id: &str) -> bool {
    !id.is_empty()
        && id
            .chars()
            .next()
            .map(|c| c.is_ascii_alphabetic() || c == '_' || c == '$')
            .unwrap_or(false)
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$')
        && !JAVA_KEYWORDS.contains(&id)
}

/// "login" -> "LoginWindow", "janela_principal" -> "JanelaPrincipalWindow"
pub fn java_class_name(window_id: &str) -> String {
    let pascal = pascal_case(java_ident(window_id, "Janela").as_str());
    if pascal.is_empty() {
        return "JanelaWindow".to_string();
    }
    if pascal.ends_with("Window") {
        pascal
    } else {
        format!("{}Window", pascal)
    }
}

pub fn pascal_case(raw: &str) -> String {
    let mut out = String::new();
    let mut upper_next = true;
    for c in raw.chars() {
        if c.is_ascii_alphanumeric() {
            if upper_next {
                out.extend(c.to_uppercase());
                upper_next = false;
            } else {
                out.push(c);
            }
        } else {
            upper_next = true;
        }
    }
    out
}

pub fn camel_case(raw: &str) -> String {
    let pascal = pascal_case(raw);
    if pascal.is_empty() {
        return String::new();
    }
    let mut chars = pascal.chars();
    let first = chars.next().unwrap().to_ascii_lowercase();
    format!("{}{}", first, chars.as_str())
}

/// Plural simples em português: "produtos" -> "produto", "usuarios" -> "usuario".
pub fn singularize(raw: &str) -> String {
    let lower = raw.to_ascii_lowercase();
    for (suffix, replacement) in [
        ("coes", "cao"),
        ("goes", "gao"),
        ("aes", "ao"),
        ("ais", "al"),
        ("eis", "el"),
        ("ois", "ol"),
        ("uis", "il"),
        ("ns", "m"),
        ("res", "r"),
    ] {
        if lower.ends_with(suffix) && lower.len() > suffix.len() + 1 {
            let kept = &lower[..lower.len() - suffix.len()];
            return format!("{}{}", kept, replacement);
        }
    }
    if lower.ends_with('s') && lower.len() > 1 {
        return lower[..lower.len() - 1].to_string();
    }
    lower
}

/// Literal de string Java (sem aspa inicial/final).
pub fn java_string_literal(raw: &str) -> String {
    let mut out = String::new();
    for c in raw.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            _ => out.push(c),
        }
    }
    out
}

/// Literal de string SQL (com aspas simples).
pub fn sql_string_literal(raw: &str) -> String {
    format!("'{}'", raw.replace('\'', "''"))
}

pub fn pkg_to_path(pkg: &str) -> String {
    pkg.split('.')
        .map(java_ident_raw)
        .collect::<Vec<_>>()
        .join("/")
}

fn java_ident_raw(part: &str) -> String {
    let cleaned: String = part
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .collect();
    if cleaned.is_empty() {
        "exemplo".to_string()
    } else {
        cleaned
    }
}

pub fn snap(value: f64, grid: bool, step: f64) -> f64 {
    if !grid {
        return value.round();
    }
    (value / step).round() * step
}
