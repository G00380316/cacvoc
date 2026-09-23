import { StyleSheet } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { Typography, type AppPalette } from "@/constants/Design";
import { useThemedStyles } from "@/contexts/ThemeContext";
import { htmlToParagraphs } from "@/constants/Reader";
import { stripHtml } from "@/constants/Html";

type WordForTodayArticleProps = {
  title?: string;
  date?: string;
  verse?: string;
  reference?: string;
  text?: string;
  activeSpeechIndex?: number | null;
};

export function WordForTodayArticle({
  title,
  date,
  verse,
  reference,
  text,
  activeSpeechIndex,
}: WordForTodayArticleProps) {
  const styles = useThemedStyles(createStyles);
  const paragraphs = htmlToParagraphs(text);
  const hasActiveSpeech = typeof activeSpeechIndex === "number";

  return (
    <ThemedView style={styles.container}>
      {title ? (
        <Animated.Text
          selectable
          entering={FadeIn.duration(260)}
          layout={LinearTransition.duration(180)}
          style={[
            styles.title,
            activeSpeechIndex === 0 ? styles.activeText : undefined,
          ]}
        >
          {stripHtml(title)}
        </Animated.Text>
      ) : undefined}

      <ThemedView style={styles.scriptureBlock}>
        {date ? (
          <Animated.Text
            selectable
            layout={LinearTransition.duration(180)}
            style={[
              styles.date,
              activeSpeechIndex === 1 ? styles.activeText : undefined,
            ]}
          >
            {stripHtml(date)}
          </Animated.Text>
        ) : undefined}
        {verse ? (
          <Animated.Text
            selectable
            layout={LinearTransition.duration(180)}
            style={[
              styles.verse,
              activeSpeechIndex === 2 ? styles.activeText : undefined,
            ]}
          >
            {stripHtml(verse)}
          </Animated.Text>
        ) : undefined}
        {reference ? (
          <Animated.Text
            selectable
            layout={LinearTransition.duration(180)}
            style={[
              styles.reference,
              activeSpeechIndex === 3 ? styles.activeText : undefined,
            ]}
          >
            {stripHtml(reference)}
          </Animated.Text>
        ) : undefined}
      </ThemedView>

      <ThemedView style={styles.body}>
        {paragraphs.map((paragraph, index) => {
          const speechIndex = index + 4;

          return (
            <Animated.Text
              key={`${speechIndex}-${paragraph.slice(0, 24)}`}
              selectable
              layout={LinearTransition.duration(180)}
              style={[
                styles.paragraph,
                hasActiveSpeech && activeSpeechIndex === speechIndex
                  ? styles.activeParagraph
                  : undefined,
              ]}
            >
              {paragraph}
            </Animated.Text>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    container: {
      backgroundColor: "transparent",
      gap: 8,
    },
    title: {
      color: palette.text,
      fontFamily: Typography.reader,
      fontSize: 28,
      fontWeight: "700",
      lineHeight: 35,
      marginBottom: 10,
      marginTop: 8,
    },
    scriptureBlock: {
      backgroundColor: "transparent",
      gap: 5,
      marginBottom: 14,
      marginTop: 2,
    },
    date: {
      color: palette.muted,
      fontFamily: Typography.ui,
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 22,
    },
    verse: {
      color: palette.text,
      fontFamily: Typography.reader,
      fontSize: 20,
      fontStyle: "italic",
      lineHeight: 28,
    },
    reference: {
      color: palette.muted,
      fontFamily: Typography.ui,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 18,
    },
    body: {
      backgroundColor: "transparent",
      gap: 14,
      marginTop: 8,
    },
    paragraph: {
      color: palette.text,
      fontFamily: Typography.reader,
      fontSize: 19,
      lineHeight: 31,
    },
    activeText: {
      color: palette.accent,
      fontWeight: "800",
      transform: [{ scale: 1.025 }],
    },
    activeParagraph: {
      backgroundColor: palette.accentSoft,
      borderCurve: "continuous",
      borderRadius: 8,
      color: palette.text,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 32,
      paddingHorizontal: 10,
      paddingVertical: 8,
      transform: [{ scale: 1.018 }],
    },
  });
