import { router } from "expo-router";
import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChurchFeedSkeleton } from "@/components/church/ChurchFeedSkeleton";
import { ChurchFeedView } from "@/components/church/ChurchFeedView";
import { ChurchHeader } from "@/components/church/ChurchHeader";
import { ChurchNotice } from "@/components/church/ChurchNotice";
import { useChurchFeed } from "@/components/church/useChurchFeed";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import type { AppPalette } from "@/constants/Design";
import { isRegisteredChurchId } from "@/constants/PostTypes";
import { useChurch } from "@/contexts/ChurchContext";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

const openChurchPicker = () => router.push("/welcome");

export default function MyChurchScreen() {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const bottom = useBottomTabOverflow();
  const { church } = useChurch();
  const churchId = church?.id;
  const registeredId = isRegisteredChurchId(churchId) ? churchId : null;
  const { state, refreshing, refresh, retry } = useChurchFeed(registeredId);

  let content: ReactNode;

  if (!church) {
    content = (
      <ChurchNotice
        icon="home"
        title="Find your church"
        message="Pick your local CAC church to see its service times, events, announcements and sermons."
        action={{ title: "Choose your church", onPress: openChurchPicker }}
      />
    );
  } else if (!registeredId) {
    content = (
      <ChurchNotice
        icon="location-pin"
        message={
          <>
            <Text style={styles.strong}>{church.name}</Text> hasn&apos;t joined Cacvoc yet, so
            there&apos;s no content from its leaders.
          </>
        }
        action={{
          title: "Choose a different church",
          onPress: openChurchPicker,
          variant: "secondary",
        }}
      />
    );
  } else if (state.status === "notFound") {
    content = (
      <ChurchNotice
        icon="home"
        title="This church is no longer available"
        message="It may have been removed from Cacvoc. Choose another church to see content from its leaders."
        action={{ title: "Choose another church", onPress: openChurchPicker }}
      />
    );
  } else {
    content = (
      <>
        {/* Keyed so switching churches fades the new name in; it stays put from loading to loaded. */}
        <ChurchHeader
          key={church.id}
          church={state.status === "ready" ? state.feed.church : church}
        />
        {state.status === "loading" ? <ChurchFeedSkeleton /> : null}
        {state.status === "error" ? (
          <ChurchNotice
            title="Couldn't load your church"
            message={state.message}
            tone="danger"
            action={{ title: "Try again", onPress: retry }}
          />
        ) : null}
        {state.status === "ready" ? (
          <ChurchFeedView feed={state.feed} refreshError={state.refreshError} />
        ) : null}
      </>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: bottom + 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        registeredId ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={palette.accent}
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
          />
        ) : undefined
      }
    >
      <ScreenHeader title="My Church" />
      <View style={styles.content}>{content}</View>
    </ScrollView>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      gap: 24,
      paddingHorizontal: 24,
      paddingTop: 4,
    },
    strong: {
      color: palette.text,
      fontWeight: "700",
    },
  });
