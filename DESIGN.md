# JavaForge — direção de design

Ferramenta de desenvolvimento para montar aplicativos Java (Swing) com banco
SQLite. Público: quem quer criar software completo sem escrever tudo na mão e
também quem quer mexer no código depois.

**Leitura:** IDE/ferramenta de desenvolvimento para usuários técnicos, linguagem
visual de ferramenta de código (escuro, denso, alto contraste), dial
ENERGY 2 / RHYTHM 1 / MOTION 1.

## Decisões (com a razão de cada uma)

- **Um único tema, escuro de alto contraste.** Definido pelo dono do produto.
  Ferramenta de desenvolvimento tem motivo legítimo para escuro: sessões longas,
  menos brilho, e o código gerado (tema VS Code) já vive no escuro. Sem
  alternância: um tema só, feito com cuidado.
- **Fundo quase preto azulado (#0a0c10) e superfícies escalonadas até #1a2029.**
  Separa o cromo da IDE do conteúdo sem competir com ele. Contraste do texto
  principal (~16:1) e do secundário (~8:1), acima do WCAG AA.
- **Um único acento: âmbar "forja" (#f5a524).** Identidade do produto (forja de
  apps) e sinal de ação primária. Cores semânticas ficam reservadas para
  execução: verde rodar, vermelho parar. Nada de gradientes, brilhos ou vidro.
- **Tipografia de código em Cascadia/Consolas.** Mesma família do VS Code no
  Windows: o código não "muda de casa" ao entrar no app. Interface em Segoe UI
  Variable, que acompanha o sistema.
- **Raio pequeno e bordas secas.** Ferramenta densa, não vitrine. Cantos de 3 a
  8 px, nada de pílulas.
- **Prévia das telas no estilo Swing (cinza claro, baixo relevo).** A área de
  design mostra como o app gerado vai parecer; o contraste claro/escuro separa
  "seu app" do "estúdio". A grade de 10 px e a alça de redimensionar mantêm o
  posicionamento previsível.
- **Editor de código com o tema VS Code Dark+.** Pedido do dono e referência
  familiar: fundo #1e1e1e, palavras-chave #569cd6, strings #ce9178, funções
  #dcdcaa. Arquivos gerados vêm com aviso e backup antes de sobrescrever.
- **Layout de bancada (NetBeans simplificado).** Arquivos e componentes à
  esquerda, tela no centro, propriedades/conexões/dados à direita, console
  embaixo. Tudo visível de uma vez, sem menus escondidos.
- **Sem elemento decorativo sem função.** Atalhos existem (F5 roda, Ctrl+S
  salva, Delete remove), todo botão tem ação, e estados vazios explicam o
  próximo passo.

## Acessibilidade

- Foco visível em todos os controles (contorno âmbar).
- Navegação por teclado nos controles da interface.
- Contraste verificado nas combinações principais de texto/fundo.
- Mensagens de erro do modelo aparecem no painel Problemas, com o componente
  relacionado selecionável.
