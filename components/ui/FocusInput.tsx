import { forwardRef } from "react";
import { StyleSheet, TextInput, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { AppPalette } from "@/constants/Design";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

type FocusInputProps = TextInputProps & {
  /** Styles for the bordered box around the input. */
  containerStyle?: StyleProp<ViewStyle>;
};

/** Text input whose border eases to the accent colour while focused. */
export const FocusInput = forwardRef<TextInput, FocusInputProps>(function FocusInput(
  { containerStyle, style, onFocus, onBlur, ...props },
  ref
) {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const focus = useSharedValue(0);
  const { border, accent } = palette;

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [border, accent]),
  }));

  return (
    <Animated.View style={[styles.box, containerStyle, borderStyle]}>
      <TextInput
        ref={ref}
        placeholderTextColor={palette.muted}
        {...props}
        onFocus={(event) => {
          focus.value = withTiming(1, { duration: 180 });
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focus.value = withTiming(0, { duration: 180 });
          onBlur?.(event);
        }}
        style={[styles.input, style]}
      />
    </Animated.View>
  );
});

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    box: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 10,
      borderWidth: 1,
    },
    input: {
      color: palette.text,
      fontSize: 17,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
  });
