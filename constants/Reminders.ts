import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export type ReminderId = "bible" | "prayer" | "wft";

export type ReminderSetting = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type ReminderSettings = {
  /** Master switch from the Notifications toggle. */
  enabled: boolean;
  reminders: Record<ReminderId, ReminderSetting>;
};

export const REMINDERS: {
  id: ReminderId;
  label: string;
  title: string;
  body: string;
  /** Route opened when the notification is tapped. */
  url?: string;
}[] = [
  {
    id: "bible",
    label: "Read the Bible",
    title: "Time for your Bible reading",
    body: "Take a few minutes with God's Word today.",
  },
  {
    id: "prayer",
    label: "Pray",
    title: "Time to pray",
    body: "Pause and spend some time in prayer.",
  },
  {
    id: "wft",
    label: "Read Word for Today",
    title: "Word for Today",
    body: "Today's devotional is ready to read.",
    url: "/",
  },
];

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  reminders: {
    bible: { enabled: true, hour: 6, minute: 30 },
    prayer: { enabled: true, hour: 21, minute: 0 },
    wft: { enabled: true, hour: 7, minute: 0 },
  },
};

const STORAGE_KEY = "settings.reminders";
const identifierFor = (id: ReminderId) => `reminder-${id}`;

export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return DEFAULT_REMINDER_SETTINGS;
    }

    const parsed = JSON.parse(saved) as Partial<ReminderSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      reminders: { ...DEFAULT_REMINDER_SETTINGS.reminders, ...parsed.reminders },
    };
  } catch (error) {
    console.warn(error);
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Asks for notification permission if needed. Returns whether it's granted. */
export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Replaces the scheduled daily reminders to match `settings`. */
export async function applyReminderSchedule(settings: ReminderSettings) {
  await Promise.all(
    REMINDERS.map((reminder) =>
      Notifications.cancelScheduledNotificationAsync(identifierFor(reminder.id)).catch(
        () => undefined
      )
    )
  );

  if (!settings.enabled) {
    return;
  }

  for (const reminder of REMINDERS) {
    const setting = settings.reminders[reminder.id];

    if (!setting.enabled) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: identifierFor(reminder.id),
      content: {
        title: reminder.title,
        body: reminder.body,
        data: reminder.url ? { url: reminder.url } : {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: setting.hour,
        minute: setting.minute,
      },
    });
  }
}

export function formatReminderTime(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
