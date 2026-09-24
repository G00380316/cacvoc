import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import type { AppPalette } from "@/constants/Design";
import { useThemedStyles } from "@/contexts/ThemeContext";

/** Placeholder for the church feed: service times, a couple of events and a post. */
export function ChurchFeedSkeleton() {
  const styles = useThemedStyles(createStyles);
  // One pulse drives every block so they breathe together.
  const pulse = useSharedValue(0.62);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.28, { duration: 850 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);

  return (
    <View accessible accessibilityLabel="Loading" style={styles.skeleton}>
      <View style={styles.section}>
        <SkeletonBlock pulse={pulse} width="32%" height={13} />
        <View style={styles.card}>
          {[0, 1].map((row) => (
            <View key={row} style={[styles.serviceRow, row > 0 ? styles.divider : undefined]}>
              <SkeletonBlock pulse={pulse} width={row === 0 ? "42%" : "34%"} height={16} />
              <SkeletonBlock pulse={pulse} width="30%" height={14} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SkeletonBlock pulse={pulse} width="40%" height={13} />
        {[0, 1].map((row) => (
          <View key={row} style={[styles.card, styles.padded, styles.eventCard]}>
            <SkeletonBlock pulse={pulse} width={52} height={56} radius={10} />
            <View style={styles.eventCopy}>
              <SkeletonBlock pulse={pulse} width={row === 0 ? "78%" : "64%"} height={18} />
              <SkeletonBlock pulse={pulse} width="56%" height={14} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <SkeletonBlock pulse={pulse} width="36%" height={13} />
        <View style={[styles.card, styles.padded, styles.postCard]}>
          <SkeletonBlock pulse={pulse} width="70%" height={18} />
          <SkeletonBlock pulse={pulse} width="100%" height={14} />
          <SkeletonBlock pulse={pulse} width="86%" height={14} />
        </View>
      </View>
    </View>
  );
}

function SkeletonBlock({
  pulse,
  width,
  height,
  radius = 8,
}: {
  pulse: SharedValue<number>;
  width: number | `${number}%`;
  height: number;
  radius?: number;
}) {
  const styles = useThemedStyles(createStyles);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={[styles.block, { width, height, borderRadius: radius }, pulseStyle]} />
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    skeleton: {
      gap: 28,
    },
    section: {
      gap: 10,
    },
    block: {
      backgroundColor: palette.border,
      borderCurve: "continuous",
    },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
    },
    padded: {
      padding: 16,
    },
    serviceRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 50,
      paddingHorizontal: 16,
    },
    divider: {
      borderTopColor: palette.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    eventCard: {
      alignItems: "center",
      flexDirection: "row",
      gap: 14,
    },
    eventCopy: {
      flex: 1,
      gap: 8,
    },
    postCard: {
      gap: 10,
    },
  });
