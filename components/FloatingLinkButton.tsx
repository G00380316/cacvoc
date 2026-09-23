import Entypo from "@expo/vector-icons/Entypo";
import * as Haptics from "expo-haptics";
import { router, type Href } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { floatingButtonBottom, useFloatingButtonStyles } from "@/components/FloatingButtonChrome";
import { usePalette } from "@/contexts/ThemeContext";
import { useIdleFade } from "@/hooks/useIdleFade";

type FloatingLinkButtonProps = {
  href: Href;
  icon: ComponentProps<typeof Entypo>["name"];
  accessibilityLabel: string;
  bottomOffset: number;
  activityKey?: number;
};

/** Floating shortcut that sits just above the reader (play) button. */
export function FloatingLinkButton({
  href,
  icon,
  accessibilityLabel,
  bottomOffset,
  activityKey,
}: FloatingLinkButtonProps) {
  const styles = useFloatingButtonStyles();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { opacity, wake } = useIdleFade(activityKey, 0.34);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.container, { bottom: floatingButtonBottom(bottomOffset, insets.bottom, 1) }]}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => {
            Haptics.selectionAsync();
            wake();
            router.push(href);
          }}
          style={({ pressed }) => [styles.button, pressed ? styles.pressed : undefined]}
        >
          <View pointerEvents="none" style={styles.fill} />
          <Entypo name={icon} size={24} color={palette.onAccent} style={styles.icon} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
