import { api, joinPath } from "./api";
import { catalogOf, defaultPropsFor, makeComponentId } from "./catalog";
import {
  cloneModel,
  findWindow,
  newComponent,
  newConnection,
  removeComponent,
  renameComponentId,
  updateConnection,
} from "./model-ops";
import type {
  AppModel,
  ConnectionSpec,
  ComponentSpec,
  ComponentType,
  Problem,
} from "./types";
import { appendOutput, showToast, store } from "./store";

let persistTimer: number | null = null;

export function patchModel(fn: (m: AppModel) => void): void {
  const next = cloneModel(store.getState().model);
  fn(next);
  store.setState({ model: next });
  schedulePersist();
}

export async function persistNow(): Promise<void> {
  const { project, model } = store.getState();
  if (!project) return;
  try {
    await api.modelSave(project.path, model);
    const res = await api.codegen(project.path);
    const problems = await api.validate(model);
    store.setState({ problems });
    const tree = await api.tree(project.path).catch(() => []);
    store.setState({ tree });
    if (res.warnings.length > 0) {
      appendOutput(res.warnings.map((w) => `aviso: ${w}`));
    }
    refreshOpenTabsFromDisk();
  } catch (e) {
    showToast("error", `Falha ao salvar: ${String(e)}`);
  }
}

function schedulePersist(): void {
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    void persistNow();
  }, 900);
}

/** Regenera o conteúdo das abas abertas que não têm edição local. */
async function refreshOpenTabsFromDisk(): Promise<void> {
  const tabs = store.getState().openTabs;
  for (const tab of tabs) {
    if (tab.dirty) continue;
    try {
      const fresh = await api.readFile(tab.path);
      store.setState({
        openTabs: store.getState().openTabs.map((t) =>
          t.path === tab.path ? { ...t, content: fresh.content } : t,
        ),
      });
    } catch {
      /* arquivo removido */
    }
  }
}

export async function refreshRecent(): Promise<void> {
  try {
    const recent = await api.registryList();
    store.setState({ recent });
  } catch (e) {
    showToast("error", String(e));
  }
}

export async function openProjectByPath(path: string): Promise<void> {
  try {
    void api.clientLog(`abrir projeto: ${path}`).catch(() => {});
    const entry = await api.projectOpen(path);
    const model = await api.modelLoad(path);
    const tree = await api.tree(path).catch(() => []);
    const problems = await api.validate(model);
    void api.clientLog(`modelo carregado: ${model.windows.length} janelas`).catch(() => {});
    store.setState({
      screen: "ide",
      project: entry,
      model,
      modelPath: path,
      tree,
      problems,
      designerWindowId: model.mainWindowId,
      centerTab: "design",
      openTabs: [],
      selectedComponentId: null,
      output: [],
    });
    showToast("ok", `Projeto "${entry.name}" aberto.`);
  } catch (e) {
    void api.clientLog(`FALHA ao abrir projeto: ${String(e)}`).catch(() => {});
    showToast("error", String(e));
  }
}

export async function createProject(
  kind: string,
  name: string,
  parentDir: string,
  packageName: string,
): Promise<boolean> {
  try {
    const entry = await api.projectCreate(kind, name, parentDir, packageName);
    await openProjectByPath(entry.path);
    const res = await api.codegen(entry.path);
    const tree = await api.tree(entry.path).catch(() => []);
    store.setState({ tree });
    appendOutput([
      `> projeto criado em ${entry.path}`,
      ...res.warnings.map((w) => `aviso: ${w}`),
    ]);
    showToast("ok", `Projeto "${entry.name}" criado. Código Java gerado.`);
    return true;
  } catch (e) {
    showToast("error", String(e));
    return false;
  }
}

export async function runProject(): Promise<void> {
  const { project } = store.getState();
  if (!project) return;
  store.setState({ output: [], running: true });
  appendOutput(`> compilando e executando ${project.name}...`);
  try {
    await api.runStart(project.path);
  } catch (e) {
    store.setState({ running: false });
    appendOutput(String(e));
    showToast("error", String(e));
  }
}

export async function stopProject(): Promise<void> {
  try {
    await api.runStop();
    appendOutput("> execução interrompida.");
  } catch (e) {
    appendOutput(String(e));
  } finally {
    store.setState({ running: false });
  }
}

export async function regenerate(): Promise<void> {
  const { project } = store.getState();
  if (!project) return;
  appendOutput("> gerando código Java a partir do modelo...");
  try {
    const res = await api.codegen(project.path);
    const tree = await api.tree(project.path).catch(() => []);
    store.setState({ tree });
    appendOutput([
      `> ${res.files.length} arquivos escritos.`,
      ...res.warnings.map((w) => `aviso: ${w}`),
    ]);
    showToast("ok", "Código gerado.");
  } catch (e) {
    appendOutput(String(e));
    showToast("error", String(e));
  }
}

// --------------------------------------------------------------- designer --

export function addComponentAt(type: ComponentType, x: number, y: number): void {
  const { model, designerWindowId } = store.getState();
  const win = findWindow(model, designerWindowId);
  if (!win) return;
  const entry = catalogOf(type);
  const comp = newComponent(
    model,
    designerWindowId,
    type,
    Math.max(0, x),
    Math.max(0, y),
    entry.defaultWidth,
    entry.defaultHeight,
    null,
  );
  patchModel((m) => {
    const w = findWindow(m, designerWindowId);
    w?.components.push(comp);
  });
  store.setState({ selectedComponentId: comp.id });
}

export function addComponentToPanel(type: ComponentType, panelId: string, x: number, y: number): void {
  const { model, designerWindowId } = store.getState();
  const win = findWindow(model, designerWindowId);
  if (!win) return;
  const panel = win.components.find((c) => c.id === panelId);
  if (!panel) return;
  const entry = catalogOf(type);
  const comp = newComponent(
    model,
    designerWindowId,
    type,
    x + panel.x,
    y + panel.y,
    entry.defaultWidth,
    entry.defaultHeight,
    panelId,
  );
  patchModel((m) => {
    const w = findWindow(m, designerWindowId);
    w?.components.push(comp);
  });
  store.setState({ selectedComponentId: comp.id });
}

export function updateComponent(id: string, patch: Partial<ComponentSpec>): void {
  const { designerWindowId } = store.getState();
  patchModel((m) => {
    const win = findWindow(m, designerWindowId);
    const comp = win?.components.find((c) => c.id === id);
    if (comp) Object.assign(comp, patch);
  });
}

export function updateComponentProps(id: string, key: string, value: string | number | boolean): void {
  const { designerWindowId } = store.getState();
  patchModel((m) => {
    const win = findWindow(m, designerWindowId);
    const comp = win?.components.find((c) => c.id === id);
    if (comp) comp.props = { ...comp.props, [key]: value };
  });
}

export function renameComponent(id: string, newId: string): void {
  const { model, designerWindowId } = store.getState();
  const next = renameComponentId(model, designerWindowId, id, newId);
  if (next === model) {
    showToast("error", "Identificador inválido ou já existe nesta janela.");
    return;
  }
  store.setState({ model: next, selectedComponentId: newId });
  void persistNow();
}

export function deleteComponent(id: string): void {
  const { model, designerWindowId } = store.getState();
  const next = removeComponent(model, designerWindowId, id);
  store.setState({ model: next, selectedComponentId: null });
  void persistNow();
}

export function duplicateComponent(id: string): void {
  const { model, designerWindowId } = store.getState();
  const win = findWindow(model, designerWindowId);
  const comp = win?.components.find((c) => c.id === id);
  if (!comp) return;
  const newId = makeComponentId(comp.type, win!.components) + "Copia";
  patchModel((m) => {
    const w = findWindow(m, designerWindowId);
    if (!w) return;
    w.components.push({
      ...comp,
      id: newId,
      x: comp.x + 16,
      y: comp.y + 16,
      props: { ...comp.props },
    });
  });
  store.setState({ selectedComponentId: newId });
}

export function addWindow(): void {
  const { model } = store.getState();
  const ids = new Set(model.windows.map((w) => w.id));
  let n = model.windows.length + 1;
  while (ids.has(`janela${n}`)) n += 1;
  const id = `janela${n}`;
  patchModel((m) => {
    m.windows.push({
      id,
      title: `Janela ${n}`,
      width: 640,
      height: 480,
      components: [],
    });
  });
  store.setState({ designerWindowId: id, selectedComponentId: null });
}

export function deleteWindow(id: string): void {
  const { model } = store.getState();
  if (model.windows.length <= 1) {
    showToast("error", "O aplicativo precisa de pelo menos uma janela.");
    return;
  }
  const doomed = model.windows.find((w) => w.id === id);
  const doomedIds = new Set(doomed?.components.map((c) => c.id) ?? []);
  patchModel((m) => {
    m.windows = m.windows.filter((w) => w.id !== id);
    m.connections = m.connections.filter((c) => !doomedIds.has(c.componentId));
    if (m.mainWindowId === id) m.mainWindowId = m.windows[0].id;
  });
  store.setState({ designerWindowId: model.windows[0].id });
}

export function updateWindow(id: string, patch: { title?: string; width?: number; height?: number }): void {
  patchModel((m) => {
    const w = findWindow(m, id);
    if (w) Object.assign(w, patch);
  });
}

export function setMainWindow(id: string): void {
  patchModel((m) => {
    m.mainWindowId = id;
  });
}

// ------------------------------------------------------------- conexões --

export function createConnection(): void {
  patchModel((m) => {
    m.connections.push(newConnection(m));
  });
}

export function patchConnection(id: string, patch: Partial<ConnectionSpec>): void {
  const { model } = store.getState();
  const next = updateConnection(model, id, patch);
  store.setState({ model: next });
  schedulePersist();
}

export function deleteConnection(id: string): void {
  const { model } = store.getState();
  const next = model.connections.filter((c) => c.id !== id);
  store.setState({ model: { ...model, connections: next } });
  void persistNow();
}

export function applyDb(drop: boolean): void {
  const { project, model } = store.getState();
  if (!project) return;
  api
    .dbRecreate(project.path, model, drop)
    .then((warnings) => {
      appendOutput(warnings.map((w) => `> ${w}`));
      showToast("ok", drop ? "Banco recriado." : "Esquema aplicado ao banco.");
    })
    .catch((e) => {
      appendOutput(String(e));
      showToast("error", String(e));
    });
}

// ---------------------------------------------------------------- arquivos --

export async function openFile(path: string): Promise<void> {
  const tabs = store.getState().openTabs;
  if (tabs.some((t) => t.path === path)) {
    store.setState({ centerTab: `file:${path}` });
    return;
  }
  try {
    const file = await api.readFile(path);
    const generated = /(^|\/)(Main|Database|Schema|[A-Za-z0-9_$]+Window)\.java$/.test(
      path.replace(/\\/g, "/"),
    );
    store.setState({
      openTabs: [
        ...tabs,
        {
          path,
          name: file.path.split(/[\\/]/).pop() || path,
          language: file.language,
          content: file.content,
          dirty: false,
          generated,
        },
      ],
      centerTab: `file:${path}`,
    });
  } catch (e) {
    showToast("error", String(e));
  }
}

export function closeTab(path: string): void {
  const tabs = store.getState().openTabs.filter((t) => t.path !== path);
  const active = store.getState().centerTab;
  let nextTab = active;
  if (active === `file:${path}`) {
    nextTab = tabs.length > 0 ? `file:${tabs[tabs.length - 1].path}` : "design";
  }
  store.setState({ openTabs: tabs, centerTab: nextTab });
}

export function setTabContent(path: string, content: string): void {
  store.setState({
    openTabs: store.getState().openTabs.map((t) =>
      t.path === path ? { ...t, content, dirty: true } : t,
    ),
  });
}

export async function saveActiveFile(): Promise<void> {
  const { openTabs, centerTab } = store.getState();
  const path = centerTab.startsWith("file:") ? centerTab.slice(5) : "";
  const tab = openTabs.find((t) => t.path === path);
  if (!tab || !tab.dirty) return;
  try {
    await api.writeFile(tab.path, tab.content);
    store.setState({
      openTabs: openTabs.map((t) => (t.path === path ? { ...t, dirty: false } : t)),
    });
    showToast("ok", `${tab.name} salvo.`);
  } catch (e) {
    showToast("error", String(e));
  }
}

export async function refreshTree(): Promise<void> {
  const { project } = store.getState();
  if (!project) return;
  const tree = await api.tree(project.path).catch(() => []);
  store.setState({ tree });
}

export async function createFileIn(dir: string, name: string): Promise<void> {
  if (!name.trim()) return;
  try {
    await api.createFile(joinPath(dir, name.trim()));
    await refreshTree();
    showToast("ok", "Arquivo criado.");
  } catch (e) {
    showToast("error", String(e));
  }
}

export async function createFolderIn(dir: string, name: string): Promise<void> {
  if (!name.trim()) return;
  try {
    await api.createFolder(joinPath(dir, name.trim()));
    await refreshTree();
    showToast("ok", "Pasta criada.");
  } catch (e) {
    showToast("error", String(e));
  }
}

export async function deletePath(path: string): Promise<void> {
  try {
    await api.deletePath(path);
    closeTab(path);
    await refreshTree();
    showToast("ok", "Removido.");
  } catch (e) {
    showToast("error", String(e));
  }
}

export async function renamePath(oldPath: string, newName: string): Promise<void> {
  if (!newName.trim()) return;
  const dir = oldPath.replace(/[\\/][^\\/]*$/, "");
  try {
    await api.renamePath(oldPath, joinPath(dir, newName.trim()));
    await refreshTree();
  } catch (e) {
    showToast("error", String(e));
  }
}

export function selectProblem(p: Problem): void {
  if (p.windowId) store.setState({ designerWindowId: p.windowId });
  if (p.componentId) {
    store.setState({ selectedComponentId: p.componentId, rightTab: "props" });
  }
}
