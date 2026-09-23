import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppPalette } from "@/constants/Design";
import { getAdjacentHymns, getHymn } from "@/constants/Hymns";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

const FONT_SIZE_KEY = "hymns.fontSize";
const FONT_SIZES = [17, 19, 21, 24, 28, 32];
const DEFAULT_FONT_INDEX = 2;

export default function HymnScreen() {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { number } = useLocalSearchParams<{ number: string }>();
  const hymn = getHymn(Number(number));
  const { previous, next } = getAdjacentHymns(Number(number));
  const [fontIndex, setFontIndex] = useState(DEFAULT_FONT_INDEX);

  useEffect(() => {
    AsyncStorage.getItem(FONT_SIZE_KEY)
      .then((saved) => {
        const index = FONT_SIZES.indexOf(Number(saved));
        if (index >= 0) {
          setFontIndex(index);
        }
      })
      .catch(console.warn);
  }, []);

  const changeFontSize = (delta: number) => {
    const nextIndex = Math.min(FONT_SIZES.length - 1, Math.max(0, fontIndex + delta));
    if (nextIndex === fontIndex) {
      return;
    }
    Haptics.selectionAsync();
    setFontIndex(nextIndex);
    AsyncStorage.setItem(FONT_SIZE_KEY, String(FONT_SIZES[nextIndex])).catch(console.warn);
  };

  const fontSize = FONT_SIZES[fontIndex];

  const headerOptions = {
    title: hymn ? `Hymn ${hymn.number}` : "Hymn",
    headerStyle: { backgroundColor: palette.background },
    headerTintColor: palette.accent,
    headerTitleStyle: { color: palette.text },
    headerRight: () => (
      <View style={styles.fontControls}>
        <Pressable
          accessibilityLabel="Smaller text"
          hitSlop={8}
          disabled={fontIndex === 0}
          onPress={() => changeFontSize(-1)}
          style={fontIndex === 0 ? styles.disabled : undefined}
        >
          <Text style={[styles.fontButton, styles.fontButtonSmall]}>A</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Larger text"
          hitSlop={8}
          disabled={fontIndex === FONT_SIZES.length - 1}
          onPress={() => changeFontSize(1)}
          style={fontIndex === FONT_SIZES.length - 1 ? styles.disabled : undefined}
        >
          <Text style={styles.fontButton}>A</Text>
        </Pressable>
      </View>
    ),
  };

  if (!hymn) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={headerOptions} />
        <Text style={styles.missing}>Hymn {number} isn&apos;t in the hymn book.</Text>
      </View>
    );
  }

  const meta = [hymn.meter, hymn.scripture].filter(Boolean).join("  ·  ");

  return (
    <View style={styles.screen}>
      <Stack.Screen options={headerOptions} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.number}>{hymn.number}</Text>
        <Text style={[styles.title, { fontSize: fontSize + 6, lineHeight: (fontSize + 6) * 1.25 }]}>
          {hymn.title}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {hymn.scriptureText ? (
          <Text style={styles.scriptureText}>{hymn.scriptureText}</Text>
        ) : null}

        <View style={styles.verses}>
          {hymn.verses.map((verse, index) => {
            const isChorus = !/^\d+$/.test(verse.label);
            return (
              <View key={`${verse.label}-${index}`} style={styles.verse}>
                <Text style={styles.verseLabel}>{verse.label}</Text>
                <Text
                  selectable
                  style={[
                    styles.lines,
                    isChorus ? styles.chorus : undefined,
                    { fontSize, lineHeight: fontSize * 1.5 },
                  ]}
                >
                  {verse.lines.join("\n")}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.pager}>
          {previous ? (
            <Pressable
              onPress={() => router.replace(`/hymns/${previous.number}`)}
              style={({ pressed }) => [styles.pagerButton, pressed ? styles.pressed : undefined]}
            >
              <Text style={styles.pagerLabel}>Previous</Text>
              <Text style={styles.pagerTitle} numberOfLines={1}>
                {previous.number}. {previous.title}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.pagerSpacer} />
          )}
          {next ? (
            <Pressable
              onPress={() => router.replace(`/hymns/${next.number}`)}
              style={({ pressed }) => [
                styles.pagerButton,
                styles.pagerNext,
                pressed ? styles.pressed : undefined,
              ]}
            >
              <Text style={styles.pagerLabel}>Next</Text>
              <Text style={[styles.pagerTitle, styles.pagerTitleNext]} numberOfLines={1}>
                {next.number}. {next.title}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.pagerSpacer} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    number: {
      color: palette.accent,
      fontSize: 15,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    title: {
      color: palette.text,
      fontFamily: "Georgia",
      fontWeight: "700",
      marginTop: 4,
    },
    meta: {
      color: palette.muted,
      fontSize: 14,
      marginTop: 8,
    },
    scriptureText: {
      color: palette.muted,
      fontFamily: "Georgia",
      fontSize: 16,
      fontStyle: "italic",
      lineHeight: 23,
      marginTop: 10,
    },
    verses: {
      gap: 24,
      marginTop: 28,
    },
    verse: {
      gap: 6,
    },
    verseLabel: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: "800",
      textTransform: "uppercase",
    },
    lines: {
      color: palette.text,
      fontFamily: "Georgia",
    },
    chorus: {
      fontStyle: "italic",
      paddingLeft: 16,
      borderLeftColor: palette.accent,
      borderLeftWidth: 2,
    },
    fontControls: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 18,
      paddingHorizontal: 4,
    },
    fontButton: {
      color: palette.accent,
      fontSize: 22,
      fontWeight: "700",
    },
    fontButtonSmall: {
      fontSize: 15,
    },
    disabled: {
      opacity: 0.35,
    },
    pager: {
      flexDirection: "row",
      gap: 12,
      marginTop: 40,
    },
    pagerButton: {
      flex: 1,
      gap: 4,
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 14,
    },
    pagerNext: {
      alignItems: "flex-end",
    },
    pagerSpacer: {
      flex: 1,
    },
    pressed: {
      opacity: 0.6,
    },
    pagerLabel: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    pagerTitle: {
      color: palette.text,
      fontSize: 15,
      fontWeight: "600",
    },
    pagerTitleNext: {
      textAlign: "right",
    },
    missing: {
      color: palette.muted,
      fontSize: 17,
      padding: 24,
      textAlign: "center",
    },
  });
