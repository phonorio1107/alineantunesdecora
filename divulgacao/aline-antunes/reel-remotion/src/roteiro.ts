// Roteiro e tempos do Reels (em segundos). Mesmo ritmo do reels.mp4: 2,6 s por tela.
// As telas são da prévia do sistema, com dados fictícios.
export const FPS = 30;
export const DURACAO = 25;

export const COR = {
  tinta: "#0E0E10",
  apagado: "#5A5A62",
  linha: "#E6E6E8",
  marinho: "#0B1F3A",
  rosaCliente: "#DA6F9A",
} as const;

export const FRASES = ["Ela faz festas incríveis.", "As contas viviam num caderno."];

// anel = [x, y, largura, altura] em pixels CSS da tela de 390 px (medido na prévia)
export type Cena = { tela: string; legenda: string; anel?: [number, number, number, number] };

export const INICIO_CENAS = 6.0;
export const POR_CENA = 2.6;

export const CENAS: Cena[] = [
  { tela: "telas/1-entrar.png", legenda: "Então criamos um sistema só dela." },
  { tela: "telas/2-inicio.png", legenda: "O próximo evento, sempre à vista." },
  { tela: "telas/4-orcamento.png", legenda: "Do orçamento ao contrato, num toque.", anel: [132, 318, 175, 44] },
  { tela: "telas/5-estoque.png", legenda: "Cada peça com código e valor.", anel: [16, 260, 173, 135] },
  { tela: "telas/6-evento.png", legenda: "O lucro de cada evento, já calculado.", anel: [201, 656, 173, 114] },
  { tela: "telas/7-agenda.png", legenda: "Agenda junto com o Google." },
];

export const FIM_CENAS = INICIO_CENAS + CENAS.length * POR_CENA; // 21,6 s
