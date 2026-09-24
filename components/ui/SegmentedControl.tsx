import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

import type { AppPalette } from "@/constants/Design";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

const TRACK_PADDING = 3;

type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

/** Segmented picker whose selection pill slides between options. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const styles = useThemedStyles(createStyles);
  const [trackWidth, setTrackWidth] = useState(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const position = useSharedValue(selectedIndex);

  useEffect(() => {
    position.value = withSpring(selectedIndex, { damping: 20, stiffness: 240 });
  }, [position, selectedIndex]);

  const segmentWidth =
    trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / options.length : 0;

  const pillStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: position.value * segmentWidth }],
  }));

  return (
    <View
      style={[styles.track, style]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      {segmentWidth > 0 ? <Animated.View style={[styles.pill, pillStyle]} /> : null}
      {options.map((option, index) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: index === selectedIndex }}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(option.value);
          }}
          style={styles.segment}
        >
          <SegmentLabel label={option.label} index={index} position={position} />
        </Pressable>
      ))}
    </View>
  );
}

function SegmentLabel({
  label,
  index,
  position,
}: {
  label: string;
  index: number;
  position: SharedValue<number>;
}) {
  const styles = useThemedStyles(createStyles);
  const { onAccent, text } = usePalette();

  // Fully "selected" colour when the pill sits under this label, fading as it slides away.
  const colorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      Math.min(Math.abs(position.value - index), 1),
      [0, 1],
      [onAccent, text]
    ),
  }));

  return <Animated.Text style={[styles.label, colorStyle]}>{label}</Animated.Text>;
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    track: {
      flexDirection: "row",
      backgroundColor: palette.surfaceSoft,
      borderCurve: "continuous",
      borderRadius: 10,
      padding: TRACK_PADDING,
    },
    pill: {
      position: "absolute",
      top: TRACK_PADDING,
      bottom: TRACK_PADDING,
      left: TRACK_PADDING,
      backgroundColor: palette.accent,
      borderCurve: "continuous",
      borderRadius: 8,
    },
    segment: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
    },
    label: {
      fontSize: 15,
      fontWeight: "600",
    },
  });
