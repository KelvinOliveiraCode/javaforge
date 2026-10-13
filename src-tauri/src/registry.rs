use crate::model::ProjectEntry;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn now_iso() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("unix:{}", secs)
}

fn data_dir() -> PathBuf {
    let base = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    let dir = base.join("JavaForge");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn registry_path() -> PathBuf {
    data_dir().join("registry.json")
}

pub fn list() -> Vec<ProjectEntry> {
    let path = registry_path();
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str::<Vec<ProjectEntry>>(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn save(entries: &[ProjectEntry]) {
    let path = registry_path();
    if let Ok(json) = serde_json::to_string_pretty(entries) {
        let _ = fs::write(path, json);
    }
}

pub fn add(entry: &ProjectEntry) {
    let mut entries = list();
    entries.retain(|e| e.path != entry.path);
    entries.insert(0, entry.clone());
    save(&entries);
}

pub fn touch(path: &str) {
    let mut entries = list();
    for e in entries.iter_mut() {
        if e.path == path {
            e.last_opened_at = now_iso();
        }
    }
    save(&entries);
}

pub fn forget(path: &str) {
    let mut entries = list();
    entries.retain(|e| e.path != path);
    save(&entries);
}
