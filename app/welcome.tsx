import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Form";
import { FocusInput } from "@/components/ui/FocusInput";
import { PressableScale } from "@/components/ui/PressableScale";
import { apiRequest } from "@/constants/Api";
import { formatChurchLocation, type Church } from "@/constants/ChurchTypes";
import type { AppPalette } from "@/constants/Design";
import { getCurrentCoordinates } from "@/constants/Location";
import { useChurch } from "@/contexts/ChurchContext";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

type Mode = "idle" | "loading" | "results";
type SuggestionState = "none" | "loading" | "done" | "unavailable";

export default function WelcomeScreen() {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { onboarded, church: savedChurch, chooseChurch } = useChurch();
  const [mode, setMode] = useState<Mode>("idle");
  const [churches, setChurches] = useState<Church[]>([]);
  const [suggestions, setSuggestions] = useState<Church[]>([]);
  const [suggestionState, setSuggestionState] = useState<SuggestionState>("none");
  const [selectedId, setSelectedId] = useState<string | null>(savedChurch?.id ?? null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const requestId = useRef(0);
  const canCancel = onboarded && router.canGoBack();

  const loadChurches = async (withLocation: boolean) => {
    const request = ++requestId.current;
    const isCurrent = () => request === requestId.current;
    setMode("loading");
    setMessage("");
    let coords = "";

    if (withLocation) {
      const location = await getCurrentCoordinates();

      if (location.status === "ok") {
        coords = `lat=${location.coords.latitude}&lng=${location.coords.longitude}`;
      } else {
        setMessage(
          location.status === "denied"
            ? "Location is off, so here are all registered churches instead."
            : "Couldn't find your location, so here are all registered churches instead."
        );
      }
    }

    if (coords) {
      // Map lookups can take a few seconds, so registered churches show first.
      setSuggestionState("loading");
      apiRequest<{ suggestions: Church[]; available: boolean }>(`/churches/suggestions?${coords}`)
        .then((json) => {
          if (isCurrent()) {
            setSuggestions(json.suggestions);
            setSuggestionState(json.available ? "done" : "unavailable");
          }
        })
        .catch(() => {
          if (isCurrent()) {
            setSuggestionState("unavailable");
          }
        });
    }

    try {
      const json = await apiRequest<{ churches: Church[] }>(
        coords ? `/churches?${coords}` : "/churches"
      );
      if (isCurrent()) {
        setChurches(json.churches);
        setMode("results");
      }
    } catch (error) {
      if (isCurrent()) {
        requestId.current += 1; // drop the map search that belongs to this failed attempt
        setMessage(error instanceof Error ? error.message : "Couldn't load churches.");
        setSuggestionState("none");
        setMode("idle");
      }
    }
  };

  const matches = (church: Church) => {
    const needle = query.trim().toLowerCase();
    return (
      !needle ||
      `${church.name} ${formatChurchLocation(church)}`.toLowerCase().includes(needle)
    );
  };
  const filteredChurches = churches.filter(matches);
  const filteredSuggestions = suggestions.filter(matches);

  const nearestId = useMemo(() => {
    const withDistance = [...churches, ...suggestions].filter(
      (church) => typeof church.distanceKm === "number"
    );
    withDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return withDistance[0]?.id ?? null;
  }, [churches, suggestions]);

  const selected =
    [...churches, ...suggestions].find((church) => church.id === selectedId) ?? null;

  const toggle = (church: Church) => {
    Haptics.selectionAsync();
    setSelectedId((current) => (current === church.id ? null : church.id));
  };

  const finish = (church: Church | null) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    chooseChurch(church);
    if (onboarded && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const nothingFound =
    churches.length === 0 && suggestions.length === 0 && suggestionState !== "loading";
  const hasAnything = churches.length > 0 || suggestions.length > 0;
  const noMatches =
    hasAnything &&
    query.trim().length > 0 &&
    filteredChurches.length === 0 &&
    filteredSuggestions.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      {canCancel ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}
          style={[styles.cancel, { top: insets.top + 12 }]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      ) : null}
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
          <Animated.View
            entering={FadeInUp.duration(400).delay(150)}
            exiting={FadeOut.duration(150)}
            style={styles.actions}
          >
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

        {message ? (
          <Animated.Text entering={FadeIn.duration(250)} style={styles.message}>
            {message}
          </Animated.Text>
        ) : null}

        {mode === "results" ? (
          <Animated.View entering={FadeInUp.duration(350)} style={styles.results}>
            {hasAnything ? (
              <FocusInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or city"
                autoCorrect={false}
                clearButtonMode="while-editing"
                containerStyle={styles.search}
              />
            ) : null}

            {filteredChurches.length > 0 && suggestionState !== "none" ? (
              <Text style={styles.sectionLabel}>Registered churches</Text>
            ) : null}
            {filteredChurches.map((church, index) => (
              <ChurchRow
                key={church.id}
                church={church}
                index={index}
                selected={church.id === selectedId}
                nearest={church.id === nearestId && !query}
                onPress={() => toggle(church)}
              />
            ))}

            {suggestionState === "loading" ? (
              <Animated.View
                entering={FadeIn.duration(250)}
                exiting={FadeOut.duration(150)}
                style={styles.searching}
              >
                <ActivityIndicator color={palette.accent} />
                <Text style={styles.searchingText}>Searching the map for CAC churches…</Text>
              </Animated.View>
            ) : null}

            {filteredSuggestions.length > 0 ? (
              <Animated.View entering={FadeIn.duration(250)} style={styles.suggestionHeader}>
                <Text style={styles.sectionLabel}>On the map</Text>
                <Text style={styles.sectionHint}>
                  Not registered yet, so there&apos;s no content from their leaders.
                </Text>
              </Animated.View>
            ) : null}
            {filteredSuggestions.map((church, index) => (
              <ChurchRow
                key={church.id}
                church={church}
                index={index}
                selected={church.id === selectedId}
                nearest={church.id === nearestId && !query}
                onPress={() => toggle(church)}
              />
            ))}
            {suggestions.length > 0 ? (
              <Text style={styles.attribution}>Map data © OpenStreetMap contributors</Text>
            ) : null}

            {suggestionState === "unavailable" ? (
              <Text style={styles.message}>Map search isn&apos;t available right now.</Text>
            ) : null}
            {nothingFound ? (
              <Animated.Text entering={FadeIn.duration(250)} style={styles.message}>
                {suggestionState === "done"
                  ? "No CAC churches found near you yet. Continue for now and choose one later in Settings."
                  : "No churches have registered yet. Continue for now and choose one later in Settings."}
              </Animated.Text>
            ) : null}
            {noMatches ? (
              <Text style={styles.message}>No churches match “{query.trim()}”.</Text>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>

      <Animated.View
        layout={LinearTransition.duration(220)}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        {selected ? (
          <Animated.View
            key={selected.id}
            entering={FadeInUp.duration(250)}
            exiting={FadeOut.duration(120)}
          >
            <Button title={`Continue with ${selected.name}`} onPress={() => finish(selected)} />
          </Animated.View>
        ) : null}
        <Animated.View layout={LinearTransition.duration(220)}>
          <Button
            title={selected ? "Continue without a church" : "Continue"}
            variant={selected ? "secondary" : "primary"}
            onPress={() => finish(null)}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function ChurchRow({
  church,
  index,
  selected,
  nearest,
  onPress,
}: {
  church: Church;
  index: number;
  selected: boolean;
  nearest: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { surface, accentSoft, border, accent } = usePalette();
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, { duration: 180 });
  }, [selected, selection]);

  const selectionStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selection.value, [0, 1], [surface, accentSoft]),
    borderColor: interpolateColor(selection.value, [0, 1], [border, accent]),
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(300).delay(Math.min(index * 45, 270))}
      layout={LinearTransition.duration(200)}
    >
      <PressableScale
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        pressedScale={0.98}
        onPress={onPress}
        style={[styles.churchRow, selectionStyle]}
      >
        <View style={styles.churchCopy}>
          {nearest ? <Text style={styles.nearest}>Nearest to you</Text> : null}
          <Text style={styles.churchName}>{church.name}</Text>
          {formatChurchLocation(church) ? (
            <Text style={styles.churchDetail}>{formatChurchLocation(church)}</Text>
          ) : null}
        </View>
        {typeof church.distanceKm === "number" ? (
          <Text style={styles.distance}>{formatDistance(church.distanceKm)}</Text>
        ) : null}
      </PressableScale>
    </Animated.View>
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
    cancel: {
      position: "absolute",
      left: 20,
      zIndex: 2,
    },
    cancelText: {
      color: palette.accent,
      fontSize: 17,
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
      marginBottom: 4,
    },
    sectionLabel: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      marginTop: 6,
    },
    suggestionHeader: {
      gap: 2,
    },
    sectionHint: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    searching: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 14,
    },
    searchingText: {
      color: palette.muted,
      fontSize: 15,
    },
    attribution: {
      color: palette.muted,
      fontSize: 12,
      textAlign: "right",
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
