import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp, LinearTransition } from "react-native-reanimated";

import { Button } from "@/components/ui/Form";
import { PressableScale } from "@/components/ui/PressableScale";
import { apiRequest } from "@/constants/Api";
import type { AppPalette } from "@/constants/Design";
import { formatDayKey, formatEventWhen, formatPostedDate } from "@/constants/PostFormat";
import { POST_TYPES, type Post, type PostType } from "@/constants/PostTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useThemedStyles } from "@/contexts/ThemeContext";

function postMeta(post: Post) {
  switch (post.type) {
    case "event":
      return [formatEventWhen(post.startsAt, post.endsAt), post.location].filter(Boolean).join(" · ");
    case "sermon":
      return [post.preacher, post.bibleRef].filter(Boolean).join(" · ") || formatPostedDate(post);
    case "devotional":
      return [formatDayKey(post.date), post.bibleRef].filter(Boolean).join(" · ");
    default:
      return `Posted ${formatPostedDate(post)}`;
  }
}

/** Admin list of their church's posts, one type at a time. */
export function PostManager() {
  const styles = useThemedStyles(createStyles);
  const { token } = useAuth();
  const [type, setType] = useState<PostType>("announcement");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const json = await apiRequest<{ posts: Post[] }>(`/editor/posts?type=${type}`, {
        adminToken: token,
      });
      setPosts(json.posts);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load posts.");
    }
  }, [token, type]);

  // Runs on first show, on type change, and when returning from the post editor.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const current = POST_TYPES.find((option) => option.type === type) ?? POST_TYPES[0];

  return (
    <View style={styles.stack}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {POST_TYPES.map((option) => {
          const selected = option.type === type;
          return (
            <PressableScale
              key={option.type}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              pressedScale={0.95}
              onPress={() => {
                if (!selected) {
                  Haptics.selectionAsync();
                  setPosts(null);
                  setType(option.type);
                }
              }}
              style={[styles.chip, selected ? styles.chipSelected : undefined]}
            >
              <Text style={[styles.chipText, selected ? styles.chipTextSelected : undefined]}>
                {option.plural}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      <Button
        title={`New ${current.label.toLowerCase()}`}
        onPress={() => router.push({ pathname: "/post-editor", params: { type } })}
      />

      {error ? (
        <Animated.Text entering={FadeIn.duration(200)} selectable style={styles.error}>
          {error}
        </Animated.Text>
      ) : null}

      {posts === null && !error ? <Text style={styles.muted}>Loading…</Text> : null}

      {posts?.length === 0 ? (
        <Animated.Text entering={FadeIn.duration(250)} style={styles.muted}>
          No {current.plural.toLowerCase()} yet.
        </Animated.Text>
      ) : null}

      {posts?.map((post, index) => (
        <Animated.View
          key={post.id}
          entering={FadeInUp.duration(280).delay(Math.min(index * 45, 225))}
          layout={LinearTransition.duration(220)}
        >
          <PressableScale
            pressedScale={0.98}
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: "/post-editor", params: { id: post.id } });
            }}
            style={styles.row}
          >
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {post.title}
              </Text>
              {postMeta(post) ? (
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {postMeta(post)}
                </Text>
              ) : null}
            </View>
            {post.imageUrl ? (
              <Image source={{ uri: post.imageUrl }} style={styles.thumb} contentFit="cover" />
            ) : null}
          </PressableScale>
        </Animated.View>
      ))}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    stack: {
      gap: 12,
    },
    chips: {
      gap: 8,
    },
    chip: {
      backgroundColor: palette.surfaceSoft,
      borderCurve: "continuous",
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipSelected: {
      backgroundColor: palette.accent,
    },
    chipText: {
      color: palette.text,
      fontSize: 15,
      fontWeight: "600",
    },
    chipTextSelected: {
      color: palette.onAccent,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 14,
    },
    rowCopy: {
      flex: 1,
      gap: 4,
    },
    rowTitle: {
      color: palette.text,
      fontSize: 17,
      fontWeight: "700",
    },
    rowMeta: {
      color: palette.muted,
      fontSize: 14,
    },
    thumb: {
      width: 52,
      height: 52,
      borderRadius: 8,
      backgroundColor: palette.surfaceSoft,
    },
    muted: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 21,
    },
    error: {
      color: palette.danger,
      fontSize: 15,
      lineHeight: 21,
    },
  });
