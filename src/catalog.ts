import type { ComponentSpec, ComponentType } from "./types";

export interface PropFieldSpec {
  key: string;
  label: string;
  kind: "text" | "number" | "boolean" | "csv";
}

export interface CatalogEntry {
  type: ComponentType;
  label: string;
  group: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultProps: Record<string, string | number | boolean>;
  propFields: PropFieldSpec[];
  events: { event: string; label: string }[];
  isContainer: boolean;
}

const TEXT_FIELD: PropFieldSpec[] = [
  { key: "text", label: "Texto", kind: "text" },
  { key: "toolTipText", label: "Dica (tooltip)", kind: "text" },
  { key: "enabled", label: "Habilitado", kind: "boolean" },
];

const INPUT_FIELDS: PropFieldSpec[] = [
  { key: "columns", label: "Colunas", kind: "number" },
  { key: "toolTipText", label: "Dica (tooltip)", kind: "text" },
  { key: "enabled", label: "Habilitado", kind: "boolean" },
];

export const CATALOG: CatalogEntry[] = [
  {
    type: "JButton",
    label: "Botão",
    group: "Básicos",
    description: "Dispara ações e conexões ao ser clicado.",
    defaultWidth: 110,
    defaultHeight: 30,
    defaultProps: { text: "Botão", toolTipText: "", enabled: true },
    propFields: TEXT_FIELD,
    events: [{ event: "actionPerformed", label: "Clique (actionPerformed)" }],
    isContainer: false,
  },
  {
    type: "JLabel",
    label: "Rótulo",
    group: "Básicos",
    description: "Texto fixo para identificar campos.",
    defaultWidth: 120,
    defaultHeight: 18,
    defaultProps: { text: "Rótulo" },
    propFields: TEXT_FIELD,
    events: [],
    isContainer: false,
  },
  {
    type: "JTextField",
    label: "Campo de texto",
    group: "Básicos",
    description: "Entrada de texto de uma linha.",
    defaultWidth: 180,
    defaultHeight: 26,
    defaultProps: { columns: 20, text: "", toolTipText: "", enabled: true },
    propFields: INPUT_FIELDS,
    events: [
      { event: "actionPerformed", label: "Enter (actionPerformed)" },
      { event: "focusLost", label: "Ao perder foco (focusLost)" },
    ],
    isContainer: false,
  },
  {
    type: "JPasswordField",
    label: "Campo de senha",
    group: "Básicos",
    description: "Entrada de senha com caracteres ocultos.",
    defaultWidth: 180,
    defaultHeight: 26,
    defaultProps: { columns: 16, toolTipText: "", enabled: true },
    propFields: INPUT_FIELDS,
    events: [
      { event: "actionPerformed", label: "Enter (actionPerformed)" },
      { event: "focusLost", label: "Ao perder foco (focusLost)" },
    ],
    isContainer: false,
  },
  {
    type: "JTextArea",
    label: "Área de texto",
    group: "Básicos",
    description: "Texto multilinha dentro de um JScrollPane.",
    defaultWidth: 220,
    defaultHeight: 100,
    defaultProps: { text: "", columns: 20, rows: 6, toolTipText: "", enabled: true },
    propFields: [
      { key: "text", label: "Texto", kind: "text" },
      { key: "rows", label: "Linhas", kind: "number" },
      { key: "toolTipText", label: "Dica (tooltip)", kind: "text" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [{ event: "focusLost", label: "Ao perder foco (focusLost)" }],
    isContainer: false,
  },
  {
    type: "JCheckBox",
    label: "Caixa de seleção",
    group: "Básicos",
    description: "Opção ligada/desligada.",
    defaultWidth: 140,
    defaultHeight: 24,
    defaultProps: { text: "Opção", selected: false, toolTipText: "", enabled: true },
    propFields: [
      { key: "text", label: "Texto", kind: "text" },
      { key: "selected", label: "Marcado", kind: "boolean" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [
      { event: "actionPerformed", label: "Alterado (actionPerformed)" },
      { event: "itemStateChanged", label: "Estado alterado (itemStateChanged)" },
    ],
    isContainer: false,
  },
  {
    type: "JRadioButton",
    label: "Botão de rádio",
    group: "Básicos",
    description: "Opção exclusiva dentro de um grupo.",
    defaultWidth: 140,
    defaultHeight: 24,
    defaultProps: { text: "Opção", selected: false, group: "grupo1", enabled: true },
    propFields: [
      { key: "text", label: "Texto", kind: "text" },
      { key: "selected", label: "Selecionado", kind: "boolean" },
      { key: "group", label: "Grupo", kind: "text" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [
      { event: "actionPerformed", label: "Alterado (actionPerformed)" },
      { event: "itemStateChanged", label: "Estado alterado (itemStateChanged)" },
    ],
    isContainer: false,
  },
  {
    type: "JComboBox",
    label: "Caixa de combinação",
    group: "Básicos",
    description: "Lista suspensa de opções.",
    defaultWidth: 160,
    defaultHeight: 26,
    defaultProps: { items: "Um, Dois, Três", selectedIndex: 0, enabled: true },
    propFields: [
      { key: "items", label: "Itens (separados por vírgula)", kind: "csv" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [{ event: "itemStateChanged", label: "Seleção alterada (itemStateChanged)" }],
    isContainer: false,
  },
  {
    type: "JTable",
    label: "Tabela",
    group: "Dados",
    description: "Exibe registros do banco SQLite.",
    defaultWidth: 380,
    defaultHeight: 170,
    defaultProps: { columns: "", toolTipText: "", enabled: true },
    propFields: [
      { key: "toolTipText", label: "Dica (tooltip)", kind: "text" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: false,
  },
  {
    type: "JList",
    label: "Lista",
    group: "Dados",
    description: "Lista de itens dentro de um JScrollPane.",
    defaultWidth: 200,
    defaultHeight: 140,
    defaultProps: { items: "Um, Dois, Três", enabled: true },
    propFields: [
      { key: "items", label: "Itens (separados por vírgula)", kind: "csv" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: false,
  },
  {
    type: "JPanel",
    label: "Painel",
    group: "Contêineres",
    description: "Agrupa componentes dentro de uma área.",
    defaultWidth: 260,
    defaultHeight: 170,
    defaultProps: { title: "", enabled: true },
    propFields: [
      { key: "title", label: "Título (borda)", kind: "text" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: true,
  },
  {
    type: "JScrollPane",
    label: "Painel de rolagem",
    group: "Contêineres",
    description: "Área rolável para agrupar componentes.",
    defaultWidth: 260,
    defaultHeight: 170,
    defaultProps: { enabled: true },
    propFields: [{ key: "enabled", label: "Habilitado", kind: "boolean" }],
    events: [],
    isContainer: true,
  },
  {
    type: "JProgressBar",
    label: "Barra de progresso",
    group: "Exibição",
    description: "Indicador visual de progresso.",
    defaultWidth: 200,
    defaultHeight: 20,
    defaultProps: { value: 40, min: 0, max: 100, enabled: true },
    propFields: [
      { key: "value", label: "Valor", kind: "number" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: false,
  },
  {
    type: "JSpinner",
    label: "Girar valor",
    group: "Exibição",
    description: "Campo numérico com setas.",
    defaultWidth: 70,
    defaultHeight: 26,
    defaultProps: { value: 1, enabled: true },
    propFields: [
      { key: "value", label: "Valor", kind: "number" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: false,
  },
  {
    type: "JToggleButton",
    label: "Botão liga/desliga",
    group: "Básicos",
    description: "Botão que fica pressionado quando ativado.",
    defaultWidth: 130,
    defaultHeight: 30,
    defaultProps: { text: "Opção", selected: false, toolTipText: "", enabled: true },
    propFields: [
      { key: "text", label: "Texto", kind: "text" },
      { key: "selected", label: "Pressionado", kind: "boolean" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [
      { event: "actionPerformed", label: "Alterado (actionPerformed)" },
      { event: "itemStateChanged", label: "Estado alterado (itemStateChanged)" },
    ],
    isContainer: false,
  },
  {
    type: "JSeparator",
    label: "Separador",
    group: "Exibição",
    description: "Linha que separa áreas da tela.",
    defaultWidth: 200,
    defaultHeight: 8,
    defaultProps: { orientation: "horizontal", enabled: true },
    propFields: [
      {
        key: "orientation",
        label: "Orientação",
        kind: "text",
      },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: false,
  },
  {
    type: "JSlider",
    label: "Deslizador",
    group: "Exibição",
    description: "Seleção de valor arrastando.",
    defaultWidth: 200,
    defaultHeight: 24,
    defaultProps: { min: 0, max: 100, value: 50, enabled: true },
    propFields: [
      { key: "min", label: "Mínimo", kind: "number" },
      { key: "max", label: "Máximo", kind: "number" },
      { key: "value", label: "Valor", kind: "number" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [{ event: "stateChanged", label: "Valor alterado (stateChanged)" }],
    isContainer: false,
  },
  {
    type: "JScrollBar",
    label: "Barra de rolagem",
    group: "Exibição",
    description: "Barra de rolagem independente.",
    defaultWidth: 160,
    defaultHeight: 18,
    defaultProps: { min: 0, max: 100, enabled: true },
    propFields: [
      { key: "min", label: "Mínimo", kind: "number" },
      { key: "max", label: "Máximo", kind: "number" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: false,
  },
  {
    type: "JTextPane",
    label: "Painel de texto",
    group: "Básicos",
    description: "Texto formatado dentro de um JScrollPane.",
    defaultWidth: 240,
    defaultHeight: 110,
    defaultProps: { text: "", enabled: true },
    propFields: [
      { key: "text", label: "Texto", kind: "text" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: false,
  },
  {
    type: "JEditorPane",
    label: "Editor de texto",
    group: "Básicos",
    description: "Área de texto rica dentro de um JScrollPane.",
    defaultWidth: 260,
    defaultHeight: 130,
    defaultProps: { text: "", enabled: true },
    propFields: [
      { key: "text", label: "Texto", kind: "text" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: false,
  },
  {
    type: "JToolBar",
    label: "Barra de ferramentas",
    group: "Contêineres",
    description: "Faixa que agrupa botões em linha.",
    defaultWidth: 420,
    defaultHeight: 40,
    defaultProps: { enabled: true },
    propFields: [{ key: "enabled", label: "Habilitado", kind: "boolean" }],
    events: [],
    isContainer: true,
  },
  {
    type: "JTree",
    label: "Árvore",
    group: "Dados",
    description: "Estrutura em árvore com itens expansíveis.",
    defaultWidth: 240,
    defaultHeight: 180,
    defaultProps: { root: "Raiz", enabled: true },
    propFields: [
      { key: "root", label: "Item raiz", kind: "text" },
      { key: "enabled", label: "Habilitado", kind: "boolean" },
    ],
    events: [],
    isContainer: false,
  },
];

export const COMPONENT_GROUPS = ["Básicos", "Dados", "Contêineres", "Exibição"];

export function catalogOf(type: ComponentType): CatalogEntry {
  const entry = CATALOG.find((c) => c.type === type);
  if (!entry) throw new Error(`Tipo desconhecido: ${type}`);
  return entry;
}

export function defaultPropsFor(type: ComponentType): Record<string, string | number | boolean> {
  return { ...catalogOf(type).defaultProps };
}

export function makeComponentId(type: ComponentType, existing: ComponentSpec[]): string {
  const base: Record<ComponentType, string> = {
    JLabel: "lbl",
    JButton: "btn",
    JTextField: "txt",
    JPasswordField: "pwd",
    JTextArea: "txtArea",
    JCheckBox: "chk",
    JRadioButton: "rdo",
    JComboBox: "cmb",
    JList: "lst",
    JTable: "tbl",
    JPanel: "pnl",
    JScrollPane: "scroll",
    JProgressBar: "progress",
    JSpinner: "spn",
    JToggleButton: "tgl",
    JSeparator: "sep",
    JSlider: "sld",
    JScrollBar: "scrollBar",
    JTextPane: "txtPane",
    JEditorPane: "editor",
    JToolBar: "barra",
    JTree: "arvore",
  } as Record<ComponentType, string>;
  let n = 1;
  let candidate = `${base[type]}${n}`;
  const taken = new Set(existing.map((c) => c.id));
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${base[type]}${n}`;
  }
  return candidate;
}
