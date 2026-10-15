// Contratos compartilhados entre frontend e backend Rust (serde espelha estes tipos).

export type BuildTool = "maven" | "gradle" | "none";

export type ComponentType =
  | "JLabel"
  | "JButton"
  | "JTextField"
  | "JPasswordField"
  | "JTextArea"
  | "JCheckBox"
  | "JRadioButton"
  | "JComboBox"
  | "JList"
  | "JTable"
  | "JPanel"
  | "JScrollPane"
  | "JProgressBar"
  | "JSpinner"
  | "JToggleButton"
  | "JSeparator"
  | "JSlider"
  | "JScrollBar"
  | "JTextPane"
  | "JEditorPane"
  | "JToolBar"
  | "JTree";

export interface MenuItemSpec {
  id: string;
  label: string;
}

export interface MenuSpec {
  id: string;
  label: string;
  items: MenuItemSpec[];
}

export type SqlType = "INTEGER" | "TEXT" | "REAL" | "BLOB";

export interface ColumnSpec {
  name: string;
  type: SqlType;
  pk: boolean;
  notNull: boolean;
  autoIncrement: boolean;
  /** Tabela referenciada pela chave estrangeira (vazio = sem relação). */
  refsTable?: string;
  /** Coluna referenciada dentro de `refsTable`. */
  refsColumn?: string;
}

export interface TableSpec {
  name: string;
  columns: ColumnSpec[];
  seedRows: Record<string, string>[];
}

export interface DatabaseSpec {
  file: string;
  tables: TableSpec[];
}

export interface ComponentSpec {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, string | number | boolean>;
  parentId: string | null;
}

export interface WindowSpec {
  id: string;
  title: string;
  width: number;
  height: number;
  components: ComponentSpec[];
  menu: MenuSpec[];
}

export type ParamRole = "set" | "where";

export type QueryOperator = "=" | ">" | "<" | ">=" | "<=" | "LIKE";

export interface ParamSpec {
  column: string;
  fromComponentId: string;
  role: ParamRole;
  operator: QueryOperator;
}

export type ConnectionKind =
  | "message"
  | "openWindow"
  | "authenticate"
  | "insert"
  | "update"
  | "delete"
  | "query"
  | "custom";

export interface ConnectionSpec {
  id: string;
  name: string;
  componentId: string;
  event: string;
  kind: ConnectionKind;
  table: string;
  params: ParamSpec[];
  queryColumns: { column: string; header: string }[];
  targetTableComponentId: string;
  openWindowId: string;
  closeCurrent: boolean;
  message: string;
  messageTitle: string;
  messageKind: "info" | "error" | "warning";
  authSuccessWindowId: string;
  customCode: string;
}

export interface AppModel {
  schemaVersion: number;
  name: string;
  packageName: string;
  mainWindowId: string;
  windows: WindowSpec[];
  database: DatabaseSpec;
  connections: ConnectionSpec[];
  buildTool: BuildTool;
  /** Tema do FlatLaf do app gerado: "dark" (padrão) ou "light". */
  theme: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  path: string;
  kind: "blank" | "login" | "crud";
  templateName: string;
  createdAt: string;
  lastOpenedAt: string;
}

export type FileKind = "file" | "dir";

export interface TreeNode {
  name: string;
  path: string;
  kind: FileKind;
  ext: string | null;
  children?: TreeNode[];
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface Problem {
  severity: "error" | "warning";
  message: string;
  componentId?: string;
  windowId?: string;
}

export interface RunResult {
  ok: boolean;
  message: string;
}

export interface CodegenResult {
  files: string[];
  warnings: string[];
}

export interface DbQueryResult {
  columns: string[];
  rows: string[][];
  affected: number | null;
  error: string | null;
}

export interface ColumnDiff {
  name: string;
  modelType?: string;
  modelNotNull?: boolean;
  modelPk?: boolean;
  dbType?: string;
  dbNotNull?: boolean;
  dbPk?: boolean;
  action: string;
}

export interface TableDiff {
  name: string;
  columns: ColumnDiff[];
  missingInDb: boolean;
  missingInModel: boolean;
}

export interface SchemaDiffResult {
  tables: TableDiff[];
  alterStatements: string[];
  destructive: string[];
}
