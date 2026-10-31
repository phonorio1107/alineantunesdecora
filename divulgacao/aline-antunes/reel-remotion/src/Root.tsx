import { Composition } from "remotion";
import { ReelsAline } from "./ReelsAline";
import { DURACAO, FPS } from "./roteiro";
import { carregarFontes } from "./fontes";

carregarFontes();

export const RemotionRoot: React.FC = () => (
  <Composition id="ReelsAline" component={ReelsAline} durationInFrames={DURACAO * FPS} fps={FPS} width={1080} height={1920} />
);
