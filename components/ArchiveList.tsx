import { Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Palette } from "@/constants/Design";
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
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/${routePrefix}/${item._id}`);
              }}
              style={({ pressed }) => [
                styles.row,
                pressed ? styles.rowPressed : undefined,
              ]}
            >
              {showDate && date ? (
                <ThemedText style={styles.rowDate}>{date}</ThemedText>
              ) : undefined}
              <ThemedText style={styles.rowText}>{title}</ThemedText>
            </Pressable>
          </Animated.View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    backgroundColor: "transparent",
  },
  row: {
    minHeight: 72,
    justifyContent: "center",
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 14,
    boxShadow: "0 1px 3px rgba(24, 34, 27, 0.06)",
  },
  rowPressed: {
    opacity: 0.68,
  },
  rowText: {
    color: Palette.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 25,
  },
  rowDate: {
    color: Palette.accent,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 4,
  },
});
