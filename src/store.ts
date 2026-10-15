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
  /** Estados anteriores do modelo (Ctrl+Z). */
  undoStack: AppModel[];
  /** Estados desfeitos, disponíveis para refazer (Ctrl+Y). */
  redoStack: AppModel[];
  /** Marca do último rótulo registrado, para juntar edições seguidas. */
  lastEditLabel: string;
  lastEditAt: number;
  modelPath: string;
  tree: TreeNode[];
  recent: ProjectEntry[];
  leftTab: "files" | "palette";
  designerWindowId: string;
  selectedComponentId: string | null;
  centerTab: string;
  openTabs: EditorTab[];
  rightTab: "props" | "connections" | "data" | "sql" | "migration";
  output: OutputLine[];
  running: boolean;
  problems: Problem[];
  busy: string | null;
  toast: Toast | null;
  dragType: string | null;
  snapGrid: boolean;
}

export function initialModel(): AppModel {
  return {
    schemaVersion: 1,
    name: "NovoApp",
    packageName: "com.exemplo.app",
    mainWindowId: "janelaPrincipal",
    windows: [],
    database: { file: "data/app.db", tables: [] },
    connections: [],
    buildTool: "maven",
    theme: "dark",
  };
}

const initial: State = {
  screen: "start",
  project: null,
  model: initialModel(),
  undoStack: [],
  redoStack: [],
  lastEditLabel: "",
  lastEditAt: 0,
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

const LIMITE_HISTORICO = 100;
const JANELA_COALESCENCIA = 700;

export { LIMITE_HISTORICO, JANELA_COALESCENCIA };

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

  /**
   * Troca o modelo guardando o estado anterior no histórico.
   *
   * Edições seguidas com o mesmo `label` dentro da janela de coalescência viram
   * um passo só: digitar "Java" em um campo não vira quatro Ctrl+Z.
   */
  setModel = (next: AppModel, label = ""): void => {
    const s = this.state as unknown as State;
    const prev = s.model;
    if (prev === next) return;
    const agora = Date.now();
    const juntar =
      label !== "" && label === s.lastEditLabel && agora - s.lastEditAt < JANELA_COALESCENCIA;
    const undoStack = juntar ? s.undoStack : [...s.undoStack, prev].slice(-LIMITE_HISTORICO);
    this.state = {
      ...s,
      model: next,
      undoStack,
      redoStack: [],
      lastEditLabel: label,
      lastEditAt: agora,
    } as unknown as T;
    for (const l of this.listeners) l();
  };

  /** Volta um passo. Devolve `false` quando não há o que desfazer. */
  undo = (): boolean => {
    const s = this.state as unknown as State;
    if (s.undoStack.length === 0) return false;
    const anterior = s.undoStack[s.undoStack.length - 1];
    this.state = {
      ...s,
      model: anterior,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [s.model, ...s.redoStack].slice(0, LIMITE_HISTORICO),
      lastEditLabel: "",
      lastEditAt: 0,
    } as unknown as T;
    for (const l of this.listeners) l();
    return true;
  };

  /** Refaz um passo desfeito. Devolve `false` quando não há o que refazer. */
  redo = (): boolean => {
    const s = this.state as unknown as State;
    if (s.redoStack.length === 0) return false;
    const proximo = s.redoStack[0];
    this.state = {
      ...s,
      model: proximo,
      undoStack: [...s.undoStack, s.model].slice(-LIMITE_HISTORICO),
      redoStack: s.redoStack.slice(1),
      lastEditLabel: "",
      lastEditAt: 0,
    } as unknown as T;
    for (const l of this.listeners) l();
    return true;
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
