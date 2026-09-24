import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChurchNotice } from "@/components/church/ChurchNotice";
import { PostArticle } from "@/components/church/PostArticle";
import { postTypeLabel } from "@/components/church/postDisplay";
import { ArticleSkeleton } from "@/components/LoadingStates";
import { ApiError, apiRequest } from "@/constants/Api";
import type { AppPalette } from "@/constants/Design";
import type { Post } from "@/constants/PostTypes";
import { useThemedStyles } from "@/contexts/ThemeContext";

type PostResponse = {
  post: Post;
  church: { id: string; name: string };
};

type PostState =
  | { status: "loading" }
  | ({ status: "ready" } & PostResponse)
  | { status: "error"; message: string }
  | { status: "notFound" };

export default function PostScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loaded, setLoaded] = useState<PostState & { id?: string }>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      return;
    }
    let active = true;

    apiRequest<PostResponse>(`/posts/${encodeURIComponent(id)}`)
      .then(({ post, church }) => {
        if (active) {
          setLoaded({ id, status: "ready", post, church });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setLoaded(
          error instanceof ApiError && error.status === 404
            ? { id, status: "notFound" }
            : {
                id,
                status: "error",
                message: error instanceof Error ? error.message : "Couldn't load this post.",
              }
        );
      });

    return () => {
      active = false;
    };
  }, [id, attempt]);

  const retry = () => {
    setLoaded({ status: "loading" });
    setAttempt((count) => count + 1);
  };

  // A result for another id (or none yet, e.g. while retrying) reads as loading.
  const state: PostState = !id
    ? { status: "notFound" }
    : loaded.id === id
      ? loaded
      : { status: "loading" };

  return (
    <View style={styles.screen}>
      {/* Blank until the post arrives, then its type ("Sermon", "Event", …). */}
      <Stack.Screen
        options={{ title: state.status === "ready" ? postTypeLabel(state.post.type) : "" }}
      />
      {/* Explicit bottom inset (no automatic adjustment, which would add it a second time on iOS). */}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {state.status === "ready" ? (
          <PostArticle post={state.post} churchName={state.church.name} />
        ) : (
          <View style={styles.placeholder}>
            {state.status === "loading" ? <ArticleSkeleton /> : null}
            {state.status === "notFound" ? (
              <ChurchNotice
                title="This post is no longer available"
                message="It may have been removed by the church."
              />
            ) : null}
            {state.status === "error" ? (
              <ChurchNotice
                title="Couldn't load this post"
                message={state.message}
                tone="danger"
                action={{ title: "Try again", onPress: retry }}
              />
            ) : null}
          </View>
        )}
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
    placeholder: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
  });
