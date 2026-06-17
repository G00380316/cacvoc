import { ReactNode, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  FadeInUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { Palette } from "@/constants/Design";

type AnimatedContentProps = {
  children: ReactNode;
  delay?: number;
};

export function AnimatedContent({ children, delay = 0 }: AnimatedContentProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(420).delay(delay)}
      layout={LinearTransition.duration(220)}
    >
      {children}
    </Animated.View>
  );
}

function SkeletonLine({
  width = "100%",
  height = 18,
}: {
  width?: number | `${number}%`;
  height?: number;
}) {
  const opacity = useSharedValue(0.62);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.28, { duration: 850 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.skeletonLine, { width, height }, animatedStyle]}
    />
  );
}

export function ArticleSkeleton() {
  return (
    <ThemedView style={styles.articleSkeleton}>
      <SkeletonLine width="82%" height={34} />
      <ThemedView style={styles.metaSkeleton}>
        <SkeletonLine width="34%" height={18} />
        <SkeletonLine width="88%" height={24} />
        <SkeletonLine width="42%" height={16} />
      </ThemedView>
      <SkeletonLine width="100%" />
      <SkeletonLine width="94%" />
      <SkeletonLine width="98%" />
      <SkeletonLine width="78%" />
      <SkeletonLine width="92%" />
      <SkeletonLine width="86%" />
    </ThemedView>
  );
}

export function SundayArticleSkeleton() {
  return (
    <ThemedView style={styles.articleSkeleton}>
      <SkeletonLine width="74%" height={34} />
      <SkeletonLine width="100%" />
      <SkeletonLine width="96%" />
      <SkeletonLine width="88%" />
      <SkeletonLine width="92%" />
      <SkeletonLine width="80%" />
      <SkeletonLine width="95%" />
    </ThemedView>
  );
}

export function ArchiveSkeleton() {
  return (
    <ThemedView style={styles.archiveSkeleton}>
      {Array.from({ length: 7 }).map((_, index) => (
        <ThemedView key={index} style={styles.archiveRow}>
          <SkeletonLine width="32%" height={13} />
          <SkeletonLine width={index % 2 === 0 ? "88%" : "72%"} height={20} />
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  skeletonLine: {
    backgroundColor: Palette.border,
    borderCurve: "continuous",
    borderRadius: 8,
  },
  articleSkeleton: {
    backgroundColor: "transparent",
    gap: 14,
  },
  metaSkeleton: {
    backgroundColor: "transparent",
    gap: 6,
    marginBottom: 12,
  },
  archiveSkeleton: {
    backgroundColor: "transparent",
    gap: 12,
  },
  archiveRow: {
    minHeight: 72,
    justifyContent: "center",
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
});
