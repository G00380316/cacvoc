import Entypo from "@expo/vector-icons/Entypo";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Button } from "@/components/ui/Form";
import type { AppPalette } from "@/constants/Design";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

type ChurchNoticeProps = {
  icon?: ComponentProps<typeof Entypo>["name"];
  title?: string;
  message: ReactNode;
  /** "danger" colours the message, for errors. */
  tone?: "default" | "danger";
  action?: {
    title: string;
    onPress: () => void;
    variant?: "primary" | "secondary";
  };
};

/** Centred message for empty, unavailable and error states, with an optional next step. */
export function ChurchNotice({ icon, title, message, tone = "default", action }: ChurchNoticeProps) {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const isError = tone === "danger";

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.notice}>
      {icon ? (
        <View style={styles.icon}>
          <Entypo name={icon} size={26} color={palette.accent} />
        </View>
      ) : null}
      {title ? (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      <Text selectable={isError} style={[styles.message, isError ? styles.danger : undefined]}>
        {message}
      </Text>
      {action ? (
        <Button
          title={action.title}
          variant={action.variant}
          onPress={action.onPress}
          style={styles.action}
        />
      ) : null}
    </Animated.View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    notice: {
      alignItems: "center",
      gap: 10,
      paddingTop: 24,
    },
    icon: {
      alignItems: "center",
      backgroundColor: palette.accentSoft,
      borderRadius: 30,
      height: 60,
      justifyContent: "center",
      marginBottom: 6,
      width: 60,
    },
    title: {
      color: palette.text,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 26,
      textAlign: "center",
    },
    message: {
      color: palette.muted,
      fontSize: 16,
      lineHeight: 23,
      maxWidth: 360,
      textAlign: "center",
    },
    danger: {
      color: palette.danger,
    },
    action: {
      alignSelf: "stretch",
      marginTop: 10,
    },
  });
