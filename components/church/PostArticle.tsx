import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Alert, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

import { postMetaLines, readerText, toWebUrl } from "@/components/church/postDisplay";
import { Button } from "@/components/ui/Form";
import { Typography, type AppPalette } from "@/constants/Design";
import type { Post } from "@/constants/PostTypes";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

type PostArticleProps = {
  post: Post;
  churchName: string;
};

/** A post laid out for reading: optional hero image, heading, per-type details and the body. */
export function PostArticle({ post, churchName }: PostArticleProps) {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const meta = postMetaLines(post);
  const body = readerText(post.body);
  const mediaUrl = post.type === "sermon" ? post.mediaUrl : null;

  const openMedia = async () => {
    if (!mediaUrl) {
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(toWebUrl(mediaUrl), { controlsColor: palette.accent });
    } catch {
      Alert.alert("Couldn't open the recording", "The link may be broken. Please try again later.");
    }
  };

  return (
    <View>
      {post.imageUrl ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <Image
            // Signed URLs change on every fetch, so cache by the stored object key instead.
            source={{ uri: post.imageUrl, cacheKey: post.imageKey ?? undefined }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        </Animated.View>
      ) : null}

      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(320)} style={styles.heading}>
          <Text style={styles.eyebrow} numberOfLines={1}>
            {churchName}
          </Text>
          <Text selectable style={styles.title}>
            {post.title}
          </Text>
          {meta.map((line, index) => (
            <Text key={index} style={styles.meta}>
              {line}
            </Text>
          ))}
        </Animated.View>

        {mediaUrl ? (
          <Animated.View entering={FadeInUp.duration(320).delay(60)}>
            <Button title="Watch or listen" onPress={openMedia} />
          </Animated.View>
        ) : null}

        {body ? (
          <Animated.View entering={FadeInUp.duration(320).delay(mediaUrl ? 120 : 60)}>
            <Text selectable style={styles.body}>
              {body}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    image: {
      aspectRatio: 16 / 9,
      backgroundColor: palette.surfaceSoft,
      width: "100%",
    },
    content: {
      gap: 22,
      paddingHorizontal: 24,
      paddingTop: 22,
    },
    heading: {
      gap: 6,
    },
    eyebrow: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    title: {
      color: palette.text,
      fontFamily: Typography.reader,
      fontSize: 28,
      fontWeight: "700",
      lineHeight: 35,
      marginBottom: 2,
    },
    meta: {
      color: palette.muted,
      fontSize: 15,
      fontWeight: "600",
      lineHeight: 21,
    },
    body: {
      color: palette.text,
      fontFamily: Typography.reader,
      fontSize: 19,
      lineHeight: 30,
    },
  });
