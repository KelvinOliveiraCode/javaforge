import { allComponents, windowIds, menuItems } from "../model-ops";
import type { AppModel } from "../types";

export interface CompletionItem {
  label: string;
  type: "component" | "table" | "column" | "connection" | "window" | "menuItem" | "keyword";
  detail?: string;
  boost?: number;
}

export function getModelCompletions(model: AppModel): CompletionItem[] {
  const items: CompletionItem[] = [];

  // Component IDs
  for (const { component, window } of allComponents(model)) {
    items.push({
      label: component.id,
      type: "component",
      detail: `${component.type} em ${window.title}`,
      boost: 10,
    });
  }

  // Window IDs
  for (const w of model.windows) {
    items.push({
      label: w.id,
      type: "window",
      detail: `Janela: ${w.title}`,
      boost: 8,
    });
  }

  // Table names
  for (const table of model.database.tables) {
    items.push({
      label: table.name,
      type: "table",
      detail: `Tabela: ${table.columns.length} colunas`,
      boost: 9,
    });
    // Column names
    for (const col of table.columns) {
      items.push({
        label: `${table.name}.${col.name}`,
        type: "column",
        detail: `${col.type}${col.pk ? " (PK)" : ""}${col.notNull ? " NOT NULL" : ""}`,
        boost: 7,
      });
    }
  }

  // Connection names
  for (const conn of model.connections) {
    items.push({
      label: conn.name,
      type: "connection",
      detail: `${conn.kind} · ${conn.event}`,
      boost: 6,
    });
  }

  // Menu item IDs
  for (const { item, windowId, menuId } of menuItems(model)) {
    items.push({
      label: item.id,
      type: "menuItem",
      detail: `Item de menu em ${windowId} > ${menuId}`,
      boost: 5,
    });
  }

  return items;
}

export function getJavaKeywords(): CompletionItem[] {
  const keywords = [
    "public", "private", "protected", "static", "final", "void", "class", "interface",
    "extends", "implements", "new", "return", "if", "else", "for", "while", "switch",
    "case", "default", "break", "continue", "try", "catch", "finally", "throw", "throws",
    "import", "package", "this", "super", "null", "true", "false", "String", "int",
    "long", "double", "boolean", "List", "Map", "Set", "ArrayList", "HashMap", "HashSet",
    "JButton", "JLabel", "JTextField", "JPanel", "JFrame", "JDialog", "JOptionPane",
    "ActionListener", "ActionEvent", "ResultSet", "PreparedStatement", "Connection",
    "DriverManager", "SQLException", "Logger", "Level",
  ];
  return keywords.map((k) => ({ label: k, type: "keyword" as const, boost: 1 }));
}