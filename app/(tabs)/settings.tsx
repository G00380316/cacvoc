import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import type { AppPalette } from "@/constants/Design";
import { formatChurchLocation } from "@/constants/ChurchTypes";
import {
  applyReminderSchedule,
  DEFAULT_REMINDER_SETTINGS,
  ensureNotificationPermission,
  loadReminderSettings,
  REMINDERS,
  saveReminderSettings,
  type ReminderId,
  type ReminderSettings,
} from "@/constants/Reminders";
import { useAuth } from "@/contexts/AuthContext";
import { useChurch } from "@/contexts/ChurchContext";
import {
  useAppTheme,
  useThemedStyles,
  type ThemePreference,
} from "@/contexts/ThemeContext";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const styles = useThemedStyles(createStyles);
  const { preference, setPreference, palette } = useAppTheme();
  const { admin, signOut } = useAuth();
  const { church } = useChurch();
  const insets = useSafeAreaInsets();
  const bottom = useBottomTabOverflow();
  const [reminders, setReminders] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    loadReminderSettings().then(setReminders);
  }, []);

  // Persist and reschedule in order so quick toggles can't race each other.
  const updateReminders = useCallback((next: ReminderSettings) => {
    setReminders(next);
    saveQueue.current = saveQueue.current
      .then(() => saveReminderSettings(next))
      .then(() => applyReminderSchedule(next))
      .catch(console.warn);
  }, []);

  const toggleNotifications = useCallback(
    async (enabled: boolean) => {
      let permitted = true;

      if (enabled) {
        try {
          permitted = await ensureNotificationPermission();
        } catch (error) {
          console.warn(error);
          Alert.alert("Couldn't turn on reminders", "Please try again.");
          return;
        }
      }

      if (!permitted) {
        Alert.alert(
          "Notifications are off",
          "Allow notifications for Cacvoc in Settings to get reminders.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      updateReminders({ ...reminders, enabled });
    },
    [reminders, updateReminders]
  );

  const updateReminder = useCallback(
    (id: ReminderId, patch: Partial<ReminderSettings["reminders"][ReminderId]>) => {
      updateReminders({
        ...reminders,
        reminders: { ...reminders.reminders, [id]: { ...reminders.reminders[id], ...patch } },
      });
    },
    [reminders, updateReminders]
  );

  const confirmSignOut = useCallback(() => {
    Alert.alert("Sign out?", "The Editor tab will be hidden until you sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }, [signOut]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Settings" />
      <View style={styles.content}>
        <Section title="General">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Appearance</Text>
          </View>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={preference}
            onChange={setPreference}
            style={styles.segmented}
          />
        </Section>

        <Section
          title="Notifications"
          footer="Daily reminders arrive at the times you choose."
        >
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Reminders</Text>
            <Switch
              value={reminders.enabled}
              onValueChange={toggleNotifications}
              trackColor={{ true: palette.accent }}
            />
          </View>
          {reminders.enabled
            ? REMINDERS.map((reminder) => {
                const setting = reminders.reminders[reminder.id];
                return (
                  <Animated.View
                    key={reminder.id}
                    entering={FadeIn.duration(220)}
                    exiting={FadeOut.duration(150)}
                    layout={LinearTransition.duration(220)}
                    style={[styles.row, styles.rowDivider]}
                  >
                    <Switch
                      value={setting.enabled}
                      onValueChange={(enabled) => updateReminder(reminder.id, { enabled })}
                      trackColor={{ true: palette.accent }}
                    />
                    <Text
                      style={[
                        styles.rowLabel,
                        styles.reminderLabel,
                        setting.enabled ? undefined : styles.rowLabelDisabled,
                      ]}
                    >
                      {reminder.label}
                    </Text>
                    <ReminderTimePicker
                      hour={setting.hour}
                      minute={setting.minute}
                      disabled={!setting.enabled}
                      onChange={(hour, minute) => updateReminder(reminder.id, { hour, minute })}
                    />
                  </Animated.View>
                );
              })
            : null}
        </Section>

        <Section
          title="My church"
          footer="Churches show content from their own admins."
        >
          <Pressable
            onPress={() => router.push("/welcome")}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : undefined]}
          >
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>{church?.name ?? "No church selected"}</Text>
              {church ? (
                <Text style={styles.rowDetail}>{formatChurchLocation(church)}</Text>
              ) : null}
            </View>
            <Text style={styles.link}>{church ? "Change" : "Choose"}</Text>
          </Pressable>
        </Section>

        <Section title="Admin">
          {admin ? (
            <>
              <View style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>Signed in as {admin.username}</Text>
                  <Text style={styles.rowDetail}>
                    {admin.role === "developer" ? "Developer" : "Church admin"}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={confirmSignOut}
                style={({ pressed }) => [
                  styles.row,
                  styles.rowDivider,
                  pressed ? styles.pressed : undefined,
                ]}
              >
                <Text style={[styles.rowLabel, styles.danger]}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => router.push("/sign-in")}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : undefined]}
            >
              <Text style={[styles.rowLabel, styles.link]}>Admin sign in</Text>
            </Pressable>
          )}
        </Section>
      </View>
    </ScrollView>
  );
}

function Section({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    // Layout transitions let cards resize, and later sections shift, smoothly.
    <Animated.View layout={LinearTransition.duration(220)} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Animated.View layout={LinearTransition.duration(220)} style={styles.card}>
        {children}
      </Animated.View>
      {footer ? (
        <Animated.Text layout={LinearTransition.duration(220)} style={styles.sectionFooter}>
          {footer}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

function ReminderTimePicker({
  hour,
  minute,
  disabled,
  onChange,
}: {
  hour: number;
  minute: number;
  disabled: boolean;
  onChange: (hour: number, minute: number) => void;
}) {
  const value = new Date();
  value.setHours(hour, minute, 0, 0);

  return (
    <DateTimeField
      mode="time"
      value={value}
      disabled={disabled}
      onChange={(date) => onChange(date.getHours(), date.getMinutes())}
    />
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 8,
      gap: 26,
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      paddingHorizontal: 4,
    },
    sectionFooter: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: "hidden",
    },
    row: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    rowDivider: {
      borderTopColor: palette.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    rowCopy: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      color: palette.text,
      fontSize: 17,
    },
    reminderLabel: {
      flex: 1,
    },
    rowLabelDisabled: {
      opacity: 0.45,
    },
    rowDetail: {
      color: palette.muted,
      fontSize: 14,
    },
    link: {
      color: palette.accent,
      fontSize: 17,
      fontWeight: "600",
    },
    danger: {
      color: palette.danger,
    },
    pressed: {
      opacity: 0.6,
    },
    segmented: {
      marginHorizontal: 16,
      marginBottom: 14,
    },
  });
