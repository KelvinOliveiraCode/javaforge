// Tema Visual Studio Code (Dark+) para o editor.
// Cores canônicas do VS Code: fundo #1e1e1e, texto #d4d4d4, palavras-chave #569cd6,
// strings #ce9178, números #b5cea8, comentários #6a9955, funções #dcdcaa, tipos #4ec9b0.
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const base = "#1e1e1e";
const fg = "#d4d4d4";
const lineNumber = "#858585";

const vscodeTheme = EditorView.theme(
  {
    "&": {
      color: fg,
      backgroundColor: base,
      fontSize: "13px",
    },
    ".cm-content": {
      caretColor: "#aeafad",
      fontFamily: '"Cascadia Code", "Cascadia Mono", Consolas, "Courier New", monospace',
      lineHeight: "1.5",
      padding: "8px 0",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#aeafad" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "#264f78" },
    ".cm-panels": { backgroundColor: "#252526", color: fg },
    ".cm-panels.cm-panels-top": { borderBottom: "1px solid #1b1b1b" },
    ".cm-searchMatch": {
      backgroundColor: "#613214",
      outline: "1px solid #9e6a03",
    },
    "&.cm-focused .cm-activeLine": { backgroundColor: "#ffffff0d" },
    "&.cm-focused .cm-activeLineGutter": { backgroundColor: "#2a2a2a", color: fg },
    ".cm-selectionMatch": { backgroundColor: "#3a3d41" },
    ".cm-gutters": {
      backgroundColor: base,
      color: lineNumber,
      border: "none",
      borderRight: "1px solid #1b1b1b",
    },
    ".cm-activeLineGutter": { backgroundColor: "#2a2a2a", color: fg },
    ".cm-foldPlaceholder": {
      backgroundColor: "#252526",
      border: "1px solid #454545",
      color: "#cccccc",
    },
    ".cm-tooltip": {
      backgroundColor: "#252526",
      border: "1px solid #454545",
      borderRadius: "2px",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "#3a3d41",
      outline: "1px solid #888888",
    },
  },
  { dark: true },
);

const vscodeHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "#569cd6" },
  { tag: t.controlKeyword, color: "#C586C0" },
  { tag: t.operatorKeyword, color: "#569cd6" },
  { tag: t.definitionKeyword, color: "#569cd6" },
  { tag: t.moduleKeyword, color: "#C586C0" },
  { tag: t.string, color: "#ce9178" },
  { tag: t.special(t.string), color: "#ce9178" },
  { tag: t.number, color: "#b5cea8" },
  { tag: t.integer, color: "#b5cea8" },
  { tag: t.float, color: "#b5cea8" },
  { tag: t.bool, color: "#569cd6" },
  { tag: t.null, color: "#569cd6" },
  { tag: t.comment, color: "#6a9955", fontStyle: "italic" },
  { tag: t.lineComment, color: "#6a9955", fontStyle: "italic" },
  { tag: t.blockComment, color: "#6a9955", fontStyle: "italic" },
  { tag: t.docComment, color: "#6a9955", fontStyle: "italic" },
  { tag: t.typeName, color: "#4ec9b0" },
  { tag: t.className, color: "#4ec9b0" },
  { tag: t.definition(t.variableName), color: "#9cdcfe" },
  { tag: t.tagName, color: "#569cd6" },
  { tag: t.attributeName, color: "#9cdcfe" },
  { tag: t.attributeValue, color: "#ce9178" },
  { tag: t.function(t.variableName), color: "#dcdcaa" },
  { tag: t.function(t.propertyName), color: "#dcdcaa" },
  { tag: t.definition(t.function(t.variableName)), color: "#dcdcaa" },
  { tag: t.propertyName, color: "#9cdcfe" },
  { tag: t.definition(t.propertyName), color: "#9cdcfe" },
  { tag: t.variableName, color: "#9cdcfe" },
  { tag: t.definition(t.variableName), color: "#9cdcfe" },
  { tag: t.local(t.variableName), color: "#9cdcfe" },
  { tag: t.constant(t.variableName), color: "#4fc1ff" },
  { tag: t.standard(t.variableName), color: "#9cdcfe" },
  { tag: t.operator, color: "#d4d4d4" },
  { tag: t.punctuation, color: "#d4d4d4" },
  { tag: t.separator, color: "#d4d4d4" },
  { tag: t.bracket, color: "#ffd700" },
  { tag: t.paren, color: "#ffd700" },
  { tag: t.squareBracket, color: "#ffd700" },
  { tag: t.brace, color: "#ffd700" },
  { tag: t.angleBracket, color: "#ffd700" },
  { tag: t.self, color: "#569cd6" },
  { tag: t.labelName, color: "#c8c8c8" },
  { tag: t.atom, color: "#569cd6" },
  { tag: t.unit, color: "#b5cea8" },
  { tag: t.meta, color: "#9cdcfe" },
  { tag: t.escape, color: "#d7ba7d" },
  { tag: t.invalid, color: "#f44747", textDecoration: "underline wavy" },
  { tag: t.link, color: "#3794ff", textDecoration: "underline" },
  { tag: t.heading, color: "#569cd6", fontWeight: "bold" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
]);

export const vscodeDark: Extension[] = [
  vscodeTheme,
  syntaxHighlighting(vscodeHighlightStyle),
];
