import type { AccentId } from "./types";

export const TOKENS = {
  canvas: "#F7F4EE",
  ink: "#1A1814",
  muted: "#8A847A",
  line: "#E4DFD6",
  white: "#FFFFFF",
  radius: 20,
  /** Success / completion check — guitar-green accent tick, not primary CTA. */
  successGreen: "#3F8F5A",
  successGreenInk: "#2D6A3E",
};

export const ACCENTS: Record<
  AccentId,
  { ink: string; bg: string; tick: string }
> = {
  green: { ink: "#2D6A3E", bg: "#E4F0E2", tick: "#3F8F5A" },
  orange: { ink: "#C45C12", bg: "#F8E6D4", tick: "#E07A2F" },
  blue: { ink: "#1D4E89", bg: "#E3EEF8", tick: "#3B7CB8" },
  rose: { ink: "#9B2C4A", bg: "#F8E2E8", tick: "#C45B75" },
  violet: { ink: "#5B3D8F", bg: "#EDE4F8", tick: "#7C5CB3" },
};
