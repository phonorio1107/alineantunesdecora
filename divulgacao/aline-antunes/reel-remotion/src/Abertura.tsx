import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COR, FRASES } from "./roteiro";
import { TITULO } from "./fontes";
import { entre } from "./tempo";

// Fundo escuro: as duas frases do problema, palavra por palavra.
const Frase: React.FC<{ texto: string; inicio: number; top: number; cor: string }> = ({ texto, inicio, top, cor }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top, font: `700 112px/1.02 ${TITULO}`, letterSpacing: "-0.045em", color: cor }}>
      {texto.split(" ").map((p, i) => {
        const k = entre(frame, inicio + i * 0.12, inicio + i * 0.12 + 0.55);
        return (
          <span key={i} style={{ display: "inline-block", opacity: k, translate: `0 ${(1 - k) * 40}px`, marginRight: "0.25em" }}>
            {p}
          </span>
        );
      })}
    </div>
  );
};

export const Abertura: React.FC = () => {
  const frame = useCurrentFrame();
  const sai = entre(frame, 4.6, 5.4);
  return (
    <AbsoluteFill style={{ backgroundColor: COR.tinta }}>
      <AbsoluteFill style={{ opacity: 1 - sai, translate: `0 ${-sai * 120}px` }}>
        <Frase texto={FRASES[0]} inicio={0.3} top={680} cor="#fff" />
        <Frase texto={FRASES[1]} inicio={2.4} top={920} cor="#6A6A72" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
