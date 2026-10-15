import { CATALOG, type CatalogEntry } from "../catalog";

/**
 * Remove acentos e deixa minusculo. Sem isso, buscar "botao" nao acha
 * "Botao"/"Botão" — e ninguem digita acento no teclado por curiosidade.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Filtro da paleta de componentes.
 *
 * Casa por substring sobre rotulo, grupo, nome da classe Java e descricao.
 * Busca por "jbut" acha o botao mesmo sem acento na digitacao, que e o jeito
 * que a pessoa procura.
 *
 * Texto vazio devolve o catalogo inteiro: limpar a busca tem que mostrar tudo
 * de novo, nunca uma lista vazia sem explicacao.
 */
export function filterCatalog(termo: string, base: CatalogEntry[] = CATALOG): CatalogEntry[] {
  const t = normalizar(termo.trim());
  if (!t) return base;
  return base.filter((c) =>
    normalizar(`${c.label} ${c.group} ${c.type} ${c.description}`).includes(t),
  );
}
