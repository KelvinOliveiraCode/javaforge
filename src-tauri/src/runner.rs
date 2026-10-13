use crate::util::SQLITE_JAR_BYTES;
use serde::Serialize;
use std::fs;
use std::io::{BufRead, BufReader};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

pub type SharedChild = Arc<Mutex<Option<Child>>>;

pub struct RunState(pub SharedChild);

impl Default for RunState {
    fn default() -> Self {
        RunState(Arc::new(Mutex::new(None)))
    }
}

#[derive(Clone, Serialize)]
struct RunLine {
    stream: String,
    line: String,
}

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn which_mvn() -> Option<PathBuf> {
    if let Ok(explicit) = std::env::var("JAVAFORGE_MVN") {
        let p = PathBuf::from(explicit);
        if p.exists() {
            return Some(p);
        }
    }
    let path = std::env::var("PATH").ok()?;
    for dir in path.split(';') {
        if dir.is_empty() {
            continue;
        }
        for name in ["mvn.cmd", "mvn.bat", "mvn"] {
            let p = PathBuf::from(dir).join(name);
            if p.exists() {
                return Some(p);
            }
        }
    }
    None
}

fn read_model_pkg(project: &PathBuf) -> Option<String> {
    let content = fs::read_to_string(project.join("app.model.json")).ok()?;
    let v: serde_json::Value = serde_json::from_str(&content).ok()?;
    v.get("packageName")
        .and_then(|p| p.as_str())
        .map(|s| s.to_string())
}

fn collect_java(dir: &PathBuf, out: &mut Vec<PathBuf>) {
    let Ok(read) = fs::read_dir(dir) else {
        return;
    };
    for entry in read.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_java(&path, out);
        } else if path
            .extension()
            .map(|e| e.eq_ignore_ascii_case("java"))
            .unwrap_or(false)
        {
            out.push(path);
        }
    }
}

fn emit(app: &AppHandle, stream: &str, line: &str) {
    let _ = app.emit(
        "run-output",
        RunLine {
            stream: stream.to_string(),
            line: line.to_string(),
        },
    );
}

fn spawn_and_track(
    app: &AppHandle,
    shared: &SharedChild,
    mut cmd: Command,
    label: &str,
) -> Result<(), String> {
    emit(
        app,
        "sys",
        &format!("> [{}] {}", label, cmd.get_program().to_string_lossy()),
    );
    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Falha ao iniciar: {}", e))?;

    if let Some(out) = child.stdout.take() {
        let app2 = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(out);
            for line in reader.lines().map_while(Result::ok) {
                emit(&app2, "out", &line);
            }
        });
    }
    if let Some(err) = child.stderr.take() {
        let app2 = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(err);
            for line in reader.lines().map_while(Result::ok) {
                emit(&app2, "err", &line);
            }
        });
    }

    {
        let mut slot = shared.lock().unwrap();
        *slot = Some(child);
    }

    let monitor = shared.clone();
    let app2 = app.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(250));
        let mut slot = monitor.lock().unwrap();
        let finished = match slot.as_mut() {
            Some(child) => match child.try_wait() {
                Ok(Some(status)) => {
                    let code = status.code().unwrap_or(-1);
                    let _ = app2.emit("run-exit", code);
                    true
                }
                Ok(None) => false,
                Err(_) => true,
            },
            None => true,
        };
        if finished {
            *slot = None;
            break;
        }
    });
    Ok(())
}

fn run_javac(
    app: &AppHandle,
    shared: &SharedChild,
    project: &PathBuf,
) -> Result<(), String> {
    let mut javas: Vec<PathBuf> = Vec::new();
    collect_java(&project.join("src"), &mut javas);
    if javas.is_empty() {
        return Err("Nenhum arquivo Java em src/. Gere o código primeiro.".to_string());
    }
    let jar = project.join("lib").join("sqlite-jdbc.jar");
    if !jar.exists() {
        fs::create_dir_all(project.join("lib")).ok();
        fs::write(&jar, SQLITE_JAR_BYTES).map_err(|e| e.to_string())?;
    }
    let javac = crate::commands::resolve_javac()
        .ok_or_else(|| "javac não encontrado. Instale o JDK 17+ ou o Maven.".to_string())?;

    let out_dir = project.join(".javaforge").join("out");
    let _ = fs::remove_dir_all(&out_dir);
    fs::create_dir_all(&out_dir).ok();

    emit(app, "sys", "> compilando com javac");
    let mut compile = Command::new(&javac);
    compile
        .arg("-encoding")
        .arg("UTF-8")
        .arg("-d")
        .arg(&out_dir)
        .arg("-cp")
        .arg(&jar);
    for j in &javas {
        compile.arg(j);
    }
    let output = compile
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Falha ao compilar: {}", e))?;
    for line in String::from_utf8_lossy(&output.stderr).lines() {
        emit(app, "err", line);
    }
    if !output.status.success() {
        return Err("A compilação falhou. Veja os erros acima.".to_string());
    }

    let pkg = read_model_pkg(project).unwrap_or_else(|| "com.exemplo.app".to_string());
    let mut run = Command::new("java");
    run.arg("-cp")
        .arg(format!(
            "{};{}",
            out_dir.to_string_lossy(),
            jar.to_string_lossy()
        ))
        .arg("-Dfile.encoding=UTF-8")
        .arg(format!("{}.Main", pkg))
        .current_dir(project);
    emit(app, "sys", "> executando aplicativo");
    spawn_and_track(app, shared, run, "javac")
}

#[tauri::command]
pub fn run_start(
    app: AppHandle,
    state: State<'_, RunState>,
    project_dir: String,
) -> Result<(), String> {
    let slot = state.0.clone();
    {
        let guard = slot.lock().unwrap();
        if guard.is_some() {
            return Err("Já existe uma execução em andamento.".to_string());
        }
    }
    let project = PathBuf::from(&project_dir);
    if !project.is_dir() {
        return Err("Pasta do projeto não encontrada.".to_string());
    }

    if let Some(mvn) = which_mvn() {
        emit(&app, "sys", "> compilando e executando com Maven");
        let mut cmd = Command::new(mvn);
        cmd.args(["-q", "-B", "compile", "exec:java"])
            .current_dir(&project);
        return spawn_and_track(&app, &slot, cmd, "Maven");
    }
    let mvnw = project.join("mvnw.cmd");
    if mvnw.exists() {
        emit(&app, "sys", "> executando via Maven Wrapper");
        let mut cmd = Command::new(&mvnw);
        cmd.args(["-q", "-B", "compile", "exec:java"])
            .current_dir(&project);
        return spawn_and_track(&app, &slot, cmd, "Maven Wrapper");
    }
    run_javac(&app, &slot, &project)
}

#[tauri::command]
pub fn run_stop(state: State<'_, RunState>) -> Result<(), String> {
    let slot = state.0.clone();
    let mut guard = slot.lock().unwrap();
    let Some(mut child) = guard.take() else {
        return Err("Nenhuma execução em andamento.".to_string());
    };
    let pid = child.id();
    let _ = child.kill();
    let _ = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    Ok(())
}
