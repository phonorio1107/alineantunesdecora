import { AbsoluteFill, Sequence } from "remotion";
import { Abertura } from "./Abertura";
import { Sistema } from "./Sistema";
import { DURACAO, FPS } from "./roteiro";

// Reels do caso Aline Antunes Decora, marca Pedro Hoffman. Sai mudo: a música entra no Instagram.
export const ReelsAline: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Sequence name="Abertura" durationInFrames={6 * FPS}>
      <Abertura />
    </Sequence>
    <Sequence name="Sistema" durationInFrames={DURACAO * FPS}>
      <Sistema />
    </Sequence>
  </AbsoluteFill>
);
