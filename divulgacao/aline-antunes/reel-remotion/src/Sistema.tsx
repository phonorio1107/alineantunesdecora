import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { CENAS, COR, FPS, INICIO_CENAS, POR_CENA, FIM_CENAS } from "./roteiro";
import { TEXTO, TITULO } from "./fontes";
import { entre } from "./tempo";
import { Simbolo } from "./Simbolo";

const LARGURA_TELA = 600; // tela do celular no vídeo
const ESCALA = LARGURA_TELA / 390; // telas capturadas a 390 px CSS

// O papel branco sobe, o celular entra e as telas da prévia trocam no ritmo da legenda.
export const Sistema: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const papel = entre(frame, 4.9, 5.9);
  const cabecalho = entre(frame, 5.7, 6.3) * (1 - entre(frame, FIM_CENAS - 0.8, FIM_CENAS - 0.3));
  const sobe = entre(frame, 5.6, 6.6);
  const desce = entre(frame, FIM_CENAS - 0.1, FIM_CENAS + 0.7);
  const atual = Math.min(CENAS.length - 1, Math.max(0, Math.floor((t - INICIO_CENAS) / POR_CENA)));
  const de = INICIO_CENAS + atual * POR_CENA;
  const ate = de + POR_CENA;
  const ultima = atual === CENAS.length - 1;
  const legIn = entre(frame, de, de + 0.45);
  const legOut = ultima ? entre(frame, FIM_CENAS - 0.9, FIM_CENAS - 0.5) : entre(frame, ate - 0.3, ate);
  const fim = entre(frame, FIM_CENAS + 0.4, FIM_CENAS + 1.2);

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff", translate: `0 ${(1 - papel) * 100}%` }}>
      {/* Cabeçalho: cliente à esquerda, marca à direita */}
      <div style={{ position: "absolute", left: 96, top: 150, display: "flex", alignItems: "center", gap: 16, font: `500 32px ${TEXTO}`, color: COR.apagado, opacity: cabecalho }}>
        <i style={{ width: 14, height: 14, borderRadius: "50%", background: COR.rosaCliente }} />
        Aline Antunes Decora
      </div>
      <div style={{ position: "absolute", right: 96, top: 146, display: "flex", alignItems: "center", gap: 12, font: `700 30px ${TITULO}`, letterSpacing: "-0.02em", color: COR.tinta, opacity: cabecalho }}>
        <Simbolo tamanho={34} />
        Pedro Hoffman
      </div>

      {/* Legenda da cena */}
      <div
        style={{
          position: "absolute", left: 96, right: 96, top: 250, font: `700 84px/1.04 ${TITULO}`, letterSpacing: "-0.04em", color: COR.tinta, textWrap: "balance",
          opacity: t < 5.8 ? 0 : legIn * (1 - legOut),
          translate: `0 ${(1 - legIn) * 30}px`,
        }}
      >
        {CENAS[atual].legenda}
      </div>

      {/* Celular */}
      <div
        style={{
          position: "absolute", left: 220, top: 600, width: LARGURA_TELA + 40, padding: 20, borderRadius: 92, background: COR.tinta,
          boxShadow: "0 80px 120px -50px rgba(14,14,16,.5)",
          translate: `0 ${(1 - sobe) * 900 + desce * 1500}px`,
          rotate: `${(1 - sobe) * 4}deg`,
        }}
      >
        <div style={{ position: "absolute", top: 38, left: "50%", width: 168, height: 48, marginLeft: -84, borderRadius: 999, background: COR.tinta, zIndex: 3 }} />
        <div style={{ position: "relative", borderRadius: 73, overflow: "hidden", aspectRatio: "1170 / 2532", background: "#fff" }}>
          {CENAS.map((c, i) => {
            const ci = INICIO_CENAS + i * POR_CENA;
            const entra = i === 0 ? 1 : entre(frame, ci - 0.15, ci + 0.35);
            const sai = i < CENAS.length - 1 ? entre(frame, ci + POR_CENA + 0.2, ci + POR_CENA + 0.5) : 0;
            const op = Math.max(0, entra - sai);
            if (op === 0) return null;
            return (
              <Img
                key={c.tela}
                src={staticFile(c.tela)}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: op, scale: 1 + 0.025 * entre(frame, ci, ci + POR_CENA) }}
              />
            );
          })}
          {CENAS.map((c, i) => {
            if (!c.anel) return null;
            const ci = INICIO_CENAS + i * POR_CENA;
            const k = entre(frame, ci + 0.5, ci + 0.9) * (1 - entre(frame, ci + POR_CENA - 0.3, ci + POR_CENA));
            if (k === 0) return null;
            const [x, y, w, h] = c.anel;
            const folga = 6;
            return (
              <div
                key={"anel" + i}
                style={{
                  position: "absolute", zIndex: 4, border: `5px solid ${COR.marinho}`,
                  left: (x - folga) * ESCALA, top: (y - folga) * ESCALA, width: (w + folga * 2) * ESCALA, height: (h + folga * 2) * ESCALA,
                  borderRadius: Math.min(28, ((h + folga * 2) * ESCALA) / 2),
                  opacity: k, scale: 1.15 - 0.15 * k,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Degraus: avançam com as cenas */}
      <div style={{ position: "absolute", left: 96, bottom: 96, display: "flex", alignItems: "flex-end", gap: 6, opacity: cabecalho }}>
        {CENAS.map((_, i) => (
          <i key={i} style={{ width: 14, height: 12 + (i + 1) * 7, borderRadius: "4px 4px 1px 1px", background: i < atual ? COR.tinta : i === atual ? COR.marinho : COR.linha }} />
        ))}
      </div>

      {/* Fim: a marca */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, textAlign: "center", opacity: fim, translate: `0 ${(1 - fim) * 40}px` }}>
        <Simbolo tamanho={200} />
        <div style={{ font: `700 104px/1 ${TITULO}`, letterSpacing: "-0.045em", color: COR.tinta }}>Pedro Hoffman</div>
        <div style={{ font: `500 42px/1.35 ${TEXTO}`, color: COR.apagado, maxWidth: 760 }}>Sistemas de gestão sob medida para pequenos negócios.</div>
        <div style={{ marginTop: 40, background: COR.marinho, color: "#fff", font: `700 46px ${TITULO}`, padding: "34px 56px", borderRadius: 999, letterSpacing: "-0.01em" }}>
          Me chame no direct
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
