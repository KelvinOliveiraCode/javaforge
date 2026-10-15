import { describe, it, expect } from "vitest";
import { filterCatalog } from "./catalogFilter";
import { CATALOG } from "../catalog";

describe("filterCatalog", () => {
  it("devolve o catalogo inteiro quando o termo e vazio", () => {
    expect(filterCatalog("")).toHaveLength(CATALOG.length);
    expect(filterCatalog("   ")).toHaveLength(CATALOG.length);
  });

  it("acha por rotulo, ignorando maiusculas e acentos", () => {
    const r = filterCatalog("botao");
    expect(r.length).toBeGreaterThan(0);
    expect(r.map((c) => c.type)).toContain("JButton");
  });

  it("acha pelo nome da classe Java", () => {
    const r = filterCatalog("jpasswordfield");
    expect(r.map((c) => c.type)).toContain("JPasswordField");
  });

  it("acha por grupo", () => {
    const r = filterCatalog("dados");
    expect(r.length).toBeGreaterThan(0);
    for (const c of r) {
      expect(
        [c.label, c.group, c.type, c.description].some((x) => x.toLowerCase().includes("dados")),
      ).toBe(true);
    }
  });

  it("devolve vazio sem erro quando nada casa", () => {
    expect(filterCatalog("zzzz-inexistente")).toEqual([]);
  });

  it("faz substring, nao só o começo", () => {
    const r = filterCatalog("table");
    expect(r.length).toBeGreaterThan(0);
  });
});
