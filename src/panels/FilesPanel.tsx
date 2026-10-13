import { useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  createFileIn,
  createFolderIn,
  deletePath,
  deleteProject,
  openFile,
  refreshTree,
  renamePath,
} from "../actions";
import { showToast, store, useStore } from "../store";
import type { TreeNode } from "../types";
import ConfirmDialog from "../components/ConfirmDialog";

export default function FilesPanel() {
  const tree = useStore((s) => s.tree);
  const project = useStore((s) => s.project);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState<null | "file" | "folder">(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const toggle = (path: string) => {
    const next = new Set(collapsed);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setCollapsed(next);
  };

  const baseDir = () => {
    if (selected) {
      const node = find(tree, selected);
      if (node?.kind === "dir") return node.path;
      return node?.path.replace(/[\\/][^\\/]*$/, "") ?? project?.path ?? "";
    }
    return project?.path ?? "";
  };

  const submitCreate = () => {
    const dir = baseDir();
    if (creating === "file") void createFileIn(dir, newName);
    if (creating === "folder") void createFolderIn(dir, newName);
    setCreating(null);
    setNewName("");
  };

  const icon = (node: TreeNode) => {
    if (node.kind === "dir") {
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M1.5 4.5A1.5 1.5 0 0 1 3 3h3l1.5 2H13a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5v-7Z" />
        </svg>
      );
    }
    if (node.ext === "java") {
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M4 1.5h5l3 3v10H4z" />
          <path d="M9 1.5v3h3" />
        </svg>
      );
    }
    if (node.ext === "db") {
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <ellipse cx="8" cy="4" rx="5.5" ry="2.2" />
          <path d="M2.5 4v8c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2V4M2.5 8c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2" />
        </svg>
      );
    }
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M4 1.5h5l3 3v10H4z" />
        <path d="M9 1.5v3h3" />
      </svg>
    );
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isOpen = !collapsed.has(node.path);
    const isSelected = selected === node.path;
    return (
      <div key={node.path}>
        <div
          className={`tree-row ${isSelected ? "selected" : ""}`}
          style={{ paddingLeft: 6 + depth * 13 }}
          role="treeitem"
          tabIndex={0}
          onClick={() => {
            setSelected(node.path);
            if (node.kind === "dir") toggle(node.path);
            else if (node.ext === "db") {
              // o banco é binário: manda para a aba Banco em vez do editor
              store.setState({ rightTab: "sql" });
              showToast("info", `"${node.name}" é o banco do aplicativo. Use a aba Banco para ver e alterar os dados.`);
            } else void openFile(node.path);
          }}
          onDoubleClick={() => {
            if (node.kind === "file") {
              setRenaming(node.path);
              setRenameValue(node.name);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && node.kind === "file") {
              if (node.ext === "db") store.setState({ rightTab: "sql" });
              else void openFile(node.path);
            }
          }}
        >
          <span className="twisty">{node.kind === "dir" ? (isOpen ? "▼" : "▶") : ""}</span>
          <span className="tree-ico">{icon(node)}</span>
          <span className="name">{node.name}</span>
          {node.kind === "file" && node.ext === "db" ? (
            <span className="badge" style={{ marginLeft: "auto" }}>
              banco
            </span>
          ) : null}
        </div>
        {node.kind === "dir" && isOpen && node.children?.length
          ? node.children.map((c) => renderNode(c, depth + 1))
          : null}
        {renaming === node.path ? (
          <div style={{ padding: "2px 8px", paddingLeft: 19 + depth * 13 }}>
            <input
              className="input"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => setRenaming(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void renamePath(node.path, renameValue);
                  setRenaming(null);
                }
                if (e.key === "Escape") setRenaming(null);
              }}
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
      <div className="tree" style={{ flex: 1, overflowY: "auto" }} role="tree">
        {project ? tree.map((n) => renderNode(n, 0)) : null}
        {creating ? (
          <div style={{ padding: "4px 10px" }}>
            <input
              className="input"
              autoFocus
              placeholder={creating === "file" ? "NomeDoArquivo.java" : "NomeDaPasta"}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => setCreating(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
                if (e.key === "Escape") setCreating(null);
              }}
            />
          </div>
        ) : null}
      </div>
      <div className="side-foot">
        <button className="btn sm" onClick={() => setCreating("file")} disabled={!project}>
          Arquivo
        </button>
        <button className="btn sm" onClick={() => setCreating("folder")} disabled={!project}>
          Pasta
        </button>
        <button
          className="btn sm"
          onClick={() => void refreshTree()}
          disabled={!project}
          title="Recarregar a árvore"
        >
          Atualizar
        </button>
      </div>
      <div className="side-foot">
        <button
          className="btn sm danger"
          disabled={!selected}
          onClick={() => selected && void deletePath(selected)}
          title="Excluir o arquivo ou pasta selecionada"
        >
          Excluir
        </button>
        <button
          className="btn sm danger"
          disabled={!project}
          onClick={() => setConfirmarExclusao(true)}
          title="Apagar a pasta do projeto e o código gerado (não dá para desfazer)"
        >
          Excluir projeto
        </button>
      </div>
      <div className="side-foot">
        <button
          className="btn sm"
          disabled={!project}
          onClick={() => project && void openPath(project.path)}
          title="Abrir a pasta do projeto no explorador"
        >
          Abrir pasta
        </button>
      </div>
      {confirmarExclusao && project ? (
        <ConfirmDialog
          title={`Excluir "${project.name}"?`}
          message={`A pasta ${project.path} e todo o código Java gerado serão apagados do computador. O app volta para a tela inicial e não dá para desfazer.`}
          confirmLabel="Excluir projeto"
          danger
          onCancel={() => setConfirmarExclusao(false)}
          onConfirm={() => {
            setConfirmarExclusao(false);
            void deleteProject(project.path);
          }}
        />
      ) : null}
    </div>
  );
}

function find(nodes: TreeNode[], path: string): TreeNode | null {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children) {
      const f = find(n.children, path);
      if (f) return f;
    }
  }
  return null;
}
