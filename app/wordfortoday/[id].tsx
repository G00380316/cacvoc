import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import Animated from "react-native-reanimated";

import { FloatingReaderButton } from "@/components/FloatingReaderButton";
import { AnimatedContent, ArticleSkeleton } from "@/components/LoadingStates";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WordForTodayArticle } from "@/components/WordForTodayArticle";
import { fetchFirstJson } from "@/constants/Api";
import type { WordForToday } from "@/constants/ContentTypes";
import { Palette } from "@/constants/Design";
import { buildWordForTodaySpeechSegments } from "@/constants/Reader";

type WordForTodayDetailResponse = {
  wordfortoday?: WordForToday;
};

export default function WordForTodayDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<WordForToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSpeechIndex, setActiveSpeechIndex] = useState<number | null>(null);
  const [scrollActivityKey, setScrollActivityKey] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const json = await fetchFirstJson<WordForTodayDetailResponse>([
          `/mobile/wft/${id}`,
          `/api/getWFTbyId/${id}`,
        ]);
        setItem(json.wordfortoday ?? null);
        setError("");
      } catch (loadError) {
        console.warn(loadError);
        setError("Unable to load Word for Today.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      load();
    }
  }, [id]);

  return (
    <ThemedView lightColor={Palette.background} style={styles.container}>
      <Stack.Screen
        options={{
          title: "Word for Today",
          headerStyle: { backgroundColor: Palette.background },
          headerTintColor: Palette.accent,
        }}
      />
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        onScrollBeginDrag={() => setScrollActivityKey(Date.now())}
        onMomentumScrollEnd={() => setScrollActivityKey(Date.now())}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <ArticleSkeleton /> : undefined}
        {!loading && error ? (
          <ThemedText selectable style={styles.error}>
            {error}
          </ThemedText>
        ) : undefined}
        {!loading && item ? (
          <AnimatedContent>
            <WordForTodayArticle
              title={item.title}
              date={item.date}
              verse={item.bibleRef}
              reference={item.byline}
              text={item.text}
              activeSpeechIndex={activeSpeechIndex}
            />
          </AnimatedContent>
        ) : undefined}
      </Animated.ScrollView>
      {!loading && !error && item ? (
        <FloatingReaderButton
          audio={item.audio}
          speechSegments={buildWordForTodaySpeechSegments(item)}
          activeSpeechIndex={activeSpeechIndex}
          onActiveSpeechIndexChange={setActiveSpeechIndex}
          bottomOffset={0}
          activityKey={scrollActivityKey}
        />
      ) : undefined}
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
    paddingBottom: 40,
    paddingTop: 24,
    gap: 16,
  },
  error: {
    color: Palette.danger,
    fontSize: 17,
    lineHeight: 24,
  },
});
