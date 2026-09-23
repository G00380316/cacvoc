import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Form";
import { apiRequest } from "@/constants/Api";
import { formatChurchLocation, type Church } from "@/constants/ChurchTypes";
import type { AppPalette } from "@/constants/Design";
import { getCurrentCoordinates } from "@/constants/Location";
import { useChurch } from "@/contexts/ChurchContext";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

type Mode = "idle" | "loading" | "results";

export default function WelcomeScreen() {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { onboarded, church: savedChurch, chooseChurch } = useChurch();
  const [mode, setMode] = useState<Mode>("idle");
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(savedChurch?.id ?? null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [usedLocation, setUsedLocation] = useState(false);

  const loadChurches = async (withLocation: boolean) => {
    setMode("loading");
    setMessage("");
    let path = "/churches";

    if (withLocation) {
      const location = await getCurrentCoordinates();

      if (location.status === "ok") {
        path = `/churches?lat=${location.coords.latitude}&lng=${location.coords.longitude}`;
      } else {
        setMessage(
          location.status === "denied"
            ? "Location is off, so here are all churches instead."
            : "Couldn't find your location, so here are all churches instead."
        );
      }
      setUsedLocation(location.status === "ok");
    }

    try {
      const json = await apiRequest<{ churches: Church[] }>(path);
      setChurches(json.churches);
      setMode("results");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't load churches.");
      setMode("idle");
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return churches;
    }
    return churches.filter((church) =>
      `${church.name} ${formatChurchLocation(church)}`.toLowerCase().includes(needle)
    );
  }, [churches, query]);

  const selected = churches.find((church) => church.id === selectedId) ?? null;

  const finish = (church: Church | null) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    chooseChurch(church);
    if (onboarded && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
          <Image
            source={require("../assets/images/CacGalwaylogo.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.eyebrow}>Christ Apostolic Church</Text>
          <Text style={styles.title}>Find your church</Text>
          <Text style={styles.subtitle}>
            Choose your local CAC assembly to see content from its leaders. This is optional —
            you can continue without one and choose later in Settings.
          </Text>
        </Animated.View>

        {mode !== "results" ? (
          <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.actions}>
            <Button
              title="Find churches near me"
              loading={mode === "loading"}
              onPress={() => loadChurches(true)}
            />
            <Button
              title="Browse all churches"
              variant="secondary"
              disabled={mode === "loading"}
              onPress={() => loadChurches(false)}
            />
          </Animated.View>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {mode === "results" ? (
          <Animated.View entering={FadeInUp.duration(350)} style={styles.results}>
            {churches.length > 0 ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or city"
                placeholderTextColor={palette.muted}
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={styles.search}
              />
            ) : (
              <Text style={styles.message}>
                No churches have registered yet. Continue for now and choose one later in
                Settings.
              </Text>
            )}

            {filtered.map((church, index) => {
              const isSelected = church.id === selectedId;
              return (
                <Pressable
                  key={church.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedId(isSelected ? null : church.id);
                  }}
                  style={({ pressed }) => [
                    styles.churchRow,
                    isSelected ? styles.churchRowSelected : undefined,
                    pressed ? styles.pressed : undefined,
                  ]}
                >
                  <View style={styles.churchCopy}>
                    {usedLocation && index === 0 && !query ? (
                      <Text style={styles.nearest}>Nearest to you</Text>
                    ) : null}
                    <Text style={styles.churchName}>{church.name}</Text>
                    <Text style={styles.churchDetail}>{formatChurchLocation(church)}</Text>
                  </View>
                  {typeof church.distanceKm === "number" ? (
                    <Text style={styles.distance}>{formatDistance(church.distanceKm)}</Text>
                  ) : null}
                </Pressable>
              );
            })}

            {churches.length > 0 && filtered.length === 0 ? (
              <Text style={styles.message}>No churches match “{query.trim()}”.</Text>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {selected ? (
          <Button title={`Continue with ${selected.name}`} onPress={() => finish(selected)} />
        ) : null}
        <Button
          title={selected ? "Continue without a church" : "Continue"}
          variant={selected ? "secondary" : "primary"}
          onPress={() => finish(null)}
        />
      </View>
    </View>
  );
}

function formatDistance(km: number) {
  return km < 1 ? "< 1 km" : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: 24,
      gap: 24,
    },
    hero: {
      alignItems: "center",
      gap: 8,
      paddingTop: 24,
    },
    logo: {
      width: 104,
      height: 104,
      marginBottom: 8,
    },
    eyebrow: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    title: {
      color: palette.text,
      fontSize: 32,
      fontWeight: "800",
      textAlign: "center",
    },
    subtitle: {
      color: palette.muted,
      fontSize: 16,
      lineHeight: 23,
      textAlign: "center",
      maxWidth: 360,
    },
    actions: {
      gap: 12,
    },
    message: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 21,
      textAlign: "center",
    },
    results: {
      gap: 10,
    },
    search: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 10,
      borderWidth: 1,
      color: palette.text,
      fontSize: 17,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 4,
    },
    churchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
    },
    churchRowSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
    },
    pressed: {
      opacity: 0.7,
    },
    churchCopy: {
      flex: 1,
      gap: 3,
    },
    nearest: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    churchName: {
      color: palette.text,
      fontSize: 17,
      fontWeight: "700",
    },
    churchDetail: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 19,
    },
    distance: {
      color: palette.muted,
      fontSize: 14,
      fontVariant: ["tabular-nums"],
    },
    footer: {
      gap: 10,
      paddingHorizontal: 24,
      paddingTop: 12,
      borderTopColor: palette.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: palette.background,
    },
  });
