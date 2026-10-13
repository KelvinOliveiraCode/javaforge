pub mod codegen;
pub mod commands;
pub mod model;
pub mod registry;
pub mod runner;
pub mod templates;
pub mod util;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(runner::RunState::default())
        .invoke_handler(tauri::generate_handler![
            commands::registry_list,
            commands::project_create,
            commands::project_open,
            commands::project_forget,
            commands::home_dir,
            commands::client_log,
            commands::fs_tree,
            commands::fs_read,
            commands::fs_write,
            commands::fs_create_file,
            commands::fs_create_folder,
            commands::fs_delete,
            commands::fs_rename,
            commands::model_load,
            commands::model_save,
            commands::validate_model,
            commands::codegen_generate,
            commands::db_recreate,
            runner::run_start,
            runner::run_stop,
        ])
        .run(tauri::generate_context!())
        .expect("falha ao iniciar o JavaForge");
}
