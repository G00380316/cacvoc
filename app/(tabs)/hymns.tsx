import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { FocusInput } from "@/components/ui/FocusInput";
import { PressableScale } from "@/components/ui/PressableScale";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import type { AppPalette } from "@/constants/Design";
import { HYMNS, searchHymns, type Hymn } from "@/constants/Hymns";
import { useThemedStyles } from "@/contexts/ThemeContext";

export default function HymnsScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const bottom = useBottomTabOverflow();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => searchHymns(deferredQuery), [deferredQuery]);
  const listRef = useRef<FlatList<Hymn>>(null);

  // New results should start from the best match, not the old scroll position.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [deferredQuery]);

  const openHymn = (hymn: Hymn) => {
    Haptics.selectionAsync();
    router.push(`/hymns/${hymn.number}`);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <ScreenHeader title="Hymns" />
      <View style={styles.searchWrap}>
        <FocusInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${HYMNS.length} hymns by number or words`}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          onSubmitEditing={() => {
            if (results.length > 0 && /^\d+$/.test(query.trim())) {
              openHymn(results[0]);
            }
          }}
        />
      </View>
      <FlatList
        ref={listRef}
        data={results}
        keyExtractor={(hymn) => String(hymn.number)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, { paddingBottom: bottom + 24 }]}
        initialNumToRender={20}
        ListEmptyComponent={
          <Text style={styles.empty}>No hymns match “{query.trim()}”.</Text>
        }
        renderItem={({ item }) => (
          <PressableScale pressedScale={0.98} onPress={() => openHymn(item)} style={styles.row}>
            <Text style={styles.number}>{item.number}</Text>
            <View style={styles.rowCopy}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              {item.category ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {item.category}
                </Text>
              ) : null}
            </View>
          </PressableScale>
        )}
      />
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    searchWrap: {
      paddingHorizontal: 24,
      paddingBottom: 12,
    },
    list: {
      paddingHorizontal: 24,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderBottomColor: palette.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingVertical: 14,
    },
    number: {
      color: palette.accent,
      fontSize: 17,
      fontVariant: ["tabular-nums"],
      fontWeight: "800",
      minWidth: 40,
    },
    rowCopy: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: palette.text,
      fontSize: 17,
      fontWeight: "600",
    },
    meta: {
      color: palette.muted,
      fontSize: 13,
    },
    empty: {
      color: palette.muted,
      fontSize: 16,
      paddingVertical: 32,
      textAlign: "center",
    },
  });
