import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { Button, Card, TextField } from "@/components/ui/Form";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { PressableScale } from "@/components/ui/PressableScale";
import { apiRequest } from "@/constants/Api";
import type { AppPalette } from "@/constants/Design";
import { WEEKDAYS, type ServiceTime } from "@/constants/PostTypes";
import { useAuth } from "@/contexts/AuthContext";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

const MAX_SERVICES = 20;

type DraftService = ServiceTime & { key: string };

let nextKey = 0;
const withKey = (service: ServiceTime): DraftService => ({ ...service, key: `s${nextKey++}` });
const stripKeys = (services: DraftService[]): ServiceTime[] =>
  services.map(({ day, time, label }) => ({ day, time, label: label.trim() }));

/** Keeps row keys stable across a save (the server re-sorts) so rows don't re-animate. */
function reuseKeys(services: ServiceTime[], previous: DraftService[]): DraftService[] {
  const unused = [...previous];
  return services.map((service) => {
    const index = unused.findIndex(
      (old) =>
        old.day === service.day && old.time === service.time && old.label.trim() === service.label
    );
    return index >= 0 ? { ...service, key: unused.splice(index, 1)[0].key } : withKey(service);
  });
}

function timeToDate(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function dateToTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Lets an admin edit their church's weekly schedule. */
export function ServiceTimesEditor() {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const { token } = useAuth();
  const [saved, setSaved] = useState<ServiceTime[] | null>(null);
  const [draft, setDraft] = useState<DraftService[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const json = await apiRequest<{ serviceTimes: ServiceTime[] }>("/editor/service-times", {
        adminToken: token,
      });
      setSaved(json.serviceTimes);
      setDraft(json.serviceTimes.map(withKey));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load service times.");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key: string, patch: Partial<ServiceTime>) =>
    setDraft((current) =>
      current.map((service) => (service.key === key ? { ...service, ...patch } : service))
    );

  const remove = (key: string) =>
    setDraft((current) => current.filter((service) => service.key !== key));

  const add = () =>
    setDraft((current) => [...current, withKey({ day: 0, time: "10:00", label: "" })]);

  const dirty = saved !== null && JSON.stringify(stripKeys(draft)) !== JSON.stringify(saved);
  const incomplete = draft.some((service) => service.label.trim().length === 0);

  const save = async () => {
    setSaving(true);
    setError("");

    try {
      const json = await apiRequest<{ serviceTimes: ServiceTime[] }>("/editor/service-times", {
        method: "PUT",
        body: { serviceTimes: stripKeys(draft) },
        adminToken: token,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(json.serviceTimes);
      setDraft((current) => reuseKeys(json.serviceTimes, current));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Couldn't save service times.");
    } finally {
      setSaving(false);
    }
  };

  if (saved === null && !error) {
    return <Text style={styles.muted}>Loading service times…</Text>;
  }

  return (
    <Animated.View layout={LinearTransition.duration(220)} style={styles.stack}>
      {draft.length === 0 ? (
        <Text style={styles.muted}>
          Add your weekly services so members know when to come, e.g. Sunday Service or Bible Study.
        </Text>
      ) : null}

      {draft.map((service) => (
        <Animated.View
          key={service.key}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(150)}
          layout={LinearTransition.duration(220)}
        >
          <Card style={styles.serviceCard}>
            <View style={styles.labelRow}>
              <View style={styles.labelField}>
                <TextField
                  label="Service"
                  value={service.label}
                  onChangeText={(label) => update(service.key, { label })}
                  placeholder="Sunday Service"
                  autoCapitalize="words"
                  maxLength={60}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${service.label || "service"}`}
                hitSlop={10}
                onPress={() => remove(service.key)}
                style={styles.remove}
              >
                <Ionicons name="trash-outline" size={20} color={palette.danger} />
              </Pressable>
            </View>

            <DayPicker value={service.day} onChange={(day) => update(service.key, { day })} />

            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Starts at</Text>
              <DateTimeField
                mode="time"
                value={timeToDate(service.time)}
                onChange={(date) => update(service.key, { time: dateToTime(date) })}
              />
            </View>
          </Card>
        </Animated.View>
      ))}

      {error ? (
        <Animated.Text entering={FadeIn.duration(200)} selectable style={styles.error}>
          {error}
        </Animated.Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Add a service"
          variant="secondary"
          disabled={draft.length >= MAX_SERVICES}
          onPress={add}
          style={styles.action}
        />
        {dirty ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.action}
          >
            <Button
              title="Save changes"
              disabled={incomplete}
              loading={saving}
              onPress={save}
            />
          </Animated.View>
        ) : null}
      </View>
      {dirty && incomplete ? (
        <Text style={styles.muted}>Give every service a name before saving.</Text>
      ) : null}
    </Animated.View>
  );
}

function DayPicker({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.days}>
      {WEEKDAYS.map((name, index) => {
        const selected = index === value;
        return (
          <PressableScale
            key={name}
            accessibilityRole="radio"
            accessibilityLabel={name}
            accessibilityState={{ selected }}
            pressedScale={0.92}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(index);
            }}
            style={[styles.day, selected ? styles.daySelected : undefined]}
          >
            <Text style={[styles.dayText, selected ? styles.dayTextSelected : undefined]}>
              {name.slice(0, 2)}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    stack: {
      gap: 12,
    },
    serviceCard: {
      gap: 14,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 12,
    },
    labelField: {
      flex: 1,
    },
    remove: {
      paddingBottom: 14,
    },
    days: {
      flexDirection: "row",
      gap: 4,
    },
    day: {
      flex: 1,
      alignItems: "center",
      backgroundColor: palette.surfaceSoft,
      borderCurve: "continuous",
      borderRadius: 8,
      paddingVertical: 8,
    },
    daySelected: {
      backgroundColor: palette.accent,
    },
    dayText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "700",
    },
    dayTextSelected: {
      color: palette.onAccent,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    timeLabel: {
      color: palette.text,
      fontSize: 16,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
    },
    action: {
      flex: 1,
    },
    muted: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 21,
    },
    error: {
      color: palette.danger,
      fontSize: 15,
      lineHeight: 21,
    },
  });
