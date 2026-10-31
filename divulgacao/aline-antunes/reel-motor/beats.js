// VSL sem rosto · "Sistema da Aline Antunes Decora" (36,6 s) · câmera = prévia do sistema no celular (dados fictícios)
// A "fala" é o roteiro em legenda (sem voz): as palavras têm o tempo do roteiro, e cada peça entra na palavra.
// Pele: marca Pedro Hoffman (Degrau). Sem rosto, a regra R1 vira "não cobrir o que a tela do sistema está mostrando".
const A = (p, n = 1, after = 0) => K.at(p, n, after);
const SPLIT_TOP = 240;
const CHEST = 1250;
// Sem rosto, a legenda passa por cima da tela clara do sistema: ganha uma tarja escura para ser lida.
document.head.insertAdjacentHTML("beforeend", "<style>.mcap{background:rgba(14,14,16,.82);padding:12px 26px 16px;border-radius:18px;text-shadow:none;-webkit-text-stroke:0}.cam .rec,.cam .tc,.cam .lb{background:rgba(14,14,16,.82);padding:10px 16px;border-radius:10px;color:#fff}.cam .cb{border-color:rgba(14,14,16,.75)!important}</style>");

// 1) GANCHO "A Aline decora festas há mais de dez anos" — HUD de filmadora sobre a tela do sistema → glitch
const tG = A("e controlava") - 0.05;
K.camcorder(0, tG, { label: "CASO REAL · ALINE ANTUNES DECORA" });
K.glitch(tG);

// 2) "E controlava tudo num caderno." — punch + lettering
K.punch(tG + 0.1, 1.12);
K.stack([
  { text: "tudo num", t: A("tudo num"), style: "blur" },
  { text: "caderno", t: A("caderno"), style: "glow" },
], { top: 1150, until: A("orçamento") - 0.12 });
K.hideMouth(tG, A("orçamento") - 0.1);

// 3) "Orçamento num lugar, contrato em outro, peça que ninguém sabia se voltou." — SPLIT: tudo espalhado
const t3 = A("orçamento") - 0.1;
K.layout("split", t3);
K.hideMouth(t3 - 0.05, t3 + 0.5);
K.section({ kicker: "Antes do sistema", title: "Cada coisa num canto", acc: [3] }, t3 + 0.1, { y: SPLIT_TOP, until: A("então eu") - 0.15 });
const LIN = "display:flex;justify-content:space-between;align-items:center;padding:22px 0;border-bottom:1px solid rgba(255,255,255,.12);font:700 40px/1 var(--fS)";
const RUIM = "color:#ff9a7a;font:600 28px/1 var(--fS)";
K.panel(`
  <div style="position:absolute;left:40px;right:40px;top:30px">
    <div class="r1" style="${LIN}"><span>Orçamento</span><span style="${RUIM}">num lugar</span></div>
    <div class="r2" style="${LIN}"><span>Contrato</span><span style="${RUIM}">em outro</span></div>
    <div class="r3" style="${LIN};border:0"><span>Peças da festa</span><span style="${RUIM}">voltou?</span></div>
  </div>`, A("orçamento") - 0.05, {
  box: { x: 90, y: 420, w: 900, h: 300 },
  steps: [
    { sel: ".r1", t: A("orçamento") },
    { sel: ".r2", t: A("contrato em") },
    { sel: ".r3", t: A("peça que"), sfx: "ding" },
  ],
  until: A("então eu") - 0.15,
});

// 4) "Então eu montei um sistema do jeito dela." — volta para FULL com light leak + lettering
K.leak(A("então eu") - 0.15, 0.55);
K.layout("full", A("então eu") - 0.1);
K.punch(A("um sistema"), 1.12);
K.stack([
  { text: "um sistema", t: A("um sistema"), style: "blur" },
  { text: "do jeito dela", t: A("do jeito"), style: "glow" },
], { top: 1150, until: A("ela monta") - 0.1 });
K.hideMouth(A("então eu") - 0.1, A("ela monta") - 0.1);

// 5) "Ela monta o orçamento com peças e serviços." — a tela do orçamento num card em pé + as duas listas no peito
const t5 = A("ela monta") - 0.1;
K.layout("card916", t5);
K.hideMouth(t5 - 0.05, A("fechou?") - 0.1);
K.kickerTop("Orçamento", t5 + 0.15, { y: 240, until: A("fechou?") - 0.12 });
K.pill("Peças", A("peças"), { y: 1330, icon: "layers", up: true, until: A("fechou?") - 0.12 });
K.pill("Serviços", A("serviços"), { y: 1440, icon: "check", up: true, until: A("fechou?") - 0.12 });

// 6) "Fechou? Vira contrato, com as parcelas previstas." — SPLIT: orçamento → contrato → evento
const t6 = A("fechou?") - 0.1;
K.layout("split", t6);
K.section({ kicker: "Fechou?", title: "Vira contrato", acc: [1] }, t6 + 0.1, { y: SPLIT_TOP, until: A("cada peça") - 0.15 });
K.flow([
  { label: "Orçamento", icon: "chat", t: A("fechou?") + 0.15 },
  { label: "Contrato", icon: "check", sub: "PDF pronto", t: A("vira contrato") },
  { label: "Parcelas", icon: "money", sub: "entrada e saldo", t: A("parcelas"), progress: 0.6 },
], { box: { x: 90, y: 440, w: 900, h: 330 }, until: A("cada peça") - 0.15 });

// 7) "Cada peça tem código, e o estoque baixa sozinho." — tela cheia do estoque + pílulas no peito
K.leak(A("cada peça") - 0.15, 0.5);
K.layout("full", A("cada peça") - 0.1);
K.punch(A("cada peça"), 1.06);
K.pill("Cada peça com código", A("código"), { y: CHEST + 80, icon: "grid", up: true, until: A("depois da") - 0.1 });
K.pill("Estoque baixa sozinho", A("sozinho"), { y: CHEST + 190, icon: "bolt", kind: "solid", up: true, until: A("depois da") - 0.1 });
K.hideMouth(A("código") - 0.05, A("depois da") - 0.05);

// 8) "Depois da festa, ela confere o que voltou." — SPLIT: conferência da devolução
const t8 = A("depois da") - 0.1;
K.layout("split", t8);
K.section({ kicker: "Depois da festa", title: "Conferência das peças", acc: [2] }, t8 + 0.1, { y: SPLIT_TOP, until: A("e vê") - 0.15 });
const OK = "color:#7fd8a2;font:700 30px/1 var(--fS)";
K.panel(`
  <div style="position:absolute;left:40px;right:40px;top:30px">
    <div class="c1" style="${LIN}"><span>Painel redondo</span><span style="${OK}">voltou</span></div>
    <div class="c2" style="${LIN}"><span>Mesas e boleiras</span><span style="${OK}">voltaram</span></div>
    <div class="c3" style="${LIN};border:0"><span>1 bandeja</span><span style="${RUIM}">não voltou · sai do estoque</span></div>
  </div>`, A("confere") - 0.1, {
  box: { x: 90, y: 420, w: 900, h: 300 },
  steps: [
    { sel: ".c1", t: A("confere") },
    { sel: ".c2", t: A("o que") },
    { sel: ".c3", t: A("voltou.", 1, A("depois da")), sfx: "ding" },
  ],
  until: A("e vê") - 0.15,
});

// 9) "E vê o lucro de cada evento na hora." — tela cheia nos números do evento + carimbo no peito
K.leak(A("e vê") - 0.15, 0.5);
K.layout("full", A("e vê") - 0.1);
K.punch(A("lucro"), 1.1);
K.stamp("LUCRO NA HORA ✓", A("na hora"), { x: 300, y: 1290, rot: -6, until: A("tudo no") - 0.1 });
K.hideMouth(A("lucro") - 0.05, A("tudo no") - 0.05);

// 10) "Tudo no celular." — a tela do sistema em pé, como no celular
K.layout("card916", A("tudo no") - 0.1);
K.stack([
  { text: "tudo no", t: A("tudo no"), style: "blur", },
  { text: "celular", t: A("celular"), style: "glow" },
], { top: 1310, size: 84, gap: 94, until: A("a sua") - 0.1 });
K.hideMouth(A("tudo no") - 0.15, A("a sua") - 0.1);

// 11) "A sua rotina também vive no caderno? Me manda DOR no direct." — fecho no fundo escuro da marca
const t11 = A("a sua") - 0.1;
K.layout("hidden", t11);
K.hideMouth(t11 - 0.05, 36.7);
K.kickerTop("Sua rotina, um degrau acima", t11 + 0.2, { y: 520, size: 24 });
K.stack([
  { text: "sua rotina", t: A("rotina"), style: "blur" },
  { text: "vive no", t: A("vive no"), style: "letters" },
  { text: "caderno?", t: A("caderno?"), style: "glow" },
], { top: 680, size: 96, gap: 112 });
K.cta("Manda DOR no direct", A("me manda"), { y: 1120, w: 820, clickAt: 1.1 });
K.pill("Pedro Hoffman · sistemas sob medida", A("direct.") + 0.2, { y: 1420, icon: "spark", sm: true, sfx: false });

// legenda (sem rosto: fica fixa no terço de baixo; some em SPLIT, no card e nos letterings)
K.mouthCaps({ accent: ["Aline", "festas", "caderno", "orçamento", "contrato", "sistema", "peças", "serviços", "Fechou?", "parcelas",
  "código", "estoque", "sozinho", "festa", "confere", "lucro", "evento", "celular", "rotina", "DOR"] });
