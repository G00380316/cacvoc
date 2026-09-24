import type { ComponentProps } from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, "style"> & {
  /** Static or animated styles. Pressed feedback is the scale, so no `({ pressed })` styles. */
  style?: ComponentProps<typeof Animated.View>["style"];
  /** Scale while held down; keep it close to 1 so the feedback stays subtle. */
  pressedScale?: number;
};

/** Pressable that eases down slightly while held and springs back on release. */
export function PressableScale({
  pressedScale = 0.97,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressedScale) * pressed.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        pressed.value = withTiming(1, { duration: 90 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(0, { damping: 16, stiffness: 320, mass: 0.7 });
        onPressOut?.(event);
      }}
      style={[style, scaleStyle]}
    />
  );
}
