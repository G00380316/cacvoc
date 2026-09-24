import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Pressable, StyleSheet, Text } from "react-native";

import type { AppPalette } from "@/constants/Design";
import { useAppTheme, useThemedStyles } from "@/contexts/ThemeContext";

type DateTimeFieldProps = {
  value: Date;
  mode: "date" | "time" | "datetime";
  onChange: (value: Date) => void;
  disabled?: boolean;
  minimumDate?: Date;
};

/** Native compact picker on iOS; a tappable value that opens the system dialogs on Android. */
export function DateTimeField({ value, mode, onChange, disabled, minimumDate }: DateTimeFieldProps) {
  const styles = useThemedStyles(createStyles);
  const { scheme } = useAppTheme();

  if (process.env.EXPO_OS === "ios") {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="compact"
        disabled={disabled}
        minimumDate={minimumDate}
        themeVariant={scheme}
        onChange={(event: DateTimePickerEvent, date?: Date) => {
          if (event.type === "set" && date) {
            onChange(date);
          }
        }}
      />
    );
  }

  const openTime = (base: Date) =>
    DateTimePickerAndroid.open({
      value: base,
      mode: "time",
      onChange: (event, date) => {
        if (event.type === "set" && date) {
          onChange(date);
        }
      },
    });

  const open = () => {
    if (mode === "time") {
      openTime(value);
      return;
    }

    DateTimePickerAndroid.open({
      value,
      mode: "date",
      minimumDate,
      onChange: (event, date) => {
        if (event.type !== "set" || !date) {
          return;
        }
        if (mode === "date") {
          onChange(date);
          return;
        }
        // Android has no combined dialog, so ask for the time next.
        const withTime = new Date(date);
        withTime.setHours(value.getHours(), value.getMinutes(), 0, 0);
        openTime(withTime);
      },
    });
  };

  const dateText = value.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  const timeText = value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const label = mode === "date" ? dateText : mode === "time" ? timeText : `${dateText}, ${timeText}`;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={open}
      style={[styles.button, disabled ? styles.disabled : undefined]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    button: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceSoft,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    disabled: {
      opacity: 0.45,
    },
    text: {
      color: palette.text,
      fontSize: 16,
      fontVariant: ["tabular-nums"],
    },
  });
