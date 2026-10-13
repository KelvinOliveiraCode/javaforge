import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  AppModel,
  CodegenResult,
  FileContent,
  Problem,
  ProjectEntry,
  TreeNode,
} from "./types";

export const api = {
  homeDir: () => invoke<string>("home_dir"),
  clientLog: (message: string) => invoke<void>("client_log", { message }),
  registryList: () => invoke<ProjectEntry[]>("registry_list"),
  projectCreate: (kind: string, name: string, parentDir: string, packageName: string) =>
    invoke<ProjectEntry>("project_create", { kind, name, parentDir, packageName }),
  projectOpen: (path: string) => invoke<ProjectEntry>("project_open", { path }),
  projectForget: (path: string) => invoke<void>("project_forget", { path }),

  tree: (path: string) => invoke<TreeNode[]>("fs_tree", { path }),
  readFile: (path: string) => invoke<FileContent>("fs_read", { path }),
  writeFile: (path: string, content: string) => invoke<void>("fs_write", { path, content }),
  createFile: (path: string) => invoke<void>("fs_create_file", { path }),
  createFolder: (path: string) => invoke<void>("fs_create_folder", { path }),
  deletePath: (path: string) => invoke<void>("fs_delete", { path }),
  renamePath: (oldPath: string, newPath: string) => invoke<void>("fs_rename", { oldPath, newPath }),

  modelLoad: (path: string) => invoke<AppModel>("model_load", { projectDir: path }),
  modelSave: (path: string, model: AppModel) =>
    invoke<void>("model_save", { projectDir: path, model }),
  validate: (model: AppModel) => invoke<Problem[]>("validate_model", { model }),

  codegen: (path: string) => invoke<CodegenResult>("codegen_generate", { projectDir: path }),
  dbRecreate: (path: string, model: AppModel, dropExisting: boolean) =>
    invoke<string[]>("db_recreate", { projectDir: path, model, dropExisting }),

  runStart: (path: string) => invoke<void>("run_start", { projectDir: path }),
  runStop: () => invoke<void>("run_stop"),

  onRunOutput: (cb: (line: { stream: string; line: string }) => void) =>
    listen<{ stream: string; line: string }>("run-output", (e) => cb(e.payload)),
  onRunExit: (cb: (code: number) => void) =>
    listen<{ code: number }>("run-exit", (e) => cb(e.payload.code)),
};

export function joinPath(dir: string, name: string): string {
  const sep = dir.includes("\\") ? "\\" : "/";
  return dir.endsWith(sep) ? dir + name : dir + sep + name;
}

export function dirName(path: string): string {
  const idx = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return idx <= 0 ? path : path.slice(0, idx);
}

export function baseName(path: string): string {
  const idx = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return idx < 0 ? path : path.slice(idx + 1);
}
