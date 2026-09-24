import { forwardRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { FocusInput } from "@/components/ui/FocusInput";
import { PressableScale } from "@/components/ui/PressableScale";
import type { AppPalette } from "@/constants/Design";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: ButtonProps) {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const inactive = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={[styles.button, styles[variant], inactive ? styles.disabled : undefined, style]}
    >
      {/* Keyed so the label or spinner fades in when loading toggles. */}
      <Animated.View key={loading ? "spinner" : "label"} entering={FadeIn.duration(160)}>
        {loading ? (
          <ActivityIndicator color={variant === "primary" ? palette.onAccent : palette.accent} />
        ) : (
          <Text style={[styles.buttonText, styles[`${variant}Text`]]}>{title}</Text>
        )}
      </Animated.View>
    </PressableScale>
  );
}

type TextFieldProps = TextInputProps & { label: string };

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, style, ...props },
  ref
) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <FocusInput ref={ref} style={style} {...props} />
    </View>
  );
});

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    button: {
      alignItems: "center",
      borderCurve: "continuous",
      borderRadius: 12,
      justifyContent: "center",
      minHeight: 50,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    primary: {
      backgroundColor: palette.accent,
    },
    secondary: {
      backgroundColor: palette.accentSoft,
    },
    danger: {
      backgroundColor: "transparent",
      borderColor: palette.danger,
      borderWidth: 1,
    },
    disabled: {
      opacity: 0.45,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
    },
    primaryText: {
      color: palette.onAccent,
    },
    secondaryText: {
      color: palette.accent,
    },
    dangerText: {
      color: palette.danger,
    },
    field: {
      gap: 6,
    },
    label: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "700",
    },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 12,
      padding: 18,
    },
  });
