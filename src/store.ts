import { useSyncExternalStore } from "react";
import type {
  AppModel,
  FileContent,
  Problem,
  ProjectEntry,
  TreeNode,
} from "./types";

export interface EditorTab {
  path: string;
  name: string;
  language: string;
  content: string;
  dirty: boolean;
  generated: boolean;
}

export interface Toast {
  kind: "ok" | "info" | "error";
  text: string;
}

export interface OutputLine {
  stream: "out" | "err" | "sys";
  line: string;
}

export interface State {
  screen: "start" | "ide";
  project: ProjectEntry | null;
  model: AppModel;
  modelPath: string;
  tree: TreeNode[];
  recent: ProjectEntry[];
  leftTab: "files" | "palette";
  designerWindowId: string;
  selectedComponentId: string | null;
  centerTab: string;
  openTabs: EditorTab[];
  rightTab: "props" | "connections" | "data";
  output: OutputLine[];
  running: boolean;
  problems: Problem[];
  busy: string | null;
  toast: Toast | null;
  dragType: string | null;
  snapGrid: boolean;
}

function initialModel(): AppModel {
  return {
    schemaVersion: 1,
    name: "NovoApp",
    packageName: "com.exemplo.app",
    mainWindowId: "janelaPrincipal",
    windows: [],
    database: { file: "app.db", tables: [] },
    connections: [],
  };
}

const initial: State = {
  screen: "start",
  project: null,
  model: initialModel(),
  modelPath: "",
  tree: [],
  recent: [],
  leftTab: "files",
  designerWindowId: "",
  selectedComponentId: null,
  centerTab: "design",
  openTabs: [],
  rightTab: "props",
  output: [],
  running: false,
  problems: [],
  busy: null,
  toast: null,
  dragType: null,
  snapGrid: true,
};

type Listener = () => void;

export class Store<T extends object> {
  private state: T;
  private listeners = new Set<Listener>();

  constructor(init: T) {
    this.state = init;
  }

  getState = (): T => this.state;

  setState = (patch: Partial<T> | ((s: T) => Partial<T>)) => {
    const next = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...next };
    for (const l of this.listeners) l();
  };

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
}

export const store = new Store<State>(initial);

export function useStore<S>(selector: (s: State) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export function showToast(kind: Toast["kind"], text: string): void {
  store.setState({ toast: { kind, text } });
  window.setTimeout(() => {
    if (store.getState().toast?.text === text) store.setState({ toast: null });
  }, 4200);
}

export function appendOutput(input: string | OutputLine | (string | OutputLine)[]): void {
  const arr = Array.isArray(input) ? input : [input];
  const add = arr.map((l) =>
    typeof l === "string" ? { stream: "out" as const, line: l } : l,
  );
  const prev = store.getState().output;
  const next = [...prev, ...add].slice(-800);
  store.setState({ output: next });
}
