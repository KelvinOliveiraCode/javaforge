import type { ComponentType, ConnectionKind } from "./types";

/** Documentação de uso de cada tipo de componente. */
export interface ComponentDoc {
  type: ComponentType;
  what: string;
  when: string;
  events: string;
  connections: string;
  props: string;
}

export const COMPONENT_DOCS: ComponentDoc[] = [
  {
    type: "JButton",
    what: "Botão clicável. É o elemento que dispara ações.",
    when: "Salvar, entrar, excluir, pesquisar, abrir outra tela.",
    events: "Clique (actionPerformed).",
    connections: "Todas. É o parceiro natural de qualquer conexão.",
    props: "Texto, habilitado, dica.",
  },
  {
    type: "JLabel",
    what: "Texto fixo, só exibe informação.",
    when: "Títulos, nomes de campos, resultados de consulta.",
    events: "Nenhum.",
    connections: "Nenhuma disparada por ele, mas pode ser destino de consulta (receber texto do banco).",
    props: "Texto, habilitado, dica.",
  },
  {
    type: "JTextField",
    what: "Campo de texto de uma linha.",
    when: "Nome, e-mail, código, valor, filtro de busca.",
    events: "Enter (actionPerformed) e perda de foco (focusLost).",
    connections: "Enter pode pesquisar no banco; o valor alimenta inserções, atualizações e filtros.",
    props: "Colunas (largura), habilitado, dica.",
  },
  {
    type: "JPasswordField",
    what: "Campo de senha, mostra bolinhas.",
    when: "Senha de login, confirmação de senha.",
    events: "Enter (actionPerformed) e perda de foco (focusLost).",
    connections: "Alimenta a conexão de login (segundo campo).",
    props: "Colunas, habilitado, dica.",
  },
  {
    type: "JTextArea",
    what: "Texto de várias linhas com rolagem.",
    when: "Observações, descrições, endereço.",
    events: "Perda de foco (focusLost).",
    connections: "Alimenta gravação de textos longos no banco.",
    props: "Texto, linhas, habilitado.",
  },
  {
    type: "JCheckBox",
    what: "Caixa de marcação (liga/desliga).",
    when: "Aceitar termos, ativo/inativo, opções independentes.",
    events: "Alterado (actionPerformed) e estado alterado (itemStateChanged).",
    connections: "Gravar SIM/NÃO no banco, habilitar campos, filtrar.",
    props: "Texto, marcado, habilitado.",
  },
  {
    type: "JRadioButton",
    what: "Opção exclusiva dentro de um grupo.",
    when: "Escolher entre poucas opções (sim/não, tipo de conta).",
    events: "Alterado (actionPerformed) e estado alterado (itemStateChanged).",
    connections: "Gravar a opção escolhida, filtrar consulta.",
    props: "Texto, selecionado, grupo (iguais = exclusivos).",
  },
  {
    type: "JComboBox",
    what: "Lista suspensa de opções.",
    when: "Estado, categoria, tipo: poucas opções fixas.",
    events: "Seleção alterada (itemStateChanged).",
    connections: "O valor escolhido pode ir para o banco ou filtrar uma consulta.",
    props: "Itens (separados por vírgula), habilitado.",
  },
  {
    type: "JList",
    what: "Lista de itens com rolagem.",
    when: "Mostrar vários itens de uma vez.",
    events: "Nenhum direto.",
    connections: "Exibe dados; use consultas para preenchê-la indiretamente via campo.",
    props: "Itens, habilitado.",
  },
  {
    type: "JTable",
    what: "Tabela com linhas e colunas.",
    when: "Listar registros do banco (produtos, clientes, pedidos).",
    events: "Nenhum direto.",
    connections: "É o destino natural da conexão 'consultar e preencher'.",
    props: "Dica, habilitado.",
  },
  {
    type: "JPanel",
    what: "Área que agrupa componentes.",
    when: "Organizar formulários em blocos (dados, endereço, ações).",
    events: "Nenhum.",
    connections: "Nenhuma. Serve de contêiner: solte componentes dentro dele.",
    props: "Título (borda), habilitado.",
  },
  {
    type: "JScrollPane",
    what: "Área com rolagem para agrupar componentes.",
    when: "Áreas com muito conteúdo.",
    events: "Nenhum.",
    connections: "Nenhuma. Contêiner.",
    props: "Habilitado.",
  },
  {
    type: "JProgressBar",
    what: "Barra visual de progresso.",
    when: "Mostrar andamento de uma operação.",
    events: "Nenhum.",
    connections: "Visual apenas.",
    props: "Valor, habilitado.",
  },
  {
    type: "JSpinner",
    what: "Campo numérico com setas.",
    when: "Quantidade, idade, valor inteiro.",
    events: "Nenhum direto.",
    connections: "O valor pode ser gravado no banco (coluna numérica).",
    props: "Valor, habilitado.",
  },
  {
    type: "JToggleButton",
    what: "Botão que fica pressionado quando ligado.",
    when: "Ligar/desligar um modo (edição, favorito).",
    events: "Alterado, estado alterado.",
    connections: "Gravar estado no banco, alternar comportamento.",
    props: "Texto, pressionado, habilitado.",
  },
  {
    type: "JSeparator",
    what: "Linha divisória.",
    when: "Separar blocos de uma tela.",
    events: "Nenhum.",
    connections: "Nenhuma.",
    props: "Orientação (horizontal/vertical), habilitado.",
  },
  {
    type: "JSlider",
    what: "Seleção de valor arrastando.",
    when: "Volume, porcentagem, nota.",
    events: "Valor alterado (stateChanged).",
    connections: "Consultar filtrando pelo valor, gravar no banco.",
    props: "Mínimo, máximo, valor, habilitado.",
  },
  {
    type: "JScrollBar",
    what: "Barra de rolagem independente.",
    when: "Navegação em lista longa.",
    events: "Nenhum direto.",
    connections: "Visual.",
    props: "Mínimo, máximo, habilitado.",
  },
  {
    type: "JTextPane",
    what: "Texto formatado com rolagem.",
    when: "Texto com estilo, avisos longos.",
    events: "Nenhum.",
    connections: "Exibição.",
    props: "Texto, habilitado.",
  },
  {
    type: "JEditorPane",
    what: "Área de texto rica com rolagem.",
    when: "Texto grande editável.",
    events: "Nenhum.",
    connections: "Exibição.",
    props: "Texto, habilitado.",
  },
  {
    type: "JToolBar",
    what: "Faixa de botões em linha.",
    when: "Ações principais no topo (novo, salvar, excluir).",
    events: "Nenhum.",
    connections: "Contêiner: solte botões dentro.",
    props: "Habilitado.",
  },
  {
    type: "JTree",
    what: "Estrutura em árvore.",
    when: "Categorias, pastas, hierarquia.",
    events: "Nenhum direto.",
    connections: "Exibição.",
    props: "Item raiz, habilitado.",
  },
];

/** Documentação de cada tipo de conexão. */
export interface ConnectionDoc {
  kind: ConnectionKind;
  name: string;
  what: string;
  needs: string;
  example: string;
}

export const CONNECTION_DOCS: ConnectionDoc[] = [
  {
    kind: "authenticate",
    name: "Verificar login",
    what: "Compara usuário e senha digitados com a tabela do banco.",
    needs: "Tabela com colunas de usuário e senha; dois campos de texto (usuário e senha).",
    example: "Tela de login: digita admin/1234, confere na tabela usuarios e abre o painel.",
  },
  {
    kind: "insert",
    name: "Inserir registro",
    what: "Grava os valores dos campos como uma nova linha.",
    needs: "Tabela, colunas e os campos que fornecem os valores.",
    example: "Botão Salvar grava nome e preço na tabela produtos.",
  },
  {
    kind: "update",
    name: "Atualizar registro",
    what: "Altera linhas existentes que batem com o filtro.",
    needs: "Tabela, campos para alterar e campos para localizar.",
    example: "Botão Atualizar muda o preço do produto com o código digitado.",
  },
  {
    kind: "delete",
    name: "Excluir registro",
    what: "Apaga linhas que batem com o filtro.",
    needs: "Tabela e campo para localizar.",
    example: "Botão Excluir apaga o produto do código digitado.",
  },
  {
    kind: "query",
    name: "Consultar e preencher",
    what: "Busca registros e mostra em uma tabela ou campo.",
    needs: "Tabela, colunas exibidas, destino (tabela ou campo) e filtros opcionais.",
    example: "Botão Pesquisar lista produtos cujo nome contém o texto digitado.",
  },
  {
    kind: "openWindow",
    name: "Abrir janela",
    what: "Abre outra tela do app.",
    needs: "Janela de destino (crie em '+ Janela').",
    example: "Botão Cadastrar abre a tela de cadastro.",
  },
  {
    kind: "message",
    name: "Mostrar mensagem",
    what: "Exibe um aviso na tela.",
    needs: "Texto, título e tipo (informação, aviso, erro).",
    example: "Botão Sobre mostra 'Versão 1.0'.",
  },
  {
    kind: "custom",
    name: "Código manual",
    what: "Roda o código Java que você escrever.",
    needs: "Nada. Você manda no código.",
    example: "Fechar o app: System.exit(0);",
  },
];

/** Ação rápida sugerida para um componente. */
export interface QuickAction {
  label: string;
  hint: string;
  /** Conexão pré-preenchida (patch aplicado ao criar a conexão). */
  build: (context: QuickContext) => Partial<import("./types").ConnectionSpec>;
}

export interface QuickContext {
  componentId: string;
  event: string;
  /** primeira tabela do modelo, se existir */
  table: string;
  tables: string[];
  columns: string[];
  windows: { id: string; title: string }[];
  mainWindowId: string;
}

const col = (context: QuickContext, index: number, fallback: string): string =>
  context.columns[index] ?? fallback;

export function quickActionsFor(type: ComponentType): QuickAction[] {
  const needsTable = (context: QuickContext) => context.tables[0] ?? "";

  const saveText: QuickAction = {
    label: "Gravar o texto no banco",
    hint: "Cria uma conexão que insere o valor deste campo em uma coluna.",
    build: (c) => ({
      kind: "insert",
      table: needsTable(c),
      params: [{ column: col(c, 0, "nome"), fromComponentId: c.componentId, role: "set", operator: "=" }],
      message: "Registro salvo com sucesso.",
      messageTitle: "Salvar",
    }),
  };

  const queryFill: QuickAction = {
    label: "Consultar o banco e preencher",
    hint: "Cria uma conexão que busca registros e preenche uma tabela.",
    build: (c) => ({
      kind: "query",
      table: needsTable(c),
      params: [{ column: col(c, 0, "nome"), fromComponentId: c.componentId, role: "where", operator: "LIKE" }],
      queryColumns: c.columns.slice(0, 3).map((name) => ({ column: name, header: name })),
    }),
  };

  const openOther: QuickAction = {
    label: "Abrir outra janela",
    hint: "Cria uma conexão que abre outra tela do app.",
    build: (c) => ({
      kind: "openWindow",
      openWindowId: c.windows.find((w) => w.id !== c.mainWindowId)?.id ?? c.mainWindowId,
    }),
  };

  const closeApp: QuickAction = {
    label: "Fechar o aplicativo",
    hint: "Cria uma conexão que encerra o programa.",
    build: () => ({
      kind: "custom",
      customCode: "System.exit(0);",
    }),
  };

  const message: QuickAction = {
    label: "Mostrar uma mensagem",
    hint: "Cria uma conexão que mostra um aviso.",
    build: () => ({
      kind: "message",
      message: "Operação concluída.",
      messageTitle: "Aviso",
      messageKind: "info",
    }),
  };

  const checkLogin: QuickAction = {
    label: "Verificar login (usuário e senha)",
    hint: "Confere os dois campos na tabela e abre a janela principal.",
    build: (c) => ({
      kind: "authenticate",
      table: needsTable(c),
      params: [
        { column: col(c, 0, "usuario"), fromComponentId: c.componentId, role: "where", operator: "=" },
        { column: col(c, 1, "senha"), fromComponentId: "", role: "where", operator: "=" },
      ],
      authSuccessWindowId: c.mainWindowId,
      closeCurrent: true,
      message: "Bem-vindo!",
      messageTitle: "Login",
    }),
  };

  const register: QuickAction = {
    label: "Cadastrar (criar conta no banco)",
    hint: "Insere os valores digitados como novo registro.",
    build: (c) => ({
      kind: "insert",
      table: needsTable(c),
      params: c.columns
        .filter((name) => !name.toLowerCase().includes("id"))
        .slice(0, 4)
        .map((name) => ({ column: name, fromComponentId: name === c.columns[0] ? c.componentId : "", role: "set" as const, operator: "=" as const })),
      message: "Conta criada com sucesso.",
      messageTitle: "Cadastro",
    }),
  };

  switch (type) {
    case "JButton":
    case "JToggleButton":
      return [openOther, closeApp, message, saveText, queryFill, register];
    case "JTextField":
      return [saveText, queryFill, message, register];
    case "JPasswordField":
      return [checkLogin, saveText];
    case "JTextArea":
      return [saveText, message];
    case "JComboBox":
      return [saveText, queryFill];
    case "JCheckBox":
    case "JRadioButton":
      return [saveText, message];
    case "JSlider":
      return [saveText, queryFill];
    case "JSpinner":
      return [saveText, queryFill];
    default:
      return [];
  }
}
