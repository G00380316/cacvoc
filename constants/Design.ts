export type AppPalette = {
  background: string;
  surface: string;
  surfaceSoft: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  danger: string;
  /** Text/icon color placed on top of `accent`. */
  onAccent: string;
};

export const LightPalette: AppPalette = {
  background: "#fbfaf5",
  surface: "#ffffff",
  surfaceSoft: "#f3f6ee",
  text: "#18221b",
  muted: "#667062",
  border: "#dce4d7",
  accent: "#1d6f42",
  accentSoft: "#e7f2e9",
  danger: "#a23b3b",
  onAccent: "#ffffff",
};

export const DarkPalette: AppPalette = {
  background: "#111512",
  surface: "#1a201b",
  surfaceSoft: "#1f2820",
  text: "#e9eee7",
  muted: "#9aa596",
  border: "#2c362d",
  accent: "#5cbf85",
  accentSoft: "#1f3526",
  danger: "#e07a7a",
  onAccent: "#0d1a11",
};

export const Typography = {
  ui: "System",
  reader: "Georgia",
};
