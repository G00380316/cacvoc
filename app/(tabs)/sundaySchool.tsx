import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { HtmlArticle } from "@/components/HtmlArticle";
import { AnimatedContent, SundayArticleSkeleton } from "@/components/LoadingStates";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { fetchFirstJson } from "@/constants/Api";
import type { SundaySchool } from "@/constants/ContentTypes";
import { Palette } from "@/constants/Design";

type SundaySchoolResponse = {
    response?: {
        sundaySchool?: SundaySchool;
    };
    sundaySchool?: SundaySchool;
};

export default function HomeScreen() {
    const [text, setText] = useState("");
    const [title, setTitle] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const bottom = useBottomTabOverflow();
    const insets = useSafeAreaInsets();

    const load = useCallback(async () => {
        try {
            const json = await fetchFirstJson<SundaySchoolResponse>([
                "/mobile/ss",
                "/api/getSS",
            ]);
            const sundaySchool =
                json.sundaySchool ?? json.response?.sundaySchool;

            if (sundaySchool) {
                setText(sundaySchool.text ?? "");
                setTitle(sundaySchool.title ?? "");
            }
            setError("");
        } catch (loadError) {
            console.warn(loadError);
            setError("Unable to load Sunday School.");
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
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        tintColor={Palette.accent}
                    />
                }
            >
                <ScreenHeader title="Sunday School" />

                <ThemedView style={styles.content}>
                    {loading ? (
                        <SundayArticleSkeleton />
                    ) : error ? (
                        <ThemedText selectable style={styles.error}>{error}</ThemedText>
                    ) : (
                        <AnimatedContent>
                            <HtmlArticle
                                html={`
                      <h2>${title}</h2>
                      <p>${text}</p>
                    `}
                            />
                        </AnimatedContent>
                    )}
                </ThemedView>
            </Animated.ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        backgroundColor: Palette.background,
        paddingHorizontal: 24,
        paddingBottom: 32,
        overflow: "hidden",
    },
    error: {
        color: Palette.danger,
        fontSize: 17,
        lineHeight: 24,
    },
});
