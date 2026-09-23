import { StyleSheet } from "react-native";

import { LogoWave } from "@/components/Bible";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import type { AppPalette } from "@/constants/Design";
import { useChurch } from "@/contexts/ChurchContext";
import { useThemedStyles } from "@/contexts/ThemeContext";

type ScreenHeaderProps = {
  title: string;
};

export function ScreenHeader({ title }: ScreenHeaderProps) {
  const styles = useThemedStyles(createStyles);
  const { church } = useChurch();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.copy}>
        <ThemedText style={styles.church} numberOfLines={1}>
          {church?.name ?? "Christ Apostolic Church"}
        </ThemedText>
        <ThemedText style={styles.title}>{title}</ThemedText>
      </ThemedView>
      <LogoWave />
    </ThemedView>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    container: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: palette.background,
      paddingHorizontal: 24,
      paddingBottom: 12,
      paddingTop: 8,
    },
    copy: {
      flex: 1,
      backgroundColor: "transparent",
      gap: 4,
      paddingRight: 18,
    },
    church: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0,
      textTransform: "uppercase",
    },
    title: {
      color: palette.text,
      fontSize: 29,
      fontWeight: "800",
      lineHeight: 34,
    },
  });
