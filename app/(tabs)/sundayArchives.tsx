import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { ArchiveList } from "@/components/ArchiveList";
import { AnimatedContent, ArchiveSkeleton } from "@/components/LoadingStates";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { fetchFirstJson } from "@/constants/Api";
import type { SundaySchool } from "@/constants/ContentTypes";
import { Palette } from "@/constants/Design";

type SundaySchoolListResponse = {
  sundaySchools?: SundaySchool[];
};

export default function SundayArchivesScreen() {
  const [items, setItems] = useState<SundaySchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const bottom = useBottomTabOverflow();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const json = await fetchFirstJson<SundaySchoolListResponse>([
        "/mobile/ss/list",
        "/api/getListSS",
      ]);
      setItems(json.sundaySchools ?? []);
      setError("");
    } catch (loadError) {
      console.warn(loadError);
      setError("Unable to load Sunday School archives.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <ThemedView lightColor={Palette.background} style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: bottom + 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Palette.accent}
          />
        }
      >
        <ScreenHeader title="SS Archives" />

        <ThemedView style={styles.body}>
          {loading ? <ArchiveSkeleton /> : undefined}
          {!loading && error ? (
            <ThemedText selectable style={styles.error}>
              {error}
            </ThemedText>
          ) : undefined}
          {!loading && !error ? (
            <AnimatedContent>
              <ArchiveList items={items} routePrefix="sunday-school" />
            </AnimatedContent>
          ) : undefined}
        </ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    backgroundColor: Palette.background,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  error: {
    color: Palette.danger,
    fontSize: 17,
    lineHeight: 24,
  },
});
