import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { FloatingReaderButton } from "@/components/FloatingReaderButton";
import { AnimatedContent, ArticleSkeleton } from "@/components/LoadingStates";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WordForTodayArticle } from "@/components/WordForTodayArticle";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { fetchFirstJson } from "@/constants/Api";
import type { WordForToday } from "@/constants/ContentTypes";
import { Palette } from "@/constants/Design";
import { buildWordForTodaySpeechSegments } from "@/constants/Reader";

type WordForTodayResponse = {
    response?: WordForToday;
    wft?: WordForToday;
};

export default function HomeScreen() {
    const [text, setText] = useState("");
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [bibleRef, setbibleRef] = useState("");
    const [byline, setByline] = useState("");
    const [audio, setAudio] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeSpeechIndex, setActiveSpeechIndex] = useState<number | null>(null);
    const [scrollActivityKey, setScrollActivityKey] = useState(0);

    const bottom = useBottomTabOverflow();
    const insets = useSafeAreaInsets();

    const load = useCallback(async () => {
        try {
            const json = await fetchFirstJson<WordForTodayResponse>([
                "/mobile/wft",
                "/api/getWFT",
            ]);
            const wordForToday = json.wft ?? json.response;

            setText(wordForToday?.text ?? "");
            setTitle(wordForToday?.title ?? "");
            setDate(wordForToday?.date ?? "");
            setbibleRef(wordForToday?.bibleRef ?? "");
            setByline(wordForToday?.byline ?? "");
            setAudio(wordForToday?.audio ?? null);
            setError("");
        } catch (loadError) {
            console.warn(loadError);
            setError("Unable to load Word for Today.");
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
                onScrollBeginDrag={() => setScrollActivityKey(Date.now())}
                onMomentumScrollEnd={() => setScrollActivityKey(Date.now())}
                scrollEventThrottle={16}
            >
                <ScreenHeader title="Word for Today" />

                <ThemedView style={styles.content}>
                    {loading ? (
                        <ArticleSkeleton />
                    ) : error ? (
                        <ThemedText selectable style={styles.error}>{error}</ThemedText>
                    ) : (
                        <AnimatedContent>
                            <WordForTodayArticle
                                title={title}
                                date={date}
                                verse={bibleRef}
                                reference={byline}
                                text={text}
                                activeSpeechIndex={activeSpeechIndex}
                            />
                        </AnimatedContent>
                    )}
                </ThemedView>
            </Animated.ScrollView>
            {!loading && !error ? (
                <FloatingReaderButton
                    audio={audio}
                    speechSegments={buildWordForTodaySpeechSegments({
                        title,
                        date,
                        bibleRef,
                        byline,
                        text,
                    })}
                    activeSpeechIndex={activeSpeechIndex}
                    onActiveSpeechIndexChange={setActiveSpeechIndex}
                    bottomOffset={bottom}
                    activityKey={scrollActivityKey}
                />
            ) : undefined}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    stepContainer: {
        gap: 8,
        marginBottom: 8,
    },
    container: {
        flex: 1,
    },
    header: {
        overflow: "hidden",
    },
    content: {
        flex: 1,
        backgroundColor: Palette.background,
        paddingHorizontal: 24,
        paddingBottom: 32,
        gap: 16,
        overflow: "hidden",
    },
    error: {
        color: Palette.danger,
        fontSize: 17,
        lineHeight: 24,
    },
});
