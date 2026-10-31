import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const TEXTO = "Inter, system-ui, sans-serif";
export const TITULO = "'Inter Tight', system-ui, sans-serif";

export const carregarFontes = () =>
  Promise.all([
    loadFont({ family: "Inter", url: staticFile("fontes/inter-latin-500-normal.woff2"), weight: "500" }),
    loadFont({ family: "Inter", url: staticFile("fontes/inter-latin-600-normal.woff2"), weight: "600" }),
    loadFont({ family: "Inter Tight", url: staticFile("fontes/inter-tight-latin-700-normal.woff2"), weight: "700" }),
  ]);
