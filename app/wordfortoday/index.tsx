import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { ArchiveList } from "@/components/ArchiveList";
import { AnimatedContent, ArchiveSkeleton } from "@/components/LoadingStates";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { fetchFirstJson } from "@/constants/Api";
import type { WordForToday } from "@/constants/ContentTypes";
import type { AppPalette } from "@/constants/Design";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

type WordForTodayListResponse = {
    wordfortodays?: WordForToday[];
};

export default function WordArchivesScreen() {
    const styles = useThemedStyles(createStyles);
    const palette = usePalette();
    const [items, setItems] = useState<WordForToday[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const insets = useSafeAreaInsets();

    const load = useCallback(async () => {
        try {
            const json = await fetchFirstJson<WordForTodayListResponse>([
                "/mobile/wft/list",
                "/api/getListWFT",
            ]);
            setItems(json.wordfortodays ?? []);
            setError("");
        } catch (loadError) {
            console.warn(loadError);
            setError("Unable to load Word for Today archives.");
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
        <ThemedView lightColor={palette.background} style={styles.container}>
            <Stack.Screen options={{ title: "Word for Today Archives" }} />
            <Animated.ScrollView
                contentContainerStyle={{
                    paddingTop: 16,
                    paddingBottom: insets.bottom + 24,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        tintColor={palette.accent}
                    />
                }
            >
                <ThemedView style={styles.body}>
                    {loading ? <ArchiveSkeleton /> : undefined}
                    {!loading && error ? (
                        <ThemedText selectable style={styles.error}>
                            {error}
                        </ThemedText>
                    ) : undefined}
                    {!loading && !error ? (
                        <AnimatedContent>
                            <ArchiveList items={items} routePrefix="wordfortoday" showDate />
                        </AnimatedContent>
                    ) : undefined}
                </ThemedView>
            </Animated.ScrollView>
        </ThemedView>
    );
}

const createStyles = (palette: AppPalette) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        body: {
            backgroundColor: palette.background,
            paddingHorizontal: 24,
            paddingBottom: 32,
            gap: 16,
        },
        error: {
            color: palette.danger,
            fontSize: 17,
            lineHeight: 24,
        },
    });
