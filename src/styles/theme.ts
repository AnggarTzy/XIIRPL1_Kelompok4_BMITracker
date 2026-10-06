import { BRAND } from "./colors";

// ============================================================
// THEME TYPE
// ============================================================

export type Theme = {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  input: string;
  soft: string;
  primary: string;
  result: string;
  drawer: string;
};

// ============================================================
// GET THEME — berdasarkan mode dark/light
// ============================================================

export const getTheme = (isDark: boolean): Theme =>
  isDark
    ? {
        background: "#0B1220",
        card: "#151E2E",
        text: "#F1F5F9",
        muted: "#94A3B8",
        border: "#273449",
        input: "#0F172A",
        soft: "#1E293B",
        primary: BRAND.primary,
        result: "#064E3B",
        drawer: "#0B1220",
      }
    : {
        background: "#F8FAFC",
        card: "#FFFFFF",
        text: "#0F172A",
        muted: "#64748B",
        border: "#E2E8F0",
        input: "#FFFFFF",
        soft: "#F1F5F9",
        primary: BRAND.primary,
        result: BRAND.primarySoft,
        drawer: "#FFFFFF",
      };