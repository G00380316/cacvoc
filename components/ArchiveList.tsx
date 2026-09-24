import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { PressableScale } from "@/components/ui/PressableScale";
import type { AppPalette } from "@/constants/Design";
import { useAppTheme, useThemedStyles } from "@/contexts/ThemeContext";
import { stripHtml } from "@/constants/Html";

export type ArchiveItem = {
  _id?: string;
  title?: string;
  date?: string;
};

type ArchiveListProps = {
  items: ArchiveItem[];
  routePrefix: "wordfortoday" | "sunday-school";
  showDate?: boolean;
};

export function ArchiveList({ items, routePrefix, showDate }: ArchiveListProps) {
  const styles = useThemedStyles(createStyles);
  const { scheme } = useAppTheme();

  return (
    <ThemedView style={styles.list}>
      {items.map((item, index) => {
        if (!item._id) {
          return null;
        }

        const title = stripHtml(item.title) || "Untitled";
        const date = stripHtml(item.date);

        return (
          <Animated.View
            key={item._id}
            entering={FadeInUp.duration(320).delay(Math.min(index * 45, 360))}
            layout={LinearTransition.duration(180)}
          >
            <PressableScale
              pressedScale={0.98}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/${routePrefix}/${item._id}`);
              }}
              style={[styles.row, scheme === "dark" ? styles.rowDark : undefined]}
            >
              {showDate && date ? (
                <ThemedText style={styles.rowDate}>{date}</ThemedText>
              ) : undefined}
              <ThemedText style={styles.rowText}>{title}</ThemedText>
            </PressableScale>
          </Animated.View>
        );
      })}
    </ThemedView>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    list: {
      gap: 12,
      backgroundColor: "transparent",
    },
    row: {
      minHeight: 72,
      justifyContent: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 18,
      paddingVertical: 14,
      boxShadow: "0 1px 3px rgba(24, 34, 27, 0.06)",
    },
    rowDark: {
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.32)",
    },
    rowText: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 25,
    },
    rowDate: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
      marginBottom: 4,
    },
  });
