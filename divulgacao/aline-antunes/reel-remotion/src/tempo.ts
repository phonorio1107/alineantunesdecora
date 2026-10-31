import { Easing, interpolate } from "remotion";
import { FPS } from "./roteiro";

const saida = Easing.bezier(0.33, 1, 0.68, 1); // desacelera no fim (ease-out cúbico)

// 0 antes de `de`, 1 depois de `ate` (segundos), com ease-out.
export const entre = (frame: number, de: number, ate: number) =>
  interpolate(frame, [de * FPS, ate * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: saida,
  });
