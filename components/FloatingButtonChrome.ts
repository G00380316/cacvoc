import { StyleSheet } from "react-native";

import { useAppTheme } from "@/contexts/ThemeContext";

export const FLOATING_BUTTON_SIZE = 58;
const FLOATING_BUTTON_GAP = 12;
const FLOATING_BUTTON_MARGIN = 16;

/**
 * Distance from the bottom of the screen for a floating button.
 * Slot 0 is the reader (play) button; each higher slot stacks above it.
 */
export function floatingButtonBottom(bottomOffset: number, safeAreaBottom: number, slot = 0) {
  return (
    bottomOffset +
    safeAreaBottom +
    FLOATING_BUTTON_MARGIN +
    slot * (FLOATING_BUTTON_SIZE + FLOATING_BUTTON_GAP)
  );
}

type FloatingChrome = {
  buttonBackground: string;
  buttonBorder: string;
  buttonShadow: string;
  fill: string;
};

const FLOATING_CHROME: Record<"light" | "dark", FloatingChrome> = {
  light: {
    buttonBackground: "rgba(255, 255, 255, 0.34)",
    buttonBorder: "rgba(29, 111, 66, 0.2)",
    buttonShadow: "0 12px 28px rgba(29, 111, 66, 0.18)",
    fill: "rgba(29, 111, 66, 0.58)",
  },
  dark: {
    buttonBackground: "rgba(26, 32, 27, 0.55)",
    buttonBorder: "rgba(92, 191, 133, 0.28)",
    buttonShadow: "0 12px 28px rgba(0, 0, 0, 0.45)",
    fill: "rgba(92, 191, 133, 0.88)",
  },
};

const createStyles = (chrome: FloatingChrome) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      right: 18,
      zIndex: 20,
    },
    button: {
      alignItems: "center",
      backgroundColor: chrome.buttonBackground,
      borderColor: chrome.buttonBorder,
      borderCurve: "continuous",
      borderRadius: FLOATING_BUTTON_SIZE / 2,
      borderWidth: 1,
      boxShadow: chrome.buttonShadow,
      height: FLOATING_BUTTON_SIZE,
      justifyContent: "center",
      overflow: "hidden",
      width: FLOATING_BUTTON_SIZE,
    },
    fill: {
      backgroundColor: chrome.fill,
      bottom: 0,
      height: FLOATING_BUTTON_SIZE,
      left: 0,
      position: "absolute",
      right: 0,
    },
    pressed: {
      opacity: 0.72,
    },
    icon: {
      zIndex: 1,
    },
  });

const stylesByScheme = {
  light: createStyles(FLOATING_CHROME.light),
  dark: createStyles(FLOATING_CHROME.dark),
};

/** Translucent round button styles shared by the floating buttons. */
export function useFloatingButtonStyles() {
  return stylesByScheme[useAppTheme().scheme];
}
