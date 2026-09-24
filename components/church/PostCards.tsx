import Entypo from "@expo/vector-icons/Entypo";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInUp, FadeOut, LinearTransition } from "react-native-reanimated";

import { joinMeta, postedCaption, previewText } from "@/components/church/postDisplay";
import { PressableScale } from "@/components/ui/PressableScale";
import type { AppPalette } from "@/constants/Design";
import { eventBadge, formatDayKey, formatEventWhen } from "@/constants/PostFormat";
import type { Post } from "@/constants/PostTypes";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

/** Entering delay for the nth item on the page: a short cascade that stops growing after a few. */
export function staggerDelay(index: number) {
  return Math.min(index * 45, 270);
}

type CardProps = {
  post: Post;
  /** Position on the page, for the entering cascade. */
  index: number;
};

/** Tappable card shell shared by every post type; opens the post's detail screen. */
function PostCard({
  post,
  index,
  style,
  children,
}: CardProps & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const styles = useThemedStyles(createStyles);

  return (
    // Entering/layout animations live on this wrapper because PressableScale animates its own transform.
    <Animated.View
      entering={FadeInUp.duration(300).delay(staggerDelay(index))}
      exiting={FadeOut.duration(180)}
      layout={LinearTransition.duration(220)}
    >
      <PressableScale
        accessibilityRole="button"
        pressedScale={0.98}
        onPress={() => {
          Haptics.selectionAsync();
          router.push(`/post/${post.id}`);
        }}
        style={[styles.card, style]}
      >
        {children}
      </PressableScale>
    </Animated.View>
  );
}

export function EventCard({ post, index }: CardProps) {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const badge = eventBadge(post.startsAt);
  const when = formatEventWhen(post.startsAt, post.endsAt);

  return (
    <PostCard post={post} index={index} style={styles.eventCard}>
      <View style={styles.badge}>
        {badge ? (
          <>
            <Text style={styles.badgeDay}>{badge.day}</Text>
            <Text style={styles.badgeMonth}>{badge.month}</Text>
          </>
        ) : (
          <Entypo name="calendar" size={20} color={palette.accent} />
        )}
      </View>
      <View style={styles.eventCopy}>
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>
        {when ? <Text style={styles.meta}>{when}</Text> : null}
        {post.location ? (
          <Text style={styles.meta} numberOfLines={1}>
            {post.location}
          </Text>
        ) : null}
      </View>
    </PostCard>
  );
}

export function AnnouncementCard({ post, index }: CardProps) {
  const styles = useThemedStyles(createStyles);
  const preview = previewText(post.body);

  return (
    <PostCard post={post} index={index} style={styles.announcementCard}>
      {post.imageUrl ? (
        <Image
          // Signed URLs change on every fetch, so cache by the stored object key instead.
          source={{ uri: post.imageUrl, cacheKey: post.imageKey ?? undefined }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <View style={styles.announcementCopy}>
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>
        {preview ? (
          <Text style={styles.preview} numberOfLines={3}>
            {preview}
          </Text>
        ) : null}
        <Text style={styles.caption}>{postedCaption(post)}</Text>
      </View>
    </PostCard>
  );
}

export function SermonCard({ post, index }: CardProps) {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const meta = joinMeta(post.preacher, post.bibleRef);

  return (
    <PostCard post={post} index={index}>
      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      {meta ? (
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
      {post.mediaUrl ? (
        <View style={styles.mediaPill}>
          <Entypo name="controller-play" size={14} color={palette.accent} />
          <Text style={styles.mediaText}>Watch or listen</Text>
        </View>
      ) : null}
    </PostCard>
  );
}

export function DevotionalCard({ post, index }: CardProps) {
  const styles = useThemedStyles(createStyles);
  const day = formatDayKey(post.date);

  return (
    <PostCard post={post} index={index}>
      {day ? <Text style={styles.eyebrow}>{day}</Text> : null}
      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      {post.bibleRef ? <Text style={styles.meta}>{post.bibleRef}</Text> : null}
    </PostCard>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 6,
      padding: 16,
    },
    eventCard: {
      alignItems: "center",
      flexDirection: "row",
      gap: 14,
    },
    eventCopy: {
      flex: 1,
      gap: 3,
    },
    announcementCard: {
      gap: 0,
      overflow: "hidden",
      padding: 0,
    },
    announcementCopy: {
      gap: 6,
      padding: 16,
    },
    image: {
      aspectRatio: 16 / 9,
      backgroundColor: palette.surfaceSoft,
      width: "100%",
    },
    title: {
      color: palette.text,
      fontSize: 17,
      fontWeight: "700",
      lineHeight: 22,
    },
    meta: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 19,
    },
    preview: {
      color: palette.text,
      fontSize: 15,
      lineHeight: 21,
    },
    caption: {
      color: palette.muted,
      fontSize: 13,
      marginTop: 2,
    },
    eyebrow: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
    },
    badge: {
      alignItems: "center",
      backgroundColor: palette.accentSoft,
      borderCurve: "continuous",
      borderRadius: 10,
      justifyContent: "center",
      minHeight: 56,
      paddingVertical: 6,
      width: 52,
    },
    badgeDay: {
      color: palette.accent,
      fontSize: 22,
      fontVariant: ["tabular-nums"],
      fontWeight: "800",
      lineHeight: 26,
    },
    badgeMonth: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    mediaPill: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accentSoft,
      borderRadius: 999,
      flexDirection: "row",
      gap: 4,
      marginTop: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    mediaText: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: "700",
    },
  });
