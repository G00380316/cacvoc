import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import Animated from "react-native-reanimated";

import { HtmlArticle } from "@/components/HtmlArticle";
import { AnimatedContent, SundayArticleSkeleton } from "@/components/LoadingStates";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { fetchFirstJson } from "@/constants/Api";
import type { SundaySchool } from "@/constants/ContentTypes";
import { Palette } from "@/constants/Design";

type SundaySchoolDetailResponse = {
  sundaySchool?: SundaySchool;
};

export default function SundaySchoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<SundaySchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const json = await fetchFirstJson<SundaySchoolDetailResponse>([
          `/mobile/ss/${id}`,
          `/api/getSSbyId/${id}`,
        ]);
        setItem(json.sundaySchool ?? null);
        setError("");
      } catch (loadError) {
        console.warn(loadError);
        setError("Unable to load Sunday School.");
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
          title: "Sunday School",
          headerStyle: { backgroundColor: Palette.background },
          headerTintColor: Palette.accent,
        }}
      />
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        {loading ? <SundayArticleSkeleton /> : undefined}
        {!loading && error ? (
          <ThemedText selectable style={styles.error}>
            {error}
          </ThemedText>
        ) : undefined}
        {!loading && item ? (
          <AnimatedContent>
            <HtmlArticle
              html={`
              <h2>${item.title ?? ""}</h2>
              <p>${item.text ?? ""}</p>
            `}
            />
          </AnimatedContent>
        ) : undefined}
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
