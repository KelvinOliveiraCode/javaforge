import { defaultPropsFor, makeComponentId } from "./catalog";
import type {
  AppModel,
  ConnectionSpec,
  ComponentSpec,
  ComponentType,
} from "./types";

export function javaClassName(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9_$]/g, "");
  const base = cleaned.length > 0 ? cleaned : "Janela";
  const pascal = base.charAt(0).toUpperCase() + base.slice(1);
  return pascal.endsWith("Window") ? pascal : `${pascal}Window`;
}

export function sanitizeJavaId(raw: string, fallback: string): string {
  let s = raw.replace(/[^A-Za-z0-9_$]/g, "");
  if (s.length === 0) s = fallback;
  if (/^[0-9]/.test(s)) s = `_${s}`;
  return s;
}

const JAVA_KEYWORDS = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const",
  "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float",
  "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native",
  "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp",
  "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void",
  "volatile", "while", "true", "false", "null", "var", "record", "yield", "sealed",
]);

export function isValidJavaId(id: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id) && !JAVA_KEYWORDS.has(id);
}

export function cloneModel(model: AppModel): AppModel {
  return JSON.parse(JSON.stringify(model)) as AppModel;
}

export function findWindow(model: AppModel, windowId: string): WindowSpecLike | undefined {
  return model.windows.find((w) => w.id === windowId);
}

type WindowSpecLike = AppModel["windows"][number];

export function findComponent(
  model: AppModel,
  windowId: string,
  componentId: string,
): ComponentSpec | undefined {
  const win = findWindow(model, windowId);
  if (!win) return undefined;
  return win.components.find((c) => c.id === componentId);
}

export function allComponents(model: AppModel): { window: WindowSpecLike; component: ComponentSpec }[] {
  const out: { window: WindowSpecLike; component: ComponentSpec }[] = [];
  for (const w of model.windows) for (const c of w.components) out.push({ window: w, component: c });
  return out;
}

export function newComponent(
  model: AppModel,
  windowId: string,
  type: ComponentType,
  x: number,
  y: number,
  width: number,
  height: number,
  parentId: string | null,
): ComponentSpec {
  const win = findWindow(model, windowId);
  const id = makeComponentId(type, win ? win.components : []);
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    props: defaultPropsFor(type),
    parentId,
  };
}

export function renameComponentId(
  model: AppModel,
  windowId: string,
  oldId: string,
  newId: string,
): AppModel {
  if (oldId === newId) return model;
  const next = cloneModel(model);
  const win = findWindow(next, windowId);
  if (!win) return model;
  const comp = win.components.find((c) => c.id === oldId);
  if (!comp) return model;
  if (win.components.some((c) => c.id === newId)) return model;
  comp.id = newId;
  for (const conn of next.connections) {
    if (conn.componentId === oldId) conn.componentId = newId;
    for (const p of conn.params) if (p.fromComponentId === oldId) p.fromComponentId = newId;
    if (conn.targetTableComponentId === oldId) conn.targetTableComponentId = newId;
  }
  return next;
}

export function removeComponent(model: AppModel, windowId: string, componentId: string): AppModel {
  const next = cloneModel(model);
  const win = findWindow(next, windowId);
  if (!win) return model;
  win.components = win.components.filter((c) => c.id !== componentId && c.parentId !== componentId);
  next.connections = next.connections.filter((conn) => {
    if (conn.componentId === componentId) return false;
    if (conn.targetTableComponentId === componentId) return false;
    return !conn.params.some((p) => p.fromComponentId === componentId);
  });
  return next;
}

export function newConnection(model: AppModel): ConnectionSpec {
  const ids = new Set(model.connections.map((c) => c.id));
  let n = model.connections.length + 1;
  while (ids.has(`conexao${n}`)) n += 1;
  const table = model.database.tables[0]?.name ?? "";
  return {
    id: `conexao${n}`,
    name: `Conexão ${n}`,
    componentId: "",
    event: "actionPerformed",
    kind: "message",
    table,
    params: [],
    queryColumns: [],
    targetTableComponentId: "",
    openWindowId: "",
    closeCurrent: false,
    message: "Operação concluída.",
    messageTitle: "Aviso",
    messageKind: "info",
    authSuccessWindowId: "",
    customCode: "",
  };
}

export function updateConnection(
  model: AppModel,
  id: string,
  patch: Partial<ConnectionSpec>,
): AppModel {
  const next = cloneModel(model);
  const conn = next.connections.find((c) => c.id === id);
  if (!conn) return model;
  Object.assign(conn, patch);
  return next;
}

export function windowIds(model: AppModel): string[] {
  return model.windows.map((w) => w.id);
}

export function sqlTypeOfColumn(
  model: AppModel,
  table: string,
  column: string,
): string {
  const t = model.database.tables.find((x) => x.name === table);
  if (!t) return "TEXT";
  const col = t.columns.find((c) => c.name === column);
  return col ? col.type : "TEXT";
}

export function makeSeedRow(columns: { name: string }[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (const c of columns) row[c.name] = "";
  return row;
}

// ------------------------------------------------------------------ menus --

export function addMenu(model: AppModel, windowId: string): AppModel {
  const next = cloneModel(model);
  const win = findWindow(next, windowId);
  if (!win) return model;
  const n = win.menu.length + 1;
  const id = `menu${n}`;
  win.menu.push({
    id,
    label: `Menu ${n}`,
    items: [
      { id: `item${n}1`, label: "Item 1" },
    ],
  });
  return next;
}

export function removeMenu(model: AppModel, windowId: string, menuId: string): AppModel {
  const next = cloneModel(model);
  const win = findWindow(next, windowId);
  if (!win) return model;
  const menu = win.menu.find((m) => m.id === menuId);
  const itemIds = new Set(menu?.items.map((i) => i.id) ?? []);
  win.menu = win.menu.filter((m) => m.id !== menuId);
  next.connections = next.connections.filter(
    (c) => !itemIds.has(c.componentId),
  );
  return next;
}

export function updateMenu(
  model: AppModel,
  windowId: string,
  menuId: string,
  patch: { label?: string; id?: string },
): AppModel {
  const next = cloneModel(model);
  const menu = findWindow(next, windowId)?.menu.find((m) => m.id === menuId);
  if (!menu) return model;
  Object.assign(menu, patch);
  return next;
}

export function addMenuItem(model: AppModel, windowId: string, menuId: string): AppModel {
  const next = cloneModel(model);
  const menu = findWindow(next, windowId)?.menu.find((m) => m.id === menuId);
  if (!menu) return model;
  const n = menu.items.length + 1;
  menu.items.push({ id: `item${menu.id}${n}`, label: `Item ${n}` });
  return next;
}

export function updateMenuItem(
  model: AppModel,
  windowId: string,
  menuId: string,
  itemId: string,
  patch: { label?: string; id?: string },
): AppModel {
  const next = cloneModel(model);
  const menu = findWindow(next, windowId)?.menu.find((m) => m.id === menuId);
  const item = menu?.items.find((i) => i.id === itemId);
  if (!menu || !item) return model;
  const oldId = item.id;
  Object.assign(item, patch);
  if (patch.id && patch.id !== oldId) {
    for (const c of next.connections) if (c.componentId === oldId) c.componentId = patch.id;
  }
  return next;
}

export function removeMenuItem(
  model: AppModel,
  windowId: string,
  menuId: string,
  itemId: string,
): AppModel {
  const next = cloneModel(model);
  const menu = findWindow(next, windowId)?.menu.find((m) => m.id === menuId);
  if (!menu) return model;
  menu.items = menu.items.filter((i) => i.id !== itemId);
  next.connections = next.connections.filter((c) => c.componentId !== itemId);
  return next;
}

/** Itens de menu de todas as janelas (para o painel de conexões). */
export function menuItems(model: AppModel): { item: { id: string; label: string }; windowId: string; menuId: string }[] {
  const out: { item: { id: string; label: string }; windowId: string; menuId: string }[] = [];
  for (const w of model.windows) {
    for (const m of w.menu) for (const i of m.items) out.push({ item: i, windowId: w.id, menuId: m.id });
  }
  return out;
}
