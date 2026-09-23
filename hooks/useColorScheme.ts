import { useAppTheme } from "@/contexts/ThemeContext";

/** The app's resolved color scheme, honoring the user's Settings choice. */
export function useColorScheme() {
  return useAppTheme().scheme;
}
