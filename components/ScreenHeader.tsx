import { StyleSheet } from "react-native";

import { LogoWave } from "@/components/Bible";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Palette } from "@/constants/Design";

type ScreenHeaderProps = {
  title: string;
};

export function ScreenHeader({ title }: ScreenHeaderProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.copy}>
        <ThemedText style={styles.church}>Christ Apostolic Church</ThemedText>
        <ThemedText style={styles.title}>{title}</ThemedText>
      </ThemedView>
      <LogoWave />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Palette.background,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  copy: {
    flex: 1,
    backgroundColor: "transparent",
    gap: 4,
    paddingRight: 18,
  },
  church: {
    color: Palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: Palette.text,
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 34,
  },
});
