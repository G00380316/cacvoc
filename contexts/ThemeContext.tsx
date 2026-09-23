import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

import { DarkPalette, LightPalette, type AppPalette } from "@/constants/Design";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedScheme = "light" | "dark";

const STORAGE_KEY = "settings.themePreference";

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  scheme: ResolvedScheme;
  palette: AppPalette;
  /** False until the saved preference has been read from storage. */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "light" || saved === "dark" || saved === "system") {
          setPreferenceState(saved);
        }
      })
      .catch(console.warn)
      .finally(() => setReady(true));
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(console.warn);
  }, []);

  const scheme: ResolvedScheme =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      scheme,
      palette: scheme === "dark" ? DarkPalette : LightPalette,
      ready,
    }),
    [preference, setPreference, scheme, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }

  return context;
}

export function usePalette() {
  return useAppTheme().palette;
}

/**
 * Builds a StyleSheet from the active palette and rebuilds it when the theme changes.
 * Define `factory` at module scope so it keeps a stable identity.
 */
export function useThemedStyles<T>(factory: (palette: AppPalette) => T): T {
  const palette = usePalette();
  return useMemo(() => factory(palette), [factory, palette]);
}
